var defaultHelp = `Welcome to the BTC Tip Bot! Here you can tip other people on Discord with no tipping fees!
COMMANDS:
-- btc!deposit AMOUNT | Allows you to deposit X BTC tenths to this bot for the next hour.
-- btc!tip PERSON AMOUNT | Sends Y BTC tenths to person X from your balance.
-- btc!withdraw ADDRESS AMOUNT | Withdraws Y BTC tenths to X address. 1 BTC tenth gets you 100 withdraws.
-- btc!balance | Returns your balance in BTC tenths.
-- btc!init | Activates your account.
Run "btc!help COMMAND" for more info on a command.
This bot uses BTC tenths (0.1 BTC). No decimals are allowed.
By running btc!init, you agree to release the coder, owner, and other parties related to this bot, from any and all liability. This is BETA software. You may lose money.`;

var helpStrings = {
    "deposit": "\"btc!deposit 5\" Running that will display an address to send BTC to. If you run that example, you must send 0.5 BTC to the address with an hour.",
    "tip": "\"btc!tip <@272093437166223360> 5\" Running that will send 0.5 BTC to Kayaba, the creator of this bot. If you do run it, thanks!",
    "withdraw": "\"btc!withdraw pQ23uyQLv3QNDmfdwLCZhTUeJ33hHk7aqS 1000\" Running that would send 100 BTC to pQ23uyQLv3QNDmfdwLCZhTUeJ33hHk7aqS. It would also charge a 1 BTC tenth fee every ten withdrawls.\r\n",
    "balance": "Returns your balance in BTC tenths. Use it as so: \"btc!balance\"",
    "init": "Signals your agreeance to the Terms of Service/Conditions this bot employs and allows you to use this bot. \"btc!init\"",
    "help": "The help command details how the bot works and provides examples of commands. For instance, \"btc!help help\", the command you just entered. Seriously. Why are you running help on help?"
}

module.exports = {
    help: (command) => {
        if (command) {
            if (helpStrings[command]) {
                return helpStrings[command];
            }
        }
        return defaultHelp;
    }
}
