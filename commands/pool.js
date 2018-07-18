//Require FS to be able to save the pools back t the disk.
var fs = require("fs");

var pools = process.settings.pools;

module.exports = async (msg) => {
    //Verify the argument length.
    if (msg.text.length !== 4) {
        msg.obj.reply("Your command the wrong amount of arguments.");
        return;
    }

    //Extract the arguments.
    var pool = msg.text[1];
    var command = msg.text[2];
    var user = msg.text[3].replace("!", "");

    //Check the pool exists.
    if (Object.keys(pools).indexOf(pool) === -1) {
        msg.obj.reply("That pool doesn't exist.");
        return;
    }

    //Check that the sender is an admin.
    if (pools[pool].admins.indexOf(msg.sender) === -1) {
        msg.obj.reply("You aren't an admin of that pool.");
        return;
    }

    //Validate the target.
    var target = user.substring(2, user.length-1);
    if (
        (user.substr(0, 2) !== "<@") ||
        (user.substr(user.length-1) !== ">") ||
        (Number.isNaN(parseInt(target)))
    ) {
        msg.obj.reply("That user is invalid.");
        return;
    }

    //Add/remove them from the pool.
    if (command === "add") {
        if (pools[pool].members.indexOf(target) > -1) {
            msg.obj.reply("That user is already in that pool.");
            return;
        }
        pools[pool].members.push(target);
    } else if (command === "remove") {
        if (pools[pool].members.indexOf(target) === -1) {
            msg.obj.reply("That user is not in that pool.");
            return;
        }
        pools[pool].members.splice(pools[pool].members.indexOf(target), 1);
    } else {
        msg.obj.reply("That command is invalid. It must be either `add` or `remove`.");
        return;
    }

    //Save the pools to the disk.
    process.settings.pools = pools;
    fs.writeFileSync(process.settingsPath, JSON.stringify(process.settings, null, 4));
    msg.obj.reply("Done.");
};
