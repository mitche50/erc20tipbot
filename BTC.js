const fromAddress = "1xayDBEFSwjCw547B4ZZ5X69SiAuz5X2J";
var client = new(require("bitcoin")).Client({
    host: "localhost",
    port: 8332,
    user: "username",
    pass: "password"
});

var fs = require("fs");

module.exports = {
    address: fromAddress,
    send: (to, amount, chatInterface, refund) => {
        amount = amount / 10;
        client.sendToAddress(to, amount, (err, hash, headers) => {
            if (err) {
                refund(chatInterface.author.toString(), amount*10);
                return;
            }
            chatInterface.reply("Success! " + hash);
        });
    },
    scheduler: new(require("events"))()
};

var hashes = [];
client.listReceivedByAddress((err, res, headers) => {
    hashes = res[0].txids;
});
setInterval(() => {
    client.listReceivedByAddress((err, res, headers) => {
        try {
            res[0].txids.forEach((e) => {
                if (hashes.indexOf(e) > -1) {
                    return;
                }
                client.getTransaction(e, (err2, tx, headers2) => {
                    if (tx.confirmations === 0) {
                        return;
                    }
                    hashes.push(e);
                    module.exports.scheduler.emit("deposit", Math.floor(tx.amount * 10));
                });
            });
        } catch (e) {}
    });
}, 10000);
