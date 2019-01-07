var bootstrap = require( "./lib/bootstrap.js" ),
	cdn = require( "./lib/cdn.js" ),
	npm = require( "./lib/npm.js" ),
	prompt = require( "./lib/prompt.js" ),
	repo = require( "./lib/repo.js" ),
	util = require( "./lib/util.js" ),

	// State and config object
	Release = {

		// set by bootstrap.parseArguments
		args: null,
		branch: null,
		preRelease: false,
		remote: null,
		isTest: true,

		// set by bootstrap.createReleaseDirectory
		dir: null,

		// set by repo.getVersions
		newVersion: null,
		nextVersion: null
	},

	commonTasks, stableTasks;

function complete() {
	console.log( "Release complete." );
	console.log( "Please review the project-specific release checklist." );
}

global.Release = Release;

commonTasks = [
	bootstrap.checkExecutables,
	bootstrap.parseArguments,

	prompt.confirm,

	bootstrap.createReleaseDirectory,

	util.section( "setting up repo" ),
	repo.cloneRepo,
	repo.checkAuthorsTxt,
	npm.checkNpmCredentials,

	util.section( "calculating versions" ),
	repo.getVersions,
	prompt.confirm,

	util.section( "building release" ),
	repo.createReleaseBranch,

	util.section( "pushing tag" ),
	prompt.confirmReview,
	repo.pushRelease,

	util.section( "publishing to jQuery CDN" ),
	cdn.copyCdnArtifacts,
	prompt.confirmReview,
	cdn.pushToCdn,

	util.section( "publishing to npm" ),
	npm.publishNpm
];

stableTasks = [
	util.section( "updating branch version" ),
	repo.updateBranchVersion,

	function() {
		// use closure to capture live state of 'Release.branch'
		util.section( "pushing " + Release.branch )();
	},

	prompt.confirmReview,
	repo.pushBranch
];

util.walk( commonTasks, function() {
	if ( Release.preRelease ) {
		return complete();
	}

	util.walk( stableTasks, complete );
});
