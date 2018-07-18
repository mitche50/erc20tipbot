//Require the path lib.
var path = require("path");

//Array of each command to its file.
var commands;

//Parses a message.
async function parseMsg(msg) {
    //If the command exists, hand it off.
    if (typeof(commands[msg.text[0]]) !== "undefined") {
        await commands[msg.text[0]](msg);
        return;
    }

    //Else, print that the command doesn't exist.
    msg.obj.reply("That is not a command. Run \"!help\" to get a list of commands or edit your last message.");
}

//Prepares, verifies, and formats a message.
async function handleMessage(msg) {
    //Get the numeric ID of whoever sent the message.
    var sender = msg.author.id;

    //Do not handle messages from itself.
    if (sender === process.settings.discord.user) {
        return;
    }

    //Split among spaces. Remove any empty items.
    var text = msg.content.split(" ").filter((item) => {
        return item !== "";
    });

    //If the start of the message, is a ping to the bot, swap it for !.
    if (text[0] === process.settings.discord.user) {
        text[1] = "!" + text[1];
        //Also remove the ping.
        text.splice(0, 1);
    }

    //Rejoin with spaces.
    text = text.join(" ");

    //If the message's first character is not the activation symbol, return.
    if (text.substr(0, 1) !== "!") {
        return;
    }

    if (
        //Create an user if they don't have an account already.
        //If they didn't have an account, and create returned true...
        (await process.core.users.create(sender)) ||
        //Or if they need to be notified...
        (await process.core.users.getNotify(sender))
    ) {
        //Give them the notified warning.
        msg.reply("By continuing to use this bot, you agree to release the creator, owners, all maintainers of the bot, and the " + process.settings.coin.symbol + " Team from any legal liability.");
        //Mark them as notified.
        await process.core.users.setNotified(sender);
        return;
    }

    //Filter the message.
    text = text
        .substring(1, text.length)          //Remove the activation symbol.
        .toLowerCase()                      //Make it lower case.
        .replace(new RegExp("\r", "g"), "") //Remove any \r characters.
        .replace(new RegExp("\n", "g"), "") //Remoce any \n characters.
        .split(" ");                        //Split it among spaces.

    //If the command is channel locked...
    if (typeof(process.settings.commands[text[0]]) !== "undefined") {
        //And this is not an approved channel...
        if (process.settings.commands[text[0]].indexOf(msg.channel.id) === -1) {
            //Print where it can be used.
            msg.reply("That command can only be run in:\r\n<#" + process.settings.commands[text[0]].join(">\r\n<#") + ">");
            return;
        }
    }

    //if we made it to this point, parse the message.
    parseMsg({
        text: text,
        sender: sender,
        obj: msg
    });
}

async function main() {
    //Load the settings into a global var so every file has access.
    process.settings = require("./settings.json");
    //Load it's path separately so we can write to it without writing the path.
    process.settingsPath = path.join(__dirname, "settings.json");

    //Set the core libs to a global object, so they're accessible by commands.
    process.core = {};
    //Require and init the coin lib, set by the settings.
    process.core.coin = await (require("./core/" + process.settings.coin.type.toLowerCase() + ".js"))();
    //Require and init the users lib.
    process.core.users = await (require("./core/users.js"))();

    //Declare the commands and load them.
    commands = {
        help:     require("./commands/help.js"),
        deposit:  require("./commands/deposit.js"),
        balance:  require("./commands/balance.js"),
        tip:      require("./commands/tip.js"),
        withdraw: require("./commands/withdraw.js"),
        pool:     require("./commands/pool.js"),
        giveaway: require("./commands/giveaway.js")
    };

    //Create a Discord process.client.
    process.client = new (require("discord.js")).Client();
    process.client.on("message", handleMessage);
    process.client.on("messageUpdate", async (oldMsg, msg) => {
        handleMessage(msg);
    });
    process.client.login(process.settings.discord.token);
}

(async () => {
    try {
        await main();
    } catch(e) {
        /*eslint no-console: ["error", {allow: ["error"]}]*/
        console.error(e);
    }
})();
