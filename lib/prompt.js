var chalk = require( "chalk" ),
	prompt;

prompt = module.exports = {
	_prompt: function( fn ) {
		process.stdin.once( "data", function( chunk ) {
			process.stdin.pause();
			fn( chunk.toString().trim() );
		} );
		process.stdin.resume();
	},

	confirm: function( fn ) {
		console.log( chalk.yellow( "Press enter to continue, or ctrl+c to cancel." ) );
		prompt._prompt( fn );
	},

	confirmReview: function( fn ) {
		console.log( chalk.yellow(
			"Please review the output and generated " +
				"files as a sanity check."
		) );
		prompt.confirm( fn );
	}
};
