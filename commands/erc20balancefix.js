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

    //Move uncredited funds to the master account if they were missed by the script.
    var amount = BN(BN(msg.text[2]).toFixed(process.settings.coin.decimals));
    var address = msg.text[1];
    var user = msg.text[3];
    var symbol = process.settings.coin.symbol;

    console.log("sending temp amount: " + amount);

    //Send the coins to the address
    var hash = await process.core.coin.balanceFix(address, amount);

    if (typeof(hash) !== "string") {
        msg.obj.reply("Our node failed to create a TX! Is your address invalid?");
        return;
    }

    //Update the user's balance
    await process.core.users.addBalance(user, amount);

    console.log("user id " + user + " credited " + amount + " " + symbol);
}