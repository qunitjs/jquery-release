/* global Release */
var chalk = require( "chalk" ),
	shell = require( "shelljs" ),

	util = require( "./util.js" ),
	repo = require( "./repo.js" ),
	npm;

npm = module.exports = {
	_getNpmUser: function() {
		var user = util.exec( {
			command: "npm whoami",
			silent: true
		}, "Error getting npm user." );

		if ( /^Not authed/.test( user ) ) {
			util.abort( "You are not registered with npm." );
		}

		return user.trim();
	},

	_getNpmOwners: function( npmPackage ) {
		var result = shell.exec( "npm owner ls " + npmPackage, { silent: true } );
		if ( result.code !== 0 ) {

			// The npm package may not exist yet
			if ( result.output.split( "\n" ).some(
				function( line ) {
					return ( /ERR! 404/ ).test( line );
				} )
			) {
				return [];
			}

			util.abort( "Error getting npm owners." );
		}

		return result.output.trim().split( "\n" ).map( function( owner ) {
			return owner.split( " " )[ 0 ];
		} );
	},

	checkNpmCredentials: function() {
		var npmPackage = repo.readPackage().name,
			user = npm._getNpmUser(),
			owners = npm._getNpmOwners( npmPackage );

		if ( owners.length && owners.indexOf( user ) === -1 ) {
			util.abort( user + " is not an owner of " + npmPackage + " on npm." );
		}
	},

	/**
		 * Returns tags to apply to the npm release.
		 *
		 * Every release must contain at least one tag.
		 */
	_getTags: function() {
		var tags = [ "beta" ];

		if ( !Release.preRelease ) {
			tags.push( "latest" );
		}

		return tags;
	},

	publishNpm: function() {
		util.chdir( Release.dir.repo );

		var name = repo.readPackage().name,
			tags = npm._getTags(),
			npmCommand = "npm publish --tag " + tags.pop();

		if ( Release.isTest ) {
			console.log( "Actual release would now publish to npm using (dry run):" );
		} else {
			console.log( "Publishing to npm, running:" );
		}

		console.log( "  " + chalk.cyan( npmCommand ) );
		if ( !Release.isTest ) {
			util.exec( npmCommand );
		}

		while ( tags.length ) {
			npmCommand = "npm dist-tag add " + name + "@" + Release.newVersion + " " + tags.pop();
			console.log( "  " + chalk.cyan( npmCommand ) );
			if ( !Release.isTest ) {
				util.exec( npmCommand );
			}
		}

		console.log();
	}
};
