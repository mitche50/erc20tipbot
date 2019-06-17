# Tip Bot

### A BTC and ERC20 Tip bot made for Discord, with MySQL as a DB.

This code is based off the modular (and not secure) ERC20 Tip Bot [here](https://github.com/kayabaNerve/erc20-tip-bot-old-unsafe). This one does not claim to be modular, yet it should be easy to modify this bot to work off other databases or coin APIs.

To install the bot:
- If the coin is BTC based:
    - Install your 'BTCd'.
    - Edit the conf file to add `server=1`, `rpcuser=user`, and `rpcpass=pass` (with your own username and password).
    - Start the daemon.
    - Move `btcSettings.json` to `settings.json`.
    - Edit the `settings.json` file's `coin` var to have:
        - `type` set to `"BTC"`.
        - `symbol` set to the coin's symbol ("BTC").
        - `decimals` set to the amount of the coin's decimals (8). Optionally, you may set a lower amount of decimals so users can't tip satoshis.
        - `port` set to the daemon's RPC port (8337).
        - `user` set to the username you set in the conf file ("user").
        - `pass` set to the password you set in the conf file ("pass").
- If the coin is an ERC20:
    - Install `geth`.
    - Run `geth --syncmode "light"` to start Geth with light sync on.
    - Move `erc20Settings.json` to `settings.json`.
    - Edit the `settings.json` file's `coin` var to have:
        - `type` set to `"erc20"`.
        - `symbol` set to the coin's symbol ("ERC").
        - `decimals` set to the amount of the coin's decimals (18).
        - `ipc` set to Geth's IPC file's path ("/home/user/.ethereum/geth.ipc").
    - Edit the `settings.json` file's `coin.addresses` var to have:
        - `wallet` set to an account address on the Geth node, with a password of "", that will host all the Ether used to fund TXs.
        - `contract` set to the ERC20's contract address.
- Install MySQL.
    - Create a database.
    - Create a table with `name VARCHAR(64), address VARCHAR(64), balance VARCHAR(64), notify tinyint(1)`.
    - Edit the `settings.json` file's `mysql` var to have:
        - `db` set to the name of the database you made for the bot.
        - `table` set to the name of the table you made for the bot.
        - `user` set to the name of a MySQL user with access to the DB.
        - `pass` set to the password of that MySQL user.
- Create a Discord Bot User.
    - Go to https://discordapp.com/developers/applications/me.
    - Click `New App`.
    - Enter a name, and optionally, upload an icon.
    - Click `Create a Bot User`.
    - Grab the `Client ID` from the top, and go to this link: https://discordapp.com/oauth2/authorize?client_id=!!CLIENT_ID!!&scope=bot&permissions=68672, after replacing !!CLIENT_ID!! with the bot's client ID. This will allow you to add the bot to a server with the proper permissions of Read Messages/Send Messages/Add Reactions (the last one is only necessary if you use giveaways).
    - Edit the `settings.json` file's `discord` var to include:
        - `token` set to the bot user token. This is not the client user.
        - `user` set to the value gotten by right-clicking the bot on your server and clicking `Copy ID`. This requires `Developer Mode` to be enabled on your Discord client.
- Set up pools. Either delete or modify the ones in settings.json.
    - `admins` control who can add/remove members.
    - `members` is anyone who can spend the money in the pool.
- Set up any channel locked commands in `settings.json`'s `commands` var.
    - If you wish to lock a command to a channel, edit `example` to be the name of the command, and `ROOM ID` to be the value gotten from right-clicking a room and clicking `Copy ID`. You can add multiple channel IDs to the array.
    - To setup more channel locks, simply copy the `example` template and fill it our properly.
- Install NodeJS dependencies via `npm i`.
    - `discord.js` will print several warnings about requiring a peer but none was installed. These are normal, and refer to optional packages for connecting to voice channels, something we don't do.

All pools must be created via settings.json. All edits to the list of admins must also be done there. Members can be added and removed with `!pool NAME add @USER` and `!pool NAME remove @USER`, where NAME is the name of the pool, and @USER is a ping of the Discord user. To send from a pool, use `!tip POOL @USER AMOUNT`.

There is also a giveaway command to run giveaways with. If you don't want it, either don't setup the `giveaways` pool or comment out the line that loads it in `main.js`. To use it, run `!giveaway Ts Ww A`, where T is the time in seconds (or use "m" as a suffix for minutes), W is the amount of winners, and A is the amount each win. The amount will come from the `giveaways` pool and be tipped out to the winners.

Neither of these commands are documented as they are only to be used by whoever runs the bot, and that is not most people. It's not for security via obscurity, but rather because a long help file where half the commands aren't needed is annoying.

Want to donate? 0xA0F7aAAF3161c5611a904263bFfe45C92394Da44
