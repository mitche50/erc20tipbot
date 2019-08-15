module.exports = async (msg) => {
    //Only enable this for DM messages
    if (msg.obj.channel.type != "dm") return;
    if (!(await process.core.users.getAddress(msg.sender))) {
        msg.obj.reply("You didn't have an address, generating one for you now ...")
            .then(() => process.core.coin.createAddress(msg.sender))
            .then((newAddress) => process.core.users.setAddress(msg.sender, newAddress))
            .then((newAddress) => sendAddress(newAddress))
            .catch(() => console.error("Error generating deposit address"));
    };

    async function sendAddress(newAddress) {
        if (newAddress != "invalid") {
            msg.obj.reply("Your reusable address is " + newAddress);
        } else {
            msg.obj.reply("There was an error generating your address.");
        }
    }
};
