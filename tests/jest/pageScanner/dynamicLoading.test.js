/* eslint-env node */
/* eslint-disable no-console */
/**
 * Functional Tests for Dynamic axe-core Loading
 *
 * Tests to ensure that the dynamic import optimization works correctly
 * and maintains expected module structure.
 */

describe( 'Dynamic axe-core Loading Structure', () => {
	test( 'dynamic import should be used in pageScanner index', () => {
		const fs = require( 'fs' );
		const path = require( 'path' );

		const scannerPath = path.resolve( __dirname, '../../../src/pageScanner/index.js' );
		const scannerCode = fs.readFileSync( scannerPath, 'utf8' );

		// Check that static import of axe-core is removed
		expect( scannerCode ).not.toMatch( /import\s+['"]axe-core['"]/ );
		expect( scannerCode ).not.toMatch( /\/\*\s*global\s+axe\s*\*\// );

		// Check that dynamic import is present
		expect( scannerCode ).toMatch( /import\s*\(\s*\/\*\s*webpackChunkName:\s*["']axe-core["']\s*\*\/\s*['"]axe-core['"]/ );

		// Check that loadAxe function exists
		expect( scannerCode ).toMatch( /async\s+function\s+loadAxe\s*\(\s*\)/ );

		// Check that scan function calls loadAxe
		expect( scannerCode ).toMatch( /const\s+axe\s*=\s*await\s+loadAxe\s*\(\s*\)/ );
	} );

	test( 'webpack configuration should include axe-core chunk splitting', () => {
		const fs = require( 'fs' );
		const path = require( 'path' );

		const webpackPath = path.resolve( __dirname, '../../../webpack.config.js' );
		const webpackCode = fs.readFileSync( webpackPath, 'utf8' );

		// Check for axe-core cache group configuration
		expect( webpackCode ).toMatch( /axeCore:\s*{[^}]*test:\s*\/.*axe-core.*\// );
		expect( webpackCode ).toMatch( /name:\s*['"]axe-core['"]/ );
		expect( webpackCode ).toMatch( /chunks:\s*['"]async['"]/ );

		// Check for performance budgets
		expect( webpackCode ).toMatch( /performance:\s*{/ );
		expect( webpackCode ).toMatch( /maxEntrypointSize:\s*250000/ );
	} );

	test( 'build should create expected chunk structure', () => {
		const fs = require( 'fs' );
		const path = require( 'path' );

		const buildDir = path.resolve( __dirname, '../../../build' );

		// Main bundle should exist and be small
		const mainBundlePath = path.join( buildDir, 'pageScanner.bundle.js' );
		expect( fs.existsSync( mainBundlePath ) ).toBe( true );

		// Chunks directory should exist
		const chunksDir = path.join( buildDir, 'chunks' );
		expect( fs.existsSync( chunksDir ) ).toBe( true );

		// axe-core chunk should exist
		const chunkFiles = fs.readdirSync( chunksDir );
		const axeCoreChunk = chunkFiles.find( ( file ) => file.startsWith( 'axe-core.' ) && file.endsWith( '.js' ) );
		expect( axeCoreChunk ).toBeDefined();

		console.log( 'Build structure validation passed:' );
		console.log( `- Main bundle: ${ Math.round( fs.statSync( mainBundlePath ).size / 1024 ) } KiB` );
		console.log( `- axe-core chunk: ${ axeCoreChunk }` );
	} );

	test( 'optimization should maintain required exports', () => {
		const fs = require( 'fs' );
		const path = require( 'path' );

		const scannerPath = path.resolve( __dirname, '../../../src/pageScanner/index.js' );
		const scannerCode = fs.readFileSync( scannerPath, 'utf8' );

		// Check that window.runAccessibilityScan is still exported
		expect( scannerCode ).toMatch( /window\.runAccessibilityScan\s*=/ );

		// Check that scan function still processes violations
		expect( scannerCode ).toMatch( /processViolation/ );

		// Check that custom rules and checks are still imported
		expect( scannerCode ).toMatch( /import.*rulesArray.*from.*config\/rules/ );
		expect( scannerCode ).toMatch( /import.*checksArray.*from.*config\/rules/ );

		// Check that exclusions are still applied
		expect( scannerCode ).toMatch( /import.*exclusionsArray.*from.*config\/exclusions/ );
	} );

	test( 'loadAxe function should handle different scenarios', () => {
		const fs = require( 'fs' );
		const path = require( 'path' );

		const scannerPath = path.resolve( __dirname, '../../../src/pageScanner/index.js' );
		const scannerCode = fs.readFileSync( scannerPath, 'utf8' );

		// Check that loadAxe caches the module
		expect( scannerCode ).toMatch( /if\s*\(\s*axeModule\s*\)/ );
		expect( scannerCode ).toMatch( /axeModule\s*=.*axeCore/ );

		// Check that it handles import failures
		expect( scannerCode ).toMatch( /Failed to load axe-core/ );

		// Check that it provides fallback to global axe
		expect( scannerCode ).toMatch( /window\.axe/ );
	} );
} );
