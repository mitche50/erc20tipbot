//BN lib.
var BN = require("bignumber.js");
BN.config({
    ROUNDING_MODE: BN.ROUND_DOWN,
    EXPONENTIAL_AT: process.settings.coin.decimals + 1
});

//Vars from the settings.
var symbol = process.settings.coin.symbol;

module.exports = async (msg) => {
    //Tip details.
    var from, to, amount;

    //Tip from an user.
    if (msg.text.length >= 3) {
        //Set the tip's details.
        from = msg.sender;
        to = msg.text[1].replace("!", ""); //Turn <!@ into <@.
        amount = msg.text[2];
    } else {
        //If there was a different argument length, there was the wrong amount of arguments.
        msg.obj.reply("You used the wrong amount of arguments.");
        return;
    }

    //If the amount is all...
    if (amount === "all") {
        //Set the amount to the user's balance.
        amount = await process.core.users.getBalance(from);
    //Else...
    } else {
        //Parse amount into a BN, yet make sure we aren't dealing with < 1 satoshi.
        amount = BN(BN(amount).toFixed(process.settings.coin.decimals));
    }

    //If this is not a valid user, or a pool we're sending to...
    if (
        (
            (to.substr(0, 2) !== "<@") ||
            (to.substr(to.length-1) !== ">") ||
            (Number.isNaN(parseInt(to.substring(2, to.length-1))))
        )
    ) {
        msg.obj.reply("You are not tipping to a valid person. Please put @ in front of their name and click the popup Discord provides.");
        return;
    }
    //Strip the characters around the user ID.
    if (to.indexOf("<@") > -1) {
        to = to.substring(2, to.length-1);
    }

    //Stop pointless self sends.
    if (from === to) {
        msg.obj.reply("You cannot send to yourself.");
        return;
    }

    //Subtract the balance from the user.
    if (!(await process.core.users.subtractBalance(from, amount))) {
        //If that failed...
        msg.obj.reply("Your number is either invalid, negative, or you don't have enough.");
        return;
    }

    //Create an account for the user if they don't have one.
    await process.core.users.create(to);
    //Add the amount to the target.
    await process.core.users.addBalance(to, amount);
    msg.obj.react('\:white_check_mark:')
        .then(() => msg.obj.react('\:regional_indicator_s:'))
        .then(() => msg.obj.react('\:regional_indicator_e:'))
        .then(() => msg.obj.react('\:regional_indicator_n:'))
        .then(() => msg.obj.react('\:regional_indicator_t:'))
        .catch(() => console.error('One of the emojis failed to react.'));
};
