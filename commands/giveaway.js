var BN = require("bignumber.js");
BN.config({
    ROUNDING_MODE: BN.ROUND_DOWN,
    EXPONENTIAL_AT: process.settings.coin.decimals + 1
});

var pools = process.settings.pools;
var symbol = process.settings.coin.symbol;

var reactWith = "\r\n\r\nReact with :tada: to enter!";

async function formatTime(time) {
    var minutes = "", seconds, verb;
    if (time >= 60) {
        minutes = Math.floor(time/60);
        if (minutes !== 1) {
            minutes = minutes + " minutes, ";
        } else {
            minutes = minutes + " minute, ";
        }
    }

    seconds = time % 60;
    if (seconds !== 1) {
        seconds = seconds + " seconds";
        verb = "are";
    } else {
        seconds = seconds + "second";
        verb = "is";
    }

    return "**" + minutes + seconds + "** " + verb + " left.";
}

async function formatWinners(winners) {
    return "**" + winners + "** winner" + ((winners !== 1) ? "s" : "") + ".";
}

//Creates a message to send.
async function createMessage(time, winners, amount) {
    return `
:tada: :tada: **${symbol} GIVEAWAY!** :tada: :tada:


${await formatTime(time)}
${await formatWinners(winners)}
**${amount.toString()}** ${symbol} each.
    `;
}

//Updates a message.
async function updateMessage(message, time, winners, amount) {
    await message.edit("", {
        embed: {
            description:
                (await createMessage(time, winners, amount)) +
                reactWith
        }
    });
}

//End a giveaway.
async function endMessage(message, time, winners, amount, whoWon) {
    await message.edit("", {
        embed: {
            description:
                (await createMessage(time, winners, amount)) +
                "\r\n\r\nThis giveaway has ended! The winners are:\r\n" +
                whoWon.join("\r\n")
        }
    });
}

module.exports = async (msg) => {
    //Check the argument count.
    if (msg.text.length !== 4) {
        msg.obj.reply("You used the wrong quantity of arguments.");
        return;
    }

    //Check to make sure the sender is allowed to run a giveaway.
    if (
        (pools.giveaways.admins.indexOf(msg.sender) === -1) &&
        (pools.giveaways.members.indexOf(msg.sender) === -1)
    ) {
        msg.obj.reply("You don't have permission to run a giveaway.");
        return;
    }

    //Extract the arguments.
    var time = msg.text[1];
    time = {
        time: parseInt(time.substr(0, time.length - 1)),
        unit: time.substr(time.length - 1, time.length)
    };
    var winners = msg.text[2];
    winners = {
        quantity: parseInt(winners.substr(0, winners.length - 1)),
        flag: winners.substr(winners.length - 1, winners.length)
    };
    var amount = BN(msg.text[3]);

    //Verify the validity of the time argument.
    if (msg.text[1].length === 1) {
        msg.obj.reply("Your time is missing a proper suffix of either \"s\" or \"m\".");
        return;
    }
    if (
        (Number.isNaN(time.time)) ||
        (time.time <= 0)
    ) {
        msg.obj.reply("Your time is not a positive number.");
        return;
    }
    if (
        (time.unit !== "s") &&
        (time.unit !== "m")
    ) {
        msg.obj.reply("Your time isn't in seconds or minutes! Please use one or the other.");
        return;
    }
    //Calculate the actual time of the giveaway.
    time = ((time.unit === "m") ? 60 : 1) * time.time;

    //Verify the validity of the winners argument.
    if (msg.text[2].length === 1) {
        msg.obj.reply("Your winners argument is missing the proper suffix of \"w\".");
        return;
    }
    if (
        (Number.isNaN(winners.quantity)) ||
        (winners.quantity <= 0)
    ) {
        msg.obj.reply("Your winners quantity is not a positive number.");
        return;
    }
    if (winners.flag !== "w") {
        msg.obj.reply("Please put a w after the second argument, to mark that it's how many winners the giveaway has.");
        return;
    }
    //Remove the flag now that we're done with it.
    winners = winners.quantity;

    //Verify the validity of the amount argument.
    if (
        (amount.isNaN()) ||
        (amount.lte(0))
    ) {
        msg.obj.reply("Your amount that each winner will win not a valid positive number.");
        return;
    }

    //Calculate the total amount;
    var total = amount.times(winners);
    //Verify the giveaways pool may have enough money.
    if (!(await process.core.users.subtractBalance("giveaways", total))) {
        msg.obj.reply("The giveaways fund doesn't have enough money.");
        return;
    }
    //Add it back in case the giveaway fails. We subtract the total at the end.
    await process.core.users.addBalance("giveaways", total);

    //Send the message.
    var giveaway = await msg.obj.channel.send({
        embed: {
            description:
                await createMessage(time, winners, amount) +
                reactWith
        }
    });
    //React for ease of use.
    giveaway.react("🎉");

    //Create the var of who won.
    var whoWon = [];

    //Function to update the time.
    async function updateTime() {
        //Subtract 5 seconds from the time.
        time = time - 5;

        //If the giveaway is over...
        if (time <= 0) {
            //If whoWon doesn't equal the amount of winners we should have, wait half a second and then call updateTime again.
            if (whoWon.length === winners) {
                setTimeout(updateTime, 500);
                return;
            //Else, if it was set to false, meaning we didn't get enough entries...
            } else if (whoWon === false) {
                await endMessage(giveaway, time, winners, amount, ["Sorry! Not enough people entered."]);
                return;
            }

            //Else, the giveaway ended properly and we have the winners.
            await endMessage(giveaway, time, winners, amount, whoWon);
        }

        //If it's still going on. update the message with the new time.
        await updateMessage(giveaway, time, winners, amount);
        //Set a new timeout.
        setTimeout(updateTime, 5000);
    }
    //Run the function in five seconds.
    setTimeout(updateTime, 5000);

    //Track the reactions.
    giveaway.createReactionCollector((reaction) => {
        return reaction.emoji.name === "🎉";
    }, {
        time: time * 1000
    }).on("end", async (collected) => {
        //Create an array out of who entered.
        var users = collected.array()[0].users.array();
        //Make sure someone entered.
        if (users.length === 1) {
            whoWon = false;
            giveaway.channel.send("Sorry! Not enough people entered.");
            return;
        }
        //Interate over each user and replace their user with their printable @.
        var i;
        for (i in users) {
            //Verify it isn't the bot.
            while (users[i].id === process.settings.discord.user) {
                users.splice(i, 1);
            }

            users[i] = users[i].id;
        }

        //If we didn't get a full amount of entries, lower the winners amount so our timeout knows to run.
        if (users.length < winners) {
            winners = users.length;
        }

        //Iterate for the amount of winners we need.
        for (i = 0; i < winners; i++) {
            //Select a random user to be a winner.
            var winner = Math.floor(
                Math.random() * users.length
            );
            //Push the user to whoWon.
            whoWon.push(users[winner]);
            //Remove that user so they don't win again..
            users.splice(winner, 1);
        }

        //Subtract the total from the giveaways pool.
        await process.core.users.subtractBalance("giveaways", amount.times(winners));
        //Distribute to the winners.
        for (i in whoWon) {
            //Create their account if they don't have one.
            await process.core.users.create(whoWon[i]);
            //Add the amount to their balance.
            await process.core.users.addBalance(whoWon[i], amount);
        }

        //Send a new message to the channel about the winners.
        giveaway.channel.send({
            embed: {
                description: `
:tada: :tada: **${symbol} GIVEAWAY!** :tada: :tada:

Congratulations to the winners of **${amount.toString()}** ${symbol} each!
${"<@" + whoWon.join(">\r\n<@") + ">"}
                `
            }
        });
    });
};
