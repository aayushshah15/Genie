var chalk = require('chalk');
var clear = require('clear');
var CLI = require('clui');
var figlet = require('figlet');
var inquirer = require('inquirer');
var Preferences = require('preferences');
var Spinner = CLI.Spinner;
var GithubApi = require('github');
var _ = require('lodash');
var git = require('simple-git')();
var touch = require('touch');
var fs = require('fs');

var files = require('./lib/files');

clear();
console.log(
	chalk.yellow(
		figlet.textSync('Genie', { horizontalLayout: 'full' })
		)
	);

if (files.directoryExists('.git')) {
	console.log(chalk.red('Already a git repository!'));
	process.exit();
}

function getGithubCredentials(callback) {
	var questions = [
		{
			name: 'username',
			type: 'input',
			message: 'Enter your Github username or e-mail address',
			validate: function(value) {
				if (value.length) {
					return true;
				} else {
					return "Please enter your github username or email address";
				}
			}
		},
		{
			name: 'password',
			type: 'password',
			message: 'Enter your password',
			validate: function(val) {
				if (val.length) {
					return true;
				} else {
					return 'Please enter your password';
				}
			}
		}
	];

	inquirer.prompt(questions).then(callback);
}

var github = new GithubApi({
	varsion: '3.0.0'
});

function getGithubToken(callback) {
	var prefs = new Preferences('genie');

	if (prefs.github && prefs.github.token) {
		return callback(null, prefs.github.token);
	} else {
		getGithubCredentials(function(credentials) {
			var spin = new Spinner('Authenticating you, please wait..');
			spin.start();

			github.authenticate(
				_.extend(
				{
					type: 'basic'
				},
				credentials
					)
				);

			github.authorization.create({
				scopes: ['user', 'public_repo', 'repo', 'repo:status'],
				note: 'genie: Supercharged git cli'
			}, function(err, res) {
				status.stop();
				if (err) {
					return callback(err);
				}
				if (res.token) {
					prefs.github = {
						token: res.token
					};
					return callback(null, res.token);
				}
				return callback();
			});
		});
	}
}