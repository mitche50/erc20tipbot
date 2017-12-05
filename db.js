const connection = require("mysql").createConnection({
    host: "localhost",
    user: "root",
    password: "password",
    database: "db"
});
const table = "btc";

connection.connect((err) => {
    if (err) {
        console.log(err);
    }
});

module.exports = {
    loadAccounts: () => {
        connection.query("SELECT * FROM " + table, (err, rows) => {
            if (err) {
                console.log(err);
            }

            var accounts = {};
            rows.forEach((row) => {
                accounts[row.name] = {balance: row.balance, withdraws: row.withdraws, check: row.notify, last: 0, depoAmount: 0, depoTime: 0};
            });
            module.exports.accountLoader.emit("loaded", accounts);
        });
    },

    addNewUser: (id) => {
        connection.query("INSERT INTO " + table + " VALUES(\"" + id + "\", 0, 0, 2)", (err)=>{});
    },

    update: (id, account) => {
        connection.query("UPDATE " + table + " SET balance=" + account.balance + " WHERE name=\"" + id + "\"", (err)=>{});
        connection.query("UPDATE " + table + " SET withdraws=" + account.withdraws + " WHERE name=\"" + id + "\"", (err)=>{});
        connection.query("UPDATE " + table + " SET notify=" + account.check + " WHERE name=\"" + id + "\"", (err)=>{});
    },

    accountLoader: new (require("events"))()
};

