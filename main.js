const db = require("./db.js"); 
const btcNode = require("./BTC.js"); 
const withdrawFee = 1; 
const token = "DISCORD BOT TOKEN"; 
var client = new(require("discord.js")).Client();
var accounts;

db.accountLoader.on("loaded", (loaded) => {
    accounts = loaded;
});
db.loadAccounts();

function refund(sender, amount) {
    accounts[sender].balance += amount;
    accounts[sender].withdrawls++;
    db.update(sender, accounts[sender]);
}

function check(sender, msg, items, msgObj) {
    if (accounts[sender].check > 0) {
        msgObj.reply("You need to run btc!init before you can start using this bot.");
        return true;
    }

    if ((items !== 0) && (msg.length !== items)) {
        msgObj.reply("You didn't include the right amount of arguments.");
        return true;
    }

    if ((accounts[sender].last + 30000) > Date.now()) {
            msgObj.reply("Please wait " + Math.round((0-(Date.now()-(accounts[sender].last+30000)))/1000) + " seconds before using the bot again.");
            return true;
    }
    accounts[sender].last = Date.now();

    return false;
}

var help = require("./help.js").help;
function parseMsg(msg, sender, msgObj) {
    switch (msg[0]) {
        case "deposit":
            if (check(sender, msg, 2, msgObj)) {
                break;
            }

            msg[1] = parseInt(msg[1]);
            if ((Number.isNaN(msg[1])) || (msg[1] < 1)) {
                msgObj.reply("You must deposit a number greater than one.");
                break;
            }

            var breakOut;
            for (var a in accounts) {
                if (accounts[a].depoAmount === msg[1]) {
                    if ((accounts[a].depoTime + (65 * 60 * 1000)) < Date.now()) {
                        accounts[a].depoAmount = 0;
                        accounts[a].depoTime = 0;
                    }
                    msgObj.reply("That amount is already in use.");
                    breakOut = true;
                    break;
                }
            }
            if (breakOut) {
                break;
            }

            accounts[sender].depoTime = Date.now();
            accounts[sender].depoAmount = msg[1];
            msgObj.reply("Send to " + btcNode.address + " within an hour. Remember. You said you would deposit " + msg[1] + " BTC tenths (" + (msg[1]/10) +" BTC). No more, no less.");
            break;

        case "tip":
            if (check(sender, msg, 0, msgObj)) {
                break;
            }

            if ((msg[1].substr(0, 2) !== "<@") ||
                (msg[1].substr(msg[1].length-1) !== ">") ||
                (Number.isNaN(parseInt(msg[1].substring(2, msg[1].length-1))))) {
                msgObj.reply("You are not tipping to a valid person. Please put @ in front of their name and click the popup Discord provides.");
                break;
            }

            msg[2] = parseInt(msg[2]);
            if (Number.isNaN(msg[2])) {
                msgObj.reply("You didn't enter a number.");
            } else if (msg[2] <= 0) {
                msgObj.reply("You can only tip positive amounts. Don't be a thief.");
            }  else if ((accounts[sender].balance - msg[2]) < 0) {
                msgObj.reply("You don't have enough money to tip that. You have " + accounts[sender].balance + " tenths of a BTC.");
            } else if (sender === msg[1]) {
                msgObj.reply("You cannot send to yourself.");
            } else {
                accounts[sender].balance -= msg[2];
                db.update(sender, accounts[sender]);
                if (!(accounts[msg[1]])) {
                    accounts[msg[1]] = {balance: msg[2], last: 0, check: 2, withdraws: 0, depoAmount: 0, depoTime: 0};
                } else {
                    accounts[msg[1]].balance += msg[2];
                }
                db.update(msg[1], accounts[msg[1]]);
                msgObj.reply("Sent " + msg[2] + " BTC tenths to " + msg[1] + ".");
            }
            break;

        case "withdraw":
            if (check(sender, msg, 3, msgObj)) {
                break;
            }

            msg[2] = parseInt(msg[2]);
            if (msg[1] === btcNode.address) {
                msgObj.reply("You cannot withdraw to me. It's just network spam...");
            } else if (Number.isNaN(msg[2])) {
                msgObj.reply("You didn't enter a number.");
            } else if (msg[2] === 0) {
                msgObj.reply("You cannot withdraw 0.");
            } else if (msg[2] < 0) {
                msgObj.reply("You can only withdraw positive amounts. Don't be a thief.");
            } else if ((accounts[sender].balance < (msg[2] + withdrawFee)) && (accounts[sender].withdraws === 0)) {
                msgObj.reply("You don't have enough to withdraw that. You have " + accounts[sender].balance + " tenths of an BTC and must leave 1 to pay the withdraw fee.");
            } else if (accounts[sender].balance < (msg[2])) {
                msgObj.reply("You don't have enough to withdraw that. You have " + accounts[sender].balance + " tenths of an BTC.");
            } else {
                if (accounts[sender].withdraws === 0) {
                    accounts[sender].balance -= withdrawFee;
                    accounts[sender].withdraws = 10;
                }
                accounts[sender].withdraws--;
                accounts[sender].balance -= msg[2];
                db.update(sender, accounts[sender]);
                var address = msgObj.content.substring(4, msgObj.content.length).split(" ").filter((item, index, inputArray) => {
                   return item !== "";
                });
                for (var i = 0; i < address.length; i++) {
                    address[i] = address[i].split("\r")[0].split("\n")[0];
                }
                btcNode.send(address[1], msg[2], msgObj, refund);
            }
            break;

        case "balance":
            msgObj.author.send("You have " + accounts[sender].balance + " BTC tenths.");
            break;

        case "init":
            switch (accounts[sender].check) {
                case 0:
                    msgObj.reply("You already made your account.");
                    break;

                case 1:
                    accounts[sender].check--;
                    msgObj.reply("Account initialized!");
                    db.update(sender, accounts[sender]);
                    break;

                case 2:
                    accounts[sender].check--;
                    msgObj.reply("By running \"btc!init\" again, you agree that you've read the statements in \"btc!help\", to release the creator, owner, and all maintainers of the bot from any legal liability, and that you undertsand this is beta software. You may lose money. Nothing is guaranteed.");
                    break;
            }
            break;

        case "help":
            if (msg.length > 1) {
                msgObj.reply(help(msg[1]));
            } else {
                msgObj.reply(help());
            }
            break;

        default:
            msgObj.reply("That is not a command. Run \"btc!help\" to get a list of commands or edit your last message.");
    }
}

function handleMessage(msg) {
    if (msg.content.toLowerCase().substr(0, 4) !== "btc!") {
        return;
    }

    var sender = msg.author.toString();
    if (!(accounts[sender])) {
        accounts[sender] = {balance: 0, withdraws: 0, check: 2, last: 0, depoAmount: 0, depoTime: 0};
        db.addNewUser(sender);
    }

    var message = msg.content.substring(4, msg.content.length).toLowerCase().split(" ").filter((item, index, inputArray) => {
       return item !== "";
    });
    for (var i = 0; i < message.length; i++) {
        message[i] = message[i].split("\r")[0].split("\n")[0];
    }
    parseMsg(message, sender, msg);
}

client.on("message", (msg) => {
    handleMessage(msg);
});
client.on("messageUpdate", (oldMsg, msg) => {
    handleMessage(msg);
});
client.login(token);

function handleDeposit(amount) {
    for (var a in accounts) {
        if (accounts[a].depoAmount !== amount) {
            continue;
        }
        accounts[a].depoAmount = 0;
        accounts[a].depoTime = 0;
        accounts[a].balance += amount;
        db.update(a, accounts[a]);
        break;
    }
}
btcNode.scheduler.on("deposit", handleDeposit);
