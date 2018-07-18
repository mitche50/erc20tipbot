//BN lib.
var BN = require("bignumber.js");

module.exports = async (msg) => {
    //Check the argument count.
    if (msg.text.length !== 3) {
        msg.obj.reply("You used the wrong amount of arguments.");
        return;
    }

    //Get the amount (limited to the satoshi), and add the withdraw fee.
    var amount = BN(BN(msg.text[1]).toFixed(process.settings.coin.decimals));
    var amountWFee = amount.plus(BN(process.settings.coin.withdrawFee));

    //Get the address by filtering the message again, but not calling toLowerCase this time since addresses are case sensitive.
    var address = msg.obj.content
        .split(" ").filter((item) => {
            return item !== "";
        }).join(" ")
        .substring(1, msg.obj.content.length)
        .replace(new RegExp("\r", "g"), "")
        .replace(new RegExp("\n", "g"), "")
        .split(" ")[2];

    //If we own that address...
    if (await process.core.coin.ownAddress(address)) {
        msg.obj.reply("You cannot withdraw to me. It's just network spam...");
        return;
    }

    //If we were unable to subtract the proper amount...
    if (!(await process.core.users.subtractBalance(msg.sender, amountWFee))) {
        msg.obj.reply("Your number is either invalid, negative, or you don't have enough. Remember, you must also have extra SOV to pay the fee.");
        return;
    }

    //If we made it past the checks, send the funds.
    var hash = await process.core.coin.send(address, amount);
    if (typeof(hash) !== "string") {
        msg.obj.reply("Our node failed to create a TX! Is your address invalid?");
        await process.core.users.addBalance(msg.sender, amount);
        return;
    }

    msg.obj.reply("Success! Your TX hash is " + hash + ".");
};
