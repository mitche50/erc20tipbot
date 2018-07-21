var web3 = new (require("web3"))("/home/iop/.ethereum/geth.ipc", require("net"));
var abi = [{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"success","type":"bool"}],"type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"success","type":"bool"}],"type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"success","type":"bool"}],"type":"function"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Transfer","type":"event"}];
var contract = new web3.eth.Contract(abi, process.env.ERC20CONTRACT, {
    gasPrice: "10000000000"
});

var addresses = {};
module.exports = {
    addAddress: async (address) => {
        addresses[address] = true;
    },

    genAddress: async (msgObj) => {
        var address = (await (web3.eth.personal.newAccount())).toLowerCase();
        var approved = false;

        await web3.eth.personal.unlockAccount(process.env.ETHMASTER);
        web3.eth.sendTransaction({
            from: process.env.ETHMASTER,
            to: address,
            value: web3.utils.toWei("0.00048"),
            gasPrice: "10000000000"
        }).on("confirmation", async () => {
            if (approved) {
                return;
            }
            approved = true;

            await web3.eth.personal.unlockAccount(address);
            contract.methods.approve(process.env.ETHMASTER, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff").send({
                from: address,
                gasLimit: "48000",
                gasPrice: "10000000000",
                value: "0"
            }).on("confirmation", async () => {
                addresses[address] = true;
            });
        });

        addresses[address] = false;
        module.exports.scheduler.emit("address", msgObj.author.id.toString(), address);

        msgObj.reply("Your reusable deposit address is " + address + ".");
    },

    send: async (to, amount, chatInterface, refund) => {
        var amountBackup = amount;
        amount = amount.toString() + "00000000000";

        await (web3.eth.personal.unlockAccount(process.env.ETHMASTER));
        contract.methods.transfer(to, amount).send({
            from: process.env.ETHMASTER,
            gasPrice: "10000000000"
        }, async (err, res) => {
            if (err) {
                chatInterface.reply("That withdraw threw an error! Your money has been refunded.");
                refund(chatInterface.author.id.toString(), amountBackup);
                chatInterface.reply(err);
                return;
            }

            chatInterface.reply("Success! https://etherscan.io/tx/" + res);
        });
    },

    scheduler: new(require("events"))()
};

setTimeout(async () => {
    contract.events.Transfer({}, async (err, res) => {
        if (err) {
            console.log(err);
            return;
        }

        var data = res.returnValues;

        if (Object.keys(addresses).indexOf(data.to.toLowerCase()) === -1) {
            return;
        }

        var hydAmount = data.value;
        if (hydAmount.length < 12) {
            return;
        }
        hydAmount = parseInt(hydAmount.substr(0, hydAmount.length-11));
        if (hydAmount < 2) {
            return;
        }

        var interval = setInterval(async () => {
            if (addresses[data.to.toLowerCase()]) {
                clearInterval(interval);

                var depositConfirmed = false;
                await web3.eth.personal.unlockAccount(process.env.ETHMASTER);
                contract.methods.transferFrom(data.to, process.env.ETHMASTER, data.value).send({
                    from: process.env.ETHMASTER,
                    gasPrice: "10000000000"
                }, async (err, res) => {
                    if (err) {
                        console.log(err);
                    }
                }).on("confirmation", async () => {
                    if (depositConfirmed) {
                        return;
                    }
                    depositConfirmed = true;

                    module.exports.scheduler.emit("deposit", data.to.toLowerCase(), hydAmount-1);
                });
            }
        }, 20000);
    });
}, 2000);
