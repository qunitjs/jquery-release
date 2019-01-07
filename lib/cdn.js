/* global Release */
var shell = require( "shelljs" ),
	fs = require( "fs" ),
	chalk = require( "chalk" ),

	repo = require( "./repo.js" ),
	util = require( "./util.js" ),
	cdn,

	realRemote = "git@github.com:jquery/codeorigin.jquery.com.git",
	testRemote = "git@github.com:jquery/fake-cdn.git";

function projectCdnDir() {
	var jqueryCdn = cdn._cloneCdnRepo() + "/cdn";

	return jqueryCdn + "/qunit";
}

cdn = module.exports = {
	_cloneCdnRepo: function() {
		var local = Release.dir.base + "/codeorigin.jquery.com",
			remote = Release.isTest ? testRemote : realRemote;

		if ( fs.existsSync( local ) ) {
			return local;
		}

		console.log( "Cloning " + chalk.cyan( remote ) + "..." );
		util.chdir( Release.dir.base );
		util.exec( "git clone " + remote + " " + local, "Error cloning CDN repo." );
		console.log();

		return local;
	},

	copyCdnArtifacts: function() {
		var npmPackage = repo.readPackage().name,
			targetCdn = projectCdnDir(),
			releaseCdn = Release.dir.repo + "/dist/cdn",
			commitMessage = npmPackage + ": Added version " + Release.newVersion;

		util.chdir( Release.dir.base );
		console.log(
			"Copying files from " + chalk.cyan( releaseCdn ) +
				" to " + chalk.cyan( targetCdn ) + "."
		);
		shell.mkdir( "-p", targetCdn );
		shell.cp( "-r", releaseCdn + "/*", targetCdn );

		console.log( "Adding files..." );
		util.chdir( targetCdn );
		util.exec( "git add .", "Error adding files." );
		util.exec( "git commit -m \"" + commitMessage + "\"", "Error commiting files." );
	},

	pushToCdn: function() {
		util.chdir( projectCdnDir() );
		util.exec( "git push", "Error pushing to CDN." );
		console.log();
	}
};
