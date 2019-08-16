//fs standard lib.
var fs = require("fs");

//Async sleep lib.
var sleep = require("await-sleep");

//BigNumber lib.
var BN = require("bignumber.js");

//EthereumJS-Wallet lib.
var ethjsWallet = require("ethereumjs-wallet");

//Web3 lib.
var web3 = require("web3");
//ERC20 ABI.
var abi = [
    {"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"success","type":"bool"}],"type":"function"},
    {"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"success","type":"bool"}],"type":"function"},
    {"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"success","type":"bool"}],"type":"function"},
    {"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Transfer","type":"event"},
    {"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"}
    ];
//Contract.
var contract;

//Decimals in the ERC20.
var decimals;
var decimalsBN;

//Master address.
var master;
//RAM cache of the addresses and TXs.
var addresses, txs;

async function createAddress() {
    //Create a new Wallet.
    var newWallet = ethjsWallet.generate();
    var address = newWallet.getChecksumAddressString().toString().toLowerCase();
    web3.eth.accounts.wallet.add("0x" + newWallet.getPrivateKey().toString("hex"));
    addresses.push(address);

    //Save it to the disk.
    fs.writeFileSync(process.settings.coin.keys + address + ".json", JSON.stringify(newWallet.toV3(""), null, 4));

    //Send the new slave Ether.
    var fund = await web3.eth.accounts.signTransaction({
        to: address,
        gas: 21000,
        gasPrice: 14000000000,
        value: web3.utils.toWei("0.001")
    }, web3.eth.accounts.wallet[master].privateKey.toString());
    web3.eth.sendSignedTransaction(fund.rawTransaction);

    var receipt;
    do {
        await sleep(5000);
        receipt = await web3.eth.getTransactionReceipt(web3.utils.sha3(fund.rawTransaction));
    } while (receipt == null);

    if (!(receipt.status)) {
        /*eslint no-console: ["error", {allow: ["error"]}]*/
        console.error("Couldn't send the new address its initial funds.");
        return;
    }

    //Allow the master to spend every ERC20 the slave gets.
    var approve = await web3.eth.accounts.signTransaction({
        to: process.settings.coin.addresses.contract,
        data: await contract.methods.approve(master, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff").encodeABI(),
        gas: 70000,
        gasPrice: 14000000000
    }, web3.eth.accounts.wallet[address].privateKey.toString());
    web3.eth.sendSignedTransaction(approve.rawTransaction);

    do {
        await sleep(5000);
        receipt = await web3.eth.getTransactionReceipt(web3.utils.sha3(approve.rawTransaction));
    } while (receipt == null);

    if (!(receipt.status)) {
        /*eslint no-console: ["error", {allow: ["error"]}]*/
        console.error("Couldn't call approve from the new address.");
        return;
    }

    //Add the new address to the list of addresses.
    addresses.push(address);
    //Return it.
    return address;
}

async function ownAddress(address) {
    return addresses.indexOf(address.toLowerCase()) !== -1;
}

async function getTransactions(address) {
    return txs[address];
}

async function getTokenBalance(walletAddress) {
    // Call balanceOf function
    balance = await contract.methods.balanceOf(walletAddress);
    tokenBalance = web3.eth.abi.decodeParameter('uint256', balance);
    console.log("decoded balance: " + tokenBalance);

    return balance;
}

async function send(to, amount) {
    //Add on the needed decimals.
    amount = amount.toFixed(decimals).replace(".", "");

    //Transfer the ERC20.
    var transfer = await web3.eth.accounts.signTransaction({
        to: process.settings.coin.addresses.contract,
        data: await contract.methods.transfer(to, amount).encodeABI(),
        gas: 160000,
        gasPrice: 14000000000
    }, web3.eth.accounts.wallet[master].privateKey.toString());
    web3.eth.sendSignedTransaction(transfer.rawTransaction);

    var receipt;
    do {
        await sleep(5000);
        receipt = await web3.eth.getTransactionReceipt(web3.utils.sha3(transfer.rawTransaction));
    } while (receipt == null);

    if (receipt.status) {
        return web3.utils.sha3(transfer.rawTransaction);
    }
    return false;
}

module.exports = async () => {
    //Init Web3.
    web3 = new web3(process.settings.coin.infura);
    //Set listeners for errors / disconnects
    provider = web3.currentProvider;
    provider.on('error', e => handleDisconnects(e));
    provider.on('end', e => handleDisconnects(e));
    //When disconnected, reconnect to the websocket.
    function handleDisconnects(e) {
        console.error('WS Error', e);
        web3 = new web3(process.settings.coin.infura);
    }
    //Create the Contract object.
    contract = new web3.eth.Contract(abi, process.settings.coin.addresses.contract);
    //Set the decimals and decimalsBN.
    decimals = process.settings.coin.decimals;
    decimalsBN = BN(10).pow(decimals);

    //Set the master address.
    master = process.settings.coin.addresses.wallet.toLowerCase();

    //Load every account.
    addresses = [];
    var filenames = fs.readdirSync(process.settings.coin.keys);
    console.log("Adding addresses:")
    for (var file in filenames) {
        console.log("addresss " + file + " processing");
        var wallet = ethjsWallet.fromV3(fs.readFileSync(process.settings.coin.keys + filenames[file]).toString(), "", true);
        //If this isn't the master address, add it to the address array.
        var address = wallet.getChecksumAddressString().toString().toLowerCase();
        if (address !== master)  {
            addresses.push(address);
        }
        //Add it to Web3.
        web3.eth.accounts.wallet.add("0x" + wallet.getPrivateKey().toString("hex"));
    }
    console.log("Addresses processed.");

    //Init the TXs cache.
    txs = {};
    //Watch for transfers.
    contract.events.Transfer({
        fromBlock: await web3.eth.getBlockNumber()
    }, async (err, event) => {
        if (err) {
            /*eslint no-console: ["error", {allow: ["error"]}]*/
            console.error(err);
            return;
        }

        //Extract the data.
        var data = event.returnValues;
        //Make the addresses lower case.
        data.from = data.from.toLowerCase();
        data.to = data.to.toLowerCase();

        //Make sure it's to us.
        if (!(await ownAddress(data.to))) {
            return;
        }

        //Forward the tokens.
        var transferFrom = await web3.eth.accounts.signTransaction({
            to: process.settings.coin.addresses.contract,
            data: await contract.methods.transferFrom(data.to, master, data.value).encodeABI(),
            gas: 160000,
            gasPrice: 14000000000
        }, web3.eth.accounts.wallet[master].privateKey.toString());
        web3.eth.sendSignedTransaction(transferFrom.rawTransaction);

        var receipt;
        do {
            await sleep(5000);
            receipt = await web3.eth.getTransactionReceipt(web3.utils.sha3(transferFrom.rawTransaction));
        } while (receipt == null);
        if (!(receipt.status)) {
            /*eslint no-console: ["error", {allow: ["error"]}]*/
            console.error("Failed to forward the funds.");
            return;function ping(timeout){
                setTimeout(()=>{
                    ws.ping('Heartbeat');
                    ping(timeout)
                },timeout)
            }
        }

        //Verify that worked.
        if (receipt.status === false) {
            /*eslint no-console: ["error", {allow: ["error"]}]*/
            console.error("TX with hash " + event.transactionHash + " was not forwarded to the master.");
            return;
        }

        //Make sure the address has a TX array.
        if (typeof(txs[data.to]) === "undefined") {
            txs[data.to] = [];
        }

        //Push the TX.
        txs[data.to].push({
            txid: event.transactionHash,
            amount: BN(data.value).div(decimalsBN).toString()
        });
    });

    //Return the functions.
    return {
        createAddress: createAddress,
        ownAddress: ownAddress,
        getTransactions: getTransactions,
        send: send,
        getTokenBalance: getTokenBalance
    };
};
