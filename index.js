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

function createRepo(callback) {
	var argv = require('minimist')(process.argv.slice(2));

	var questions = [
		{
			type: 'input',
			name: 'name',
			message: 'Enter a name for the repository:',
			default: argv._[0] || files.getCurrentDirectoryBase(),
			validate: funciton(value) {
				if (value.length) {
					return true;
				} else {
					return 'Please enter a name for the repository';
				}
			}
		},
		{
			type: 'input',
			name: 'description',
			default: argv._[1] || null,
			message: 'Optionally enter a description of the repository:'
		},
		{
			type: 'list',
			name: 'visibility',
			message: 'Public or private:',
			choices: ['public', 'private'],
			default: 'public'
		}
	];

	inquirer.prompt(questions).then(function(answers) {
		var status = new Spinner ('Creating repository...');
		status.start();

		var data = {
			name: answers.name,
			description: answers.description,
			private: (answers.visibility === 'private')
		};

		github.repos.create(
			data,
			function(err, res) {
				status.stop();
				if(err) {
					return callback(err);
				} else {
					return callback(null, res.ssh_url);
				}
			}
			);
	});

	function createGitignore(callback) {
		var filelist = _.without(fs.readdirSync('.'), '.git', '.gitignore');

		if (filelist.length) {
			inquirer.prompt(
				[
					{
						type: 'checkbox',
						name: 'ignore',
						message: 'Select the files and / or folders you wish to ignore',
						choices: filelist,
						default: ['node_modules', 'bower_components']
					}
				]
				).then(function (answers) {
					if (answers.ignore.length) {
						fs.writeFileSync('.gitignore', answers.ignore.join('\n'));
					} else {
						touch('.gitignore');
					}
					return callback();
				});
		} else {
			touch('.gitignore');
			return callback();
		}
	}
}