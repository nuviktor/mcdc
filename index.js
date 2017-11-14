const config = require('./config');

const { spawn } = require('child_process');
const Discord = require('discord.js');
const path = require('path');

const client = new Discord.Client();

const mcChat = /^\[\d\d:\d\d:\d\d] \[Server thread\/INFO\]: <([A-Za-z0-9_]+)> (.*)/;
const mcPlayerActivity = new RegExp(
	'^\\[\\d\\d:\\d\\d:\\d\\d\\] \\[Server thread\\/INFO\\]: ([A-Za-z0-9_]+) ' +
	'(left the game|' +
	'joined the game|' +
	'has made the advancement .+|' +
	'was .+|' +
	'hugged a cactus|' +
	'walked into a cactus.*|' +
	'drowned.*|' +
	'burned.*|' +
	'blew up.*|' +
	'hit the ground too hard|' +
	'fell.*|' +
	'went up in flames|' +
	'walked into a fire.*|' +
	'tried to swim in lava.*|' +
	'discovered floor was lava.*|' +
	'went off with a bang|' +
	'got finished off by .+)'
);

const mcJar = path.basename(config.mc.path);
const mcDir = path.dirname(config.mc.path);

var mcProc;
var mcProcAlive = false;
var dcChannel;

function dcLog(line) {
	process.stdout.write(`[DC] ${line}\n`);
}

function mcLog(line) {
	process.stdout.write(`[MC] ${line}\n`);
}

function dcLogError(error) {
	process.stderr.write(`[DC] [!] ${error}\n`);
}

function mcLogError(error) {
	process.stderr.write(`[MC] [!] ${error}\n`);
}

function mcLogProc(line, fd) {
	if (fd == 1)
		process.stdout.write(`[MC] [OUT] ${line}`);
	else
		process.stdout.write(`[MC] [ERR] ${line}`);
}

function mcOnStdout(data) {
	let result;
	const line = data.toString();

	if ((result = mcChat.exec(line)) && dcChannel)
		dcChannel.send(`<${result[1]}> ${result[2]}`).catch(dcLogError)
	else if ((result = mcPlayerActivity.exec(line)) && dcChannel)
		dcChannel.send(`**${result[1]}** ${result[2]}`).catch(dcLogError);

	mcLogProc(line, 1);
}

function mcOnExit(code) {
	let line = 'Server exited cleanly';

	if (code == 0) {
		mcLog(line);
		if (dcChannel) dcChannel.send(line).catch(dcLogError);
	} else {
		line = `Server exited with code ${code}`;
		mcLogError(line);
		if (dcChannel) dcChannel.send(line).catch(dcLogError);
	}

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
	mcLog('Starting server');

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

	if (! mcProcAlive)
		mcStartProc();
});

client.on('message', message => {
	if (isMessageCommand(message)) {
		const command = stripPrefix(message.content).split(/\s+/);

		if (command[0] == 'start') {
			if (! mcProcAlive) {
				message.channel.send('Starting server');
				mcStartProc();
			} else {
				message.channel.send('Server already started');
			}
		}
	} else if (isMessageFromChannel(message) && ! isMessageFromSelf(message)) {
		const user = message.author.username;
		const content = message.content.replace(/[\n\r]/g, ' ').substring(0, 1024);

		if (mcProcAlive)
			mcProc.stdin.write(`/say <${user}> ${content}\n`);
    }
});
