//BN lib.
var BN = require("bignumber.js");
BN.config({
    ROUNDING_MODE: BN.ROUND_DOWN,
    EXPONENTIAL_AT: process.settings.coin.decimals + 1
});

var symbol = process.settings.coin.symbol;

module.exports = async (msg) => {
    //Check the argument count.
    if (msg.text.length !== 3) {
        msg.obj.reply("You used the wrong amount of arguments.");
        return;
    }

    //Get the amount from the command.
    var amount = msg.text[1];
    //Amount with the withdrawl fee.
    var amountWFee;

    //If the amount is all...
    if (amount === "all") {
        //The amount with the fee is the user's balance.
        amountWFee = await process.core.users.getBalance(msg.sender);
        //The amount is the balance minus the fee.
        amount = amountWFee.minus(BN(process.settings.coin.withdrawFee));        
    //Else...
    } else {
        //Parse the amount (limited to the satoshi), and add the withdraw fee.
        amount = BN(BN(amount).toFixed(process.settings.coin.decimals));
        amountWFee = amount.plus(BN(process.settings.coin.withdrawFee));
    }

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
        msg.obj.reply("Your number is either invalid, negative, or you don't have enough. Remember, you must also have extra " + symbol + " to pay the fee.");
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
