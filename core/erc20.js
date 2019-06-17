//BigNumber lib.
var BN = require("bignumber.js");

//Web3 lib.
var web3 = require("web3");
//ERC20 ABI.
var abi = [{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"success","type":"bool"}],"type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"success","type":"bool"}],"type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"success","type":"bool"}],"type":"function"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Transfer","type":"event"}];
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
    //Create an address.
    var address = (await (web3.eth.personal.newAccount())).toLowerCase();

    //Unlock the master account and send the new slave Ether.
    await web3.eth.personal.unlockAccount(master);
    await web3.eth.sendTransaction({
        from: master,
        to: address,
        value: web3.utils.toWei("0.001")
    });
    
    //Unlock the slave.
    await web3.eth.personal.unlockAccount(address);
    //Allow the master to spend every ERC20 the slave gets.
    await contract.methods.approve(master, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff").send({
        from: address,
        gas: 70000,
        gasPrice: 14000000000
    });

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

async function send(to, amount) {
    //Add on the needed decimals.
    amount = amount.toFixed(decimals).replace(".", "");

    //Unlock the master account.
    await (web3.eth.personal.unlockAccount(master));
    //Transfer the ERC20.
    var receipt = await contract.methods.transfer(to, amount).send({
        from: master
    });
    
    if (receipt.status) {
        return receipt.transactionHash;
    }
    return false;
}

module.exports = async () => {
    //Init Web3.
    web3 = new web3(process.settings.coin.ipc, require("net"));
    //Create the Contract object.
    contract = new web3.eth.Contract(abi, process.settings.coin.addresses.contract);
    //Set the decimals and decimalsBN.
    decimals = process.settings.coin.decimals;
    decimalsBN = BN(10).pow(decimals);
    
    //Set the master address.
    master = process.settings.coin.addresses.wallet;
    
    //Get all the addresses.
    addresses = await web3.eth.getAccounts();
    for (var i = 0; i < addresses.length; i++) {
        //Make sure it's lower case.
        addresses[i] = addresses[i].toLowerCase();
        
        //If it's the master address, splice it out.
        if (addresses[i] === master.toLowerCase()) {
            addresses.splice(i, 1);
            i--;
        }
    }
    
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
        await web3.eth.personal.unlockAccount(master);
        var receipt = await contract.methods.transferFrom(data.to, master, data.value).send({
            from: master
        });
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
            amount: BN(data.value).div(decimalsBN).toString()
        });
    });

    //Return the functions.
    return {
        createAddress: createAddress,
        ownAddress: ownAddress,
        getTransactions: getTransactions,
        send: send
    };
};
