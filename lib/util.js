var shell = require( "shelljs" ),
	chalk = require( "chalk" ),

	util;

util = module.exports = {
	exec: function( _options, errorMessage ) {
		var result,
			command = _options.command || _options,
			options = {};

		if ( _options.silent ) {
			options.silent = true;
		}

		errorMessage = errorMessage || "Error executing command: " + command;

		result = shell.exec( command, options );
		if ( result.code !== 0 ) {
			util.abort( errorMessage );
		}

		return result.output;
	},

	chdir: function( directory ) {
		console.log( "Changing working directory to " + chalk.cyan( directory ) + "." );
		process.chdir( directory );
	},

	abort: function( msg, error ) {
		if ( !error ) {
			error = new Error( msg );
			Error.captureStackTrace( error, util.abort );
		}

		console.log( chalk.red( msg ) );
		console.log( chalk.red( "Aborting." ) );
		console.log();
		console.log( error.stack );

		process.exit( 1 );
	},

	section: function( name ) {
		return function() {
			console.log();
			console.log( "##" );
			console.log( "## " + chalk.magenta( name.toUpperCase() ) );
			console.log( "##" );
			console.log();
		};
	},

	/**
	 * Executes an array of methods step by step.
	 *
	 * For any given method, if that method accepts arguments
	 * (`method.length > 0`), it will pass a callback that the method
	 * needs to execute when done, making the method call async.
	 *
	 * Otherwise the method is assumed to be sync and the next
	 * method runs immediately.
	 *
	 * Once all methods are executed, the `done` callback is executed.
	 *
	 * @param {Function[]} methods
	 * @param {Function} fn
	 */
	walk: function( methods, fn ) {
		var method = methods.shift();

		function next() {
			if ( !methods.length ) {
				return fn();
			}

			util.walk( methods, fn );
		}

		if ( !method.length ) {
			method();
			next();
		} else {
			method( next );
		}
	}
};
