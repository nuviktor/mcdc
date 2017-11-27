const config = require('./config');

const { spawn } = require('child_process');
const Discord = require('discord.js');
const path = require('path');

const client = new Discord.Client();

const mcChat = /^\[\d\d:\d\d:\d\d\] \[Server thread\/INFO\]: <([A-Za-z0-9_]+)> (.*)/;
const mcPlayerJoin = /^\[\d\d:\d\d:\d\d\] \[Server thread\/INFO\]: ([A-Za-z0-9_]+) (joined the game)/;
const mcPlayerLeave = /^\[\d\d:\d\d:\d\d\] \[Server thread\/INFO\]: ([A-Za-z0-9_]+) (left the game)/;
const mcPlayerActivity = new RegExp(
	'^\\[\\d\\d:\\d\\d:\\d\\d\\] \\[Server thread\\/INFO\\]: ([A-Za-z0-9_]+) ' +
	'(has made the advancement .+|' +
	'was .+|' +
	'hugged a cactus|' +
	'walked into a cactus .+|' +
	'drowned.*|' +
	'burned to death|' +
	'blew up|' +
	'hit the ground too hard|' +
	'fell .+|' +
	'went up in flames|' +
	'walked into a fire .+|' +
	'tried to swim in lava.*|' +
	'discovered floor was lava|' +
	'went off with a bang|' +
	'got finished off by .+|' +
	'experienced kinetic energy|' +
	'removed an elytra while flying)'
);

const mcJar = path.basename(config.mc.path);
const mcDir = path.dirname(config.mc.path);

var mcProc;
var mcProcAlive = false;
var mcPlayers = [];

var dcChannel;

function dcLog(line) {
	process.stdout.write(`[DC] ${line}\n`);
}

function mcLog(line, newline = true) {
	process.stdout.write(`[MC] ${line}${newline ? '\n' : ''}`);
}

function dcLogError(error) {
	process.stderr.write(`[DC] [!] ${error}\n`);
}

function mcLogError(error) {
	process.stderr.write(`[MC] [!] ${error}\n`);
}

function mcLogProc(line, fd) {
	if (fd == 1)
		mcLog(`[OUT] ${line}`, false);
	else
		mcLog(`[ERR] ${line}`, false);
}

function mcOnStdout(data) {
	let result;
	const line = data.toString();

	mcLogProc(line, 1);

	if (result = mcChat.exec(line)) {
		dcChannel.send(`<${result[1]}> ${result[2]}`).catch(dcLogError);
	} else if (result = mcPlayerJoin.exec(line)) {
		mcPlayers.push(result[1]);
		dcChannel.send(`**${result[1]}** ${result[2]}`).catch(dcLogError);
	} else if (result = mcPlayerLeave.exec(line)) {
		mcPlayers.splice(mcPlayers.indexOf(result[1]), 1);
		dcChannel.send(`**${result[1]}** ${result[2]}`).catch(dcLogError);
	} else if (result = mcPlayerActivity.exec(line)) {
		dcChannel.send(`**${result[1]}** ${result[2]}`).catch(dcLogError);
	}
}

function mcOnExit(code) {
	let line = 'Server exited cleanly';

	if (code == 0) {
		mcLog(line);
		dcChannel.send(line).catch(dcLogError);
	} else {
		line = `Server exited with code ${code}`;
		mcLogError(line);
		dcChannel.send(line).catch(dcLogError);
	}

	mcPlayers = [];
	mcProcAlive = false;
}

function mcSpawn() {
	return spawn(
		'java',
		[
			`-Xmx${config.mc.memory}`,
			`-Xms${config.mc.memory}`,
			'-jar', mcJar, 'nogui'
		],
		{
			cwd: mcDir
		}
	);
}

function mcStartProc() {
	mcProc = mcSpawn();
	mcProcAlive = true;

	mcProc.stdin.setEncoding('utf-8');
	mcProc.stdout.on('data', mcOnStdout);
	mcProc.stderr.on('data', data => {
		mcLogProc(data.toString(), 2);
	});
	mcProc.on('exit', mcOnExit);
}

function mcStopProc() {
	if (mcProcAlive)
		mcProc.kill();
}

function isMessageCommand(message) {
	return message.content.startsWith(config.dc.commandPrefix);
}

function isMessageFromChannel(message) {
	return message.channel.id == config.dc.channel;
}

function isMessageFromSelf(message) {
	return message.author.id == client.user.id;
}

function stripPrefix(command) {
	return command.substring(config.dc.commandPrefix.length);
}

client.login(config.dc.token);

client.on('ready', () => {
	dcLog('Client ready');

	dcChannel = client.channels.get(config.dc.channel);

	if (! mcProcAlive) {
		mcLog('Starting server');
		mcStartProc();
	}
});

client.on('message', message => {
	if (isMessageCommand(message)) {
		const command = stripPrefix(message.content).split(/\s+/);
		const channel = message.channel;

		dcLog(`Received command: ${command[0]}`);

		switch (command[0]) {
			case 'start':
				let line = 'Starting server';

				if (! mcProcAlive) {
					mcLog(line);
					channel.send(line);
					mcStartProc();
				} else {
					line = 'Server already started';
					mcLog(line);
					channel.send(line);
				}
			break;
			case 'status':
				const playerList = mcPlayers.join(', ');

				if (! mcProcAlive)
					channel.send('The server is not running');
				else if (mcPlayers.length == 0)
					channel.send('There are 0 players online');
				else if (mcPlayers.length == 1)
					channel.send(`There is 1 player online:\n\n${playerList}`);
				else
					channel.send(`There are ${mcPlayers.length} players online:\n\n${playerList}`);
			break;
			default:
				channel.send('Command does not exist');
		}
	} else if (isMessageFromChannel(message) && ! isMessageFromSelf(message) && mcProcAlive) {
		const user = message.author.username;
		const content = message.content.replace(/[\n\r]/g, ' ').substring(0, 1024);

		mcProc.stdin.write(`/say <${user}> ${content}\n`);
    }
});
