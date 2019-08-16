//BN lib.
var BN = require("bignumber.js");
BN.config({
    ROUNDING_MODE: BN.ROUND_DOWN,
    EXPONENTIAL_AT: process.settings.coin.decimals + 1
});

module.exports = async (msg) => {
    //Only enable this for DM messages
    if (msg.obj.channel.type != "dm") return;

    //Check if user is an active admin.
    if (!await process.core.users.isAdmin(msg.sender)) return;

    //Check the argument count.
    if (msg.text.length !== 2) {
        msg.obj.reply("You used the wrong amount of arguments.");
        return;
    }

    //Get the destination from the command.
    var address = msg.obj.content
        .split(" ").filter((item) => {
            return item !== "";
        }).join(" ")
        .substring(1, msg.obj.content.length)
        .replace(new RegExp("\r", "g"), "")
        .replace(new RegExp("\n", "g"), "")
        .split(" ")[1];
    
    //If we own that address...
    if (await process.core.coin.ownAddress(address)) {
        msg.obj.reply("You cannot withdraw to me. It's just network spam...");
        return;
    }

    var amount = await BN(process.core.coin.getTokenBalance(process.settings.coin.addresses.wallet));
    console.log("amount returned from getTokenBalance: " + amount);
    if (amount == NaN) return;
    //The amount is the total balance minus all user's balances
    var userBalances = await process.core.users.getAllBalance();

    //Check if the sum of the user's balances is >= than the total balance of the contract wallet.
    //If it is, you cannot withdraw anything.
    if (amount <= userBalances) {
        msg.obj.reply("The total balance is not greater than the user's balance, you can't withdraw.");
        return;
    }

    //Subtract the user's balances from the amount, the remaining amount is fees paid to the admin.
    amount = amount - userBalances;

    //Send the transaction to the provided address.
    var hash = await process.core.coin.send(address, amount);
    if (typeof(hash) !== "string") {
        msg.obj.reply("Our node failed to create a TX! Is your address invalid?");
        await process.core.users.addBalance(msg.sender, amount);
        return;
    }

    msg.obj.reply("Success! Your TX hash is " + hash + ".");
};