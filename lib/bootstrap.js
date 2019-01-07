/* global Release */
var fs = require( "fs" ),
	path = require( "path" ),
	semver = require( "semver" ),
	which = require( "which" ),

	util = require( "./util.js" ),
	bootstrap;

bootstrap = module.exports = {
	_showUsage: function() {
		console.log( fs.readFileSync( path.resolve( __dirname, "cli-usage.txt" ), "utf8" ) );
	},

	checkExecutables: function() {
		[ "git", "npm", "grunt", "curl" ].forEach( function( command ) {
			try {
				which.sync( command );
			} catch ( e ) {
				util.abort( "Missing required executable: " + command );
			}
		} );
	},

	parseArguments: function() {
		Release.args = {};

		process.argv.forEach( function( arg ) {
			var name, value,
				matches = /--([^=]+)(=(.+))?/.exec( arg );

			if ( matches ) {
				name = matches[ 1 ].replace( /-([a-z])/gi, function( all, letter ) {
					return letter.toUpperCase();
				} );
				value = matches[ 3 ] || true;
				Release.args[ name ] = value;
			}
		} );

		bootstrap._parseRemote();
		Release.branch = Release.args.branch || "master";
		Release.preRelease = Release.args.preRelease || false;

		if ( Release.preRelease && !semver.valid( Release.preRelease ) ) {
			util.abort( "Invalid --pre-release argument, not valid semver: " +
				Release.preRelease );
		}

		console.log();
		console.log( "\tRelease type: " + ( Release.preRelease ? "pre-release" : "stable" ) );
		console.log( "\tRemote: " + Release.remote );
		console.log( "\tBranch: " + Release.branch );
		console.log();

		if ( Release.isTest ) {
			console.log( "This is a test release. npm will not be updated." );
		} else {
			console.log( "This is a real release. GitHub and npm will be updated." );
		}
	},

	_parseRemote: function() {
		var remote = Release.args.remote;

		if ( !remote ) {
			console.log( "Missing required remote repo." );
			console.log();
			bootstrap._showUsage();
			process.exit( 1 );
		}

		// If it's not a local path, it must be a GitHub repo
		if ( !/:\/\//.test( remote ) ) {
			if ( !fs.existsSync( remote ) ) {
				Release.isTest = !/^qunitjs\//.test( remote );
				remote = "git@github.com:" + remote + ".git";
			}
		}

		Release.remote = remote;
	},

	createReleaseDirectory: function() {
		console.log( "Determining directories..." );
		Release.dir = {
			base: process.cwd() + "/__release"
		};
		Release.dir.repo = Release.dir.base + "/repo";

		if ( fs.existsSync( Release.dir.base ) ) {
			console.log( "The directory '" + Release.dir.base + "' already exists." );
			console.log( "Aborting." );
			process.exit( 1 );
		}

		console.log( "Creating directory..." );
		fs.mkdirSync( Release.dir.base );
	}
};
