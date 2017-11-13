# Minecraft/Discord integration

## Installation

The steps below assume you are already have a running Minecraft server on Linux with NodeJS, NPM and git installed.

1. [Set up a Discord app](https://discordapp.com/developers/applications/me) with a bot user and add it to your server. Save the token (but keep it secret).
2. Get the ID of the channel where you want to relay messages between Minecraft and Discord and save it.
3. `$ git clone https://github.com/nuviktor/mcdc.git`
4. `$ cd mcdc`
5. `$ npm install`
6. `$ cp config.example.js config.js`
7. Edit `config.js`, setting the path to the Minecraft jar, the maximum memory you want Minecraft to consume, the Discord app token from earlier, and the channel ID you saved as well.
8. Make sure the Minecraft server is stopped.
9. Run `npm start` which will run the `index.js` file, starting the Minecraft server and establishing the bridge between Discord and Minecraft.

## Todo

* Implement status command
* Make emoticons, highlights, channel links and screenshots show up better in Minecraft
