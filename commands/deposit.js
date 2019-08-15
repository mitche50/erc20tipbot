module.exports = async (msg) => {
    //Only enable this for DM messages
    if (msg.obj.channel.type != "dm") return;
    if (!(await process.core.users.getAddress(msg.sender))) {
        msg.obj.reply("You didn't have an address, generating one for you now ...")
            .then(() => await process.core.users.setAddress(msg.sender, await process.core.coin.createAddress(msg.sender)))
            .catch(() => console.error("Error generating deposit address"));
    }

    msg.obj.reply("Your reusable address is " + await process.core.users.getAddress(msg.sender));
};
