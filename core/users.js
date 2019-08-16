//MySQL and BN libs.
var mysql = require("promise-mysql");
var BN = require("bignumber.js");
BN.config({
    ROUNDING_MODE: BN.ROUND_DOWN,
    EXPONENTIAL_AT: process.settings.coin.decimals + 1
});

//Definition of the table: `name VARCHAR(64), address VARCHAR(64), balance VARCHAR(64), notify tinyint(1)`.

//MySQL connection and table vars.
var connection, table;

//RAM cache of users.
var users;
var admins;

//Array of every handled TX hash.
var handled;

//Checks an amount for validity.
async function checkAmount(amount) {
    //If the amount is invalid...
    if (amount.isNaN()) {
        return false;
    }

    //If the amount is less than or equal to 0...
    if (amount.lte(0)) {
        return false;
    }

    //Else, return true.
    return true;
}

//Creates a new user.
async function create(user) {
    //If the user already exists, return.
    if (users[user]) {
        return false;
    }

    //Create the new user, with a blank address, balance of 0, and the notify flag on.
    await connection.query("INSERT INTO " + table + " VALUES(?, ?, ?, ?)", [user, "", "0", 1]);
    //Create the new user in the RAM cache, with a status of no address, balance of 0, and the notify flag on.
    users[user] = {
        address: false,
        balance: BN(0),
        notify: true
    };

    //Return true on success.
    return true;
}

//Sets an user's address.
async function setAddress(user, address) {
    //If they already have an addrwss, return.
    if (typeof(users[user].address) === "string") {
        return "invalid";
    }

    //Update the table with the address.
    await connection.query("UPDATE " + table + " SET address = ? WHERE name = ?", [address, user]);
    //Update the RAM cache.
    users[user].address = address;
    return address;
}

//Adds to an user's balance.
async function addBalance(user, amount) {
    //Return false if the amount is invalid.
    if (!(await checkAmount(amount))) {
        return false;
    }

    //Add the amount to the balance.
    var balance = users[user].balance.plus(amount);
    //Convert the balance to the coin's smallest unit.
    balance = balance.toFixed(process.settings.coin.decimals);
    //Update the table with the new balance, as a string.
    await connection.query("UPDATE " + table + " SET balance = ? WHERE name = ?", [balance, user]);
    //Update the RAM cache with a BN.
    users[user].balance = BN(balance);

    return true;
}

//Return the balance for all users
async function getAllBalance() {
    table = process.settings.mysql.tips;
    rows = await connection.query("SELECT sum(balance) FROM " + table);

    return BN(rows[0]);
}

//Subtracts from an user's balance.
async function subtractBalance(user, amount) {
    //Return false if the amount is invalid.
    if (!(await checkAmount(amount))) {
        return false;
    }

    //Subtracts the amount from the balance.
    var balance = users[user].balance.minus(amount);
    //Return false if the user doesn't have enough funds to support subtracting the amount.
    if (balance.lt(0)) {
        return false;
    }

    //Convert the balance to the coin's smallest unit.
    balance = balance.toFixed(process.settings.coin.decimals);
    //Update the table with the new balance, as a string.
    await connection.query("UPDATE " + table + " SET balance = ? WHERE name = ?", [balance, user]);
    //Update the RAM cache with a BN.
    users[user].balance = BN(balance);

    return true;
}

//Updates the notify flag.
async function setNotified(user) {
    //Update the table with a turned off notify flag.
    await connection.query("UPDATE " + table + " SET notify = ? WHERE name = ?", [0, user]);
    //Update the RAM cache.
    users[user].notify = false;
}

//Returns if the user is admin or not.
async function isAdmin(user) {
    if (admins[user].active === 1) return true;
    return false;
}

//Returns an user's address.
async function getAddress(user) {
    return users[user].address;
}

//Returns an user's balance
async function getBalance(user) {
    return users[user].balance;
}

//Returns an user's notify flag.
async function getNotify(user) {
    return users[user].notify;
}

module.exports = async () => {
    //Connects to MySQL.
    connection = await mysql.createConnection({
        host: "localhost",
        database: process.settings.mysql.db,
        user: process.settings.mysql.user,
        password: process.settings.mysql.pass
    });
    //Set the table from the settings.
    table = process.settings.mysql.tips;
    adminTbl = process.settings.mysql.admins;

    //Init the RAM cache.
    users = {};
    admins = {};
    //Init the handled array.
    handled = [];
    //Gets every row in the tips table.
    var rows = await connection.query("SELECT * FROM " + table);
    //Iterate over each row, creating an user object for each.
    var i;
    for (i in rows) {
        users[rows[i].name] = {
            //If the address is an empty string, set the value to false.
            //This is because we test if the address is a string to see if it's already set.
            address: (rows[i].address !== "" ? rows[i].address : false),
            //Set the balance as a BN.
            balance: BN(rows[i].balance),
            //Set the notify flag based on if the DB has a value of 0 or 1 (> 0 for safety).
            notify: (rows[i].notify > 0)
        };

        //Get this user's existing TXs.
        var txs = await process.core.coin.getTransactions(users[rows[i].name].address);
        //Iterate over each, and push their hashes so we don't process them again.
        var x;
        for (x in txs) {
            handled.push(txs[x].txid);
        }
    }

    //Set admin list.
    rows = await connection.query("SELECT * FROM " + adminTbl);
    console.log("admin table return: " + JSON.stringify(rows, null, 4))
    for (i in rows) {
        console.log("processing admin: " + rows[i].admin_id);
        admins[rows[i].admin_id] = {active: rows[i].active};
    }

    //Make sure all the pools have accounts.
    for (i in process.settings.pools) {
        //Create an account for each. If they don't have one, this will do nothing.
        await create(i);
    }

    //Return all the functions.
    return {
        create: create,

        setAddress: setAddress,
        addBalance: addBalance,
        subtractBalance: subtractBalance,
        setNotified: setNotified,

        getAddress: getAddress,
        getBalance: getBalance,
        getAllBalance: getAllBalance,
        getNotify: getNotify,
        isAdmin: isAdmin
    };
};

//Every thirty seconds, check the TXs of each user.
setInterval(async () => {
    for (var user in users) {
        //If that user doesn't have an address, continue.
        if (users[user].address === false) {
            continue;
        }

        //Declare the amount deposited.
        var deposited = BN(0);
        //Get the TXs.
        var txs = await process.core.coin.getTransactions(users[user].address);

        //Iterate over the TXs.
        for (var i in txs) {
            //If we haven't handled them...
            if (handled.indexOf(txs[i].txid) === -1) {
                //Add the TX value to the deposited amount.
                deposited = deposited.plus(BN(txs[i].amount));
                //Push the TX ID so we don't handle it again.
                handled.push(txs[i].txid);
            }
        }

        await addBalance(user, deposited);
    }
}, 30 * 1000);
