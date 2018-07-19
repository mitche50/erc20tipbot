//BTC lib.
var bitcoin = require("bitcoin-core");

//BTC RPC Client.
var client;

//RAM cache of all the addresses and TXs.
var addresses, txs;

//Creates a new address.
async function createAddress() {
    var address = await client.getNewAddress();
    addresses.push(address);
    return address;
}

async function ownAddress(address) {
    return addresses.indexOf(address) !== -1;
}

//Gets an address's transactions.
async function getTransactions(address) {
    return txs[address];
}

//Sends amount to address.
async function send(address, amount) {
    try {
        return await client.sendToAddress(address, amount.toFixed(8));
    } catch(e) {
        return false;
    }
}

module.exports = async () => {
    //Create the client.
    client = new bitcoin({
        host: "localhost",
        port: process.settings.coin.port,
        username: process.settings.coin.user,
        password: process.settings.coin.pass
    });

    //Init the addresses array.
    addresses = [];
    //Init the TXs RAM cache.
    txs = {};

    //Get all the TXs the client is hosting, and sort them by address.
    async function getTXs() {
        var txsTemp = await client.listTransactions();

        //Iterate through each TX.
        for (var i in txsTemp) {
            //If the TX has a new address, init the new array.
            if (typeof(txs[txsTemp[i].address]) === "undefined") {
                txs[txsTemp[i].address] = [];
            }

            //Make sure the TX has 1 confirm.
            if (txsTemp[i].confirmations < 1) {
                continue;
            }

            //Push each TX to the proper address, if it isn't already there.
            if (
                txs[txsTemp[i].address].map((tx) => {
                    return tx.txid;
                }).indexOf(txsTemp[i].txid) === -1
            ) {
                txs[txsTemp[i].address].push(txsTemp[i]);
            }
        }
    }
    //Do it every thirty seconds.
    setInterval(getTXs, 30 * 1000);
    //Run it now so everything is ready.
    await getTXs();

    //Get each address and add it to the address array.
    var temp = await client.listReceivedByAddress(0, true);
    for (var i in temp) {
        addresses.push(temp[i].address);
    }

    //Return the functions.
    return {
        createAddress: createAddress,
        ownAddress: ownAddress,
        getTransactions: getTransactions,
        send: send
    };
};
