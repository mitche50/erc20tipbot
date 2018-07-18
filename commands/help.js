//Get variables from the settings.
var bot = process.settings.discord.user;
var symbol = process.settings.coin.symbol;
var fee = process.settings.coin.withdrawFee;

//Default help tect.
var help = [
    "**TIPBOT COMMAND LIST**",
    "To run a command, either preface it with \"!\" (\"!deposit\", \"!tip\") or ping the bot (\"<@" + bot + "> deposit\", \"<@" + bot + "> tip\").",
    "",
    "-- *!balance*",
    "Prints your balance.",
    "",
    "-- *!tip <@PERSON> <AMOUNT>*",
    "Tips the person that amount of " + symbol + ".",
    "",
    "-- *!withdraw <AMOUNT> <ADDRESS>*",
    "Withdraws AMOUNT to ADDRESS, charging a " + fee + " " + symbol + " fee.",
    "",
    "-- *!deposit*",
    "Prints your personal deposit address",
].join("\r\n");

module.exports = async (msg) => {
    msg.obj.author.send({
        embed: {
            description: help
        }
    });
};
