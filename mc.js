const config = require('./config');
const { spawn } = require('child_process');
const path = require('path');

const mcJar = path.basename(config.mc.path);
const mcDir = path.dirname(config.mc.path);

spawn(
	'java',
	[
		`-Xmx${config.mc.memory}`,
		`-Xms${config.mc.memory}`,
		'-jar', mcJar, 'nogui'
	],
	{
		cwd: mcDir,
		stdio: 'inherit'
	}
);
