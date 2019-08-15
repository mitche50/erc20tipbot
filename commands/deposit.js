module.exports = async (msg) => {
    //Only enable this for DM messages
    if (message.channel.type != "dm") return;
    if (!(await process.core.users.getAddress(msg.sender))) {
        await process.core.users.setAddress(msg.sender, await process.core.coin.createAddress(msg.sender));
    }

    msg.obj.reply("Your reusable address is " + await process.core.users.getAddress(msg.sender));
};
