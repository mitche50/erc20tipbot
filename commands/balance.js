var pools = process.settings.pools;

module.exports = async (msg) => {
    //Only enable this for DM messages
    if (message.channel.type != "dm") return;
    //If an argument was provided...
    if (msg.text[1]) {
        var pool = msg.text[1];
        //Verufy the pool exists.
        if (Object.keys(pools).indexOf(pool) === -1) {
            //Tell the user that pool doesn't exist.
            msg.obj.reply("That pool doesn't exist.");
            return;
        }

        //Verify the person has access to the pool.
        if (
            //If the user isn't an admin of the pool...
            (pools[pool].admins.indexOf(msg.sender) === -1) &&
            //And isn't a member of the pool...
            (pools[pool].members.indexOf(msg.sender) === -1)
        ) {
            //Tell the user they don't have permission to access that pool.
            msg.obj.reply("You don't have permission to access that pool.");
            return;
        }

        //Tell the user the pool's balance.
        msg.obj.reply(pools[pool].printName + " has " + (await process.core.users.getBalance(pool)).toString() + " " + process.settings.coin.symbol + ".");
        return;
    }

    //If no argument was provided, tell the user thir balance.
    msg.obj.reply("You have " + (await process.core.users.getBalance(msg.sender)).toString() + " " + process.settings.coin.symbol + ".");
};
