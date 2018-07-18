module.exports = async (msg) => {
    if (!(await process.core.users.getAddress(msg.sender))) {
        await process.core.users.setAddress(msg.sender, await process.core.coin.createAddress(msg.sender));
    }

    msg.obj.reply("Your reusable address is " + await process.core.users.getAddress(msg.sender) + "!");
};
