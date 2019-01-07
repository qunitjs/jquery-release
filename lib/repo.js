/* global Release */
var fs = require( "fs" ),
	chalk = require( "chalk" ),
	shell = require( "shelljs" ),

	util = require( "./util.js" ),
	repo,

	jsonFiles = [ "package.json", "bower.json" ],
	packageIndentation;

repo = module.exports = {
	cloneRepo: function() {
		util.chdir( Release.dir.base );
		console.log( "Cloning " + chalk.cyan( Release.remote ) + "..." );
		util.exec( "git clone " + Release.remote + " " + Release.dir.repo,
			"Error cloning repo." );
		util.chdir( Release.dir.repo );

		console.log( "Checking out " + chalk.cyan( Release.branch ) + " branch..." );
		util.exec( "git checkout " + Release.branch, "Error checking out branch." );
		console.log();

		console.log( "Installing dependencies..." );
		util.exec( "npm install --no-save", "Error installing dependencies." );
		console.log();
	},

	/**
	 * Ensure that `AUTHORS.txt` is up-to-date.
	 */
	checkAuthorsTxt: function() {
		console.log( "Checking AUTHORS.txt..." );
		var result, lastActualAuthor,
			lastListedAuthor = fs.readFileSync( "AUTHORS.txt", "utf8" )
				.trim()
				.split( /\r?\n/ )
				.pop();

		util.chdir( Release.dir.repo );
		result = util.exec( {
			command: "grunt authors",
			silent: true
		}, "Error getting list of authors." );
		lastActualAuthor = result.split( /\r?\n/ ).splice( -4, 1 )[ 0 ];

		if ( lastListedAuthor !== lastActualAuthor ) {
			console.log( "Last listed author is " + chalk.red( lastListedAuthor ) + "." );
			console.log( "Last actual author is " + chalk.green( lastActualAuthor ) + "." );
			util.abort( "Please update AUTHORS.txt." );
		}

		console.log( "Last listed author (" + chalk.cyan( lastListedAuthor ) + ") is correct." );
	},

	_readJSON: function( fileName ) {
		var json = fs.readFileSync( Release.dir.repo + "/" + fileName, "utf8" );
		packageIndentation = json.match( /\n([\t\s]+)/ )[ 1 ];
		return JSON.parse( json );
	},

	_writeJSON: function( fileName, obj ) {
		fs.writeFileSync( Release.dir.repo + "/" + fileName,
			JSON.stringify( obj, null, packageIndentation ) + "\n" );
	},

	/**
	 * Get the contents of `package.json` (in the source repo) as an object.
	 * @return {Object}
	 */
	readPackage: function() {
		return repo._readJSON( "package.json" );
	},

	/**
	 * Saves data to `package.json`, with the same indentation style
	 * as the file last read with readPackage().
	 *
	 * @param {Object} obj
	 */
	writePackage: function( obj ) {
		repo._writeJSON( "package.json", obj );
	},

	_versionJSON: function( fileName, version ) {
		if ( !fs.existsSync( Release.dir.repo + "/" + fileName ) ) {
			return;
		}
		console.log( "Updating " + fileName + "..." );
		var json = repo._readJSON( fileName );
		json.version = version;
		repo._writeJSON( fileName, json );
	},

	_setVersion: function( version ) {
		jsonFiles.forEach( function( file ) {
			repo._versionJSON( file, version );
		} );
	},

	getVersions: function() {
		var parts, major, minor, patch,
			currentVersion = repo.readPackage().version;

		console.log( "Validating current version..." );
		if ( currentVersion.substr( -4, 4 ) !== "-pre" ) {
			console.log( "The current version is " + chalk.red( currentVersion ) + "." );
			util.abort( "The version must be a pre version, e.g., 1.2.3-pre." );
		}

		Release.newVersion = Release.preRelease ?
			Release.preRelease :
			currentVersion.substr( 0, currentVersion.length - 4 );

		parts = Release.newVersion.split( "." );
		major = parseInt( parts[ 0 ], 10 );
		minor = parseInt( parts[ 1 ], 10 );
		patch = parseInt( parts[ 2 ], 10 );

		Release.nextVersion = Release.preRelease ?
			currentVersion :
			[ major, minor, patch + 1 ].join( "." ) + "-pre";

		console.log( "We are going to releease " + chalk.cyan( Release.newVersion ) + "." );
		console.log(
			"After the release, the version will be " +
				chalk.cyan( Release.nextVersion ) + "."
		);
	},

	createReleaseBranch: function() {
		var obj;

		util.chdir( Release.dir.repo );
		console.log( "Creating " + chalk.cyan( "release" ) + " branch..." );
		util.exec( "git checkout -b release", "Error creating release branch." );
		console.log();

		repo._setVersion( Release.newVersion );

		// Update package.json URLs
		console.log( "Updating package.json URLs..." );
		obj = repo.readPackage();
		obj.author.url = obj.author.url.replace( "master", Release.newVersion );
		if ( obj.licenses ) {
			obj.licenses.forEach( function( license ) {
				license.url = license.url.replace( "master", Release.newVersion );
			} );
		}
		repo.writePackage( obj );

		repo._createTag( repo._generateArtifacts() );
	},

	_createTag: function( paths ) {
		var jsonPaths = jsonFiles.filter( function( name ) {
			return !!fs.existsSync( name );
		} );

		// Ensure that at least one file is in the array so that `git add` won't error
		paths = paths.concat( jsonPaths );

		util.chdir( Release.dir.repo );
		console.log( "Committing release artifacts..." );
		util.exec( "git add -f " + paths.join( " " ), "Error adding release artifacts to git." );
		util.exec( "git commit -m \"" + Release.newVersion + "\"",
			"Error committing release changes." );
		console.log();

		console.log( "Tagging release..." );
		util.exec( "git tag " + Release.newVersion,
			"Error tagging " + Release.newVersion + "." );
	},

	_generateArtifacts: function() {
		util.exec( "grunt", "Grunt command failed" );
		shell.mkdir( "-p", "qunit" );
		shell.cp( "-r", "dist/*", "qunit/" );
		shell.mkdir( "-p", "dist/cdn" );
		shell.cp( "dist/qunit.js", "dist/cdn/qunit-" + Release.newVersion + ".js" );
		shell.cp( "dist/qunit.css", "dist/cdn/qunit-" + Release.newVersion + ".css" );
		return [ "qunit/qunit.js", "qunit/qunit.css" ];
	},

	pushRelease: function() {
		util.chdir( Release.dir.repo );
		console.log( "Pushing release to git repo..." );
		util.exec( "git push --tags", "Error pushing tags to git repo." );
	},

	updateBranchVersion: function() {
		util.chdir( Release.dir.repo );
		console.log( "Checking out " + chalk.cyan( Release.branch ) + " branch..." );
		util.exec( "git checkout " + Release.branch,
			"Error checking out " + Release.branch + " branch." );

		// Update only canonical version
		repo._versionJSON( "package.json", Release.nextVersion );

		console.log( "Committing version update..." );
		util.exec( "git commit -am \"Build: Updating the " + Release.branch +
			" version to " + Release.nextVersion + ".\"",
		"Error committing package.json." );
	},

	pushBranch: function() {
		util.chdir( Release.dir.repo );
		console.log( "Pushing " + chalk.cyan( Release.branch ) + " to GitHub..." );
		util.exec( "git push", "Error pushing to GitHub." );
	}
};
