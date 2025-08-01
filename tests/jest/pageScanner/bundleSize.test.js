/* eslint-env node */
/* eslint-disable no-console */
/**
 * Bundle Size Tests
 *
 * Tests to ensure the pageScanner bundle size optimization is working
 * and the bundle stays under the performance budget.
 */

const fs = require( 'fs' );
const path = require( 'path' );

describe( 'pageScanner Bundle Size', () => {
	const buildDir = path.resolve( __dirname, '../../../build' );
	const pageScannerBundle = path.join( buildDir, 'pageScanner.bundle.js' );
	const chunksDir = path.join( buildDir, 'chunks' );

	// Performance budget: 244 KiB = 249,856 bytes
	const PERFORMANCE_BUDGET = 249856;

	test( 'pageScanner.bundle.js should exist after build', () => {
		expect( fs.existsSync( pageScannerBundle ) ).toBe( true );
	} );

	test( 'pageScanner.bundle.js should be under performance budget (244 KiB)', () => {
		if ( ! fs.existsSync( pageScannerBundle ) ) {
			throw new Error( 'pageScanner.bundle.js not found. Run npm run build first.' );
		}

		const stats = fs.statSync( pageScannerBundle );
		const sizeInBytes = stats.size;
		const sizeInKiB = Math.round( sizeInBytes / 1024 );

		expect( sizeInBytes ).toBeLessThan( PERFORMANCE_BUDGET );

		// Log size for visibility
		console.log( `pageScanner.bundle.js size: ${ sizeInKiB } KiB (${ sizeInBytes } bytes)` );
	} );

	test( 'axe-core should be split into separate chunk', () => {
		expect( fs.existsSync( chunksDir ) ).toBe( true );

		const chunkFiles = fs.readdirSync( chunksDir );
		const axeCoreChunk = chunkFiles.find( ( file ) => file.startsWith( 'axe-core.' ) && file.endsWith( '.js' ) );

		expect( axeCoreChunk ).toBeDefined();
		console.log( `axe-core chunk: ${ axeCoreChunk }` );

		if ( axeCoreChunk ) {
			const axeCoreChunkPath = path.join( chunksDir, axeCoreChunk );
			const stats = fs.statSync( axeCoreChunkPath );
			const sizeInKiB = Math.round( stats.size / 1024 );
			console.log( `axe-core chunk size: ${ sizeInKiB } KiB (${ stats.size } bytes)` );
		}
	} );

	test( 'total size should be reasonable (main bundle + chunks)', () => {
		if ( ! fs.existsSync( pageScannerBundle ) || ! fs.existsSync( chunksDir ) ) {
			throw new Error( 'Build files not found. Run npm run build first.' );
		}

		// Get main bundle size
		const mainBundleSize = fs.statSync( pageScannerBundle ).size;

		// Get axe-core chunk size
		const chunkFiles = fs.readdirSync( chunksDir );
		const axeCoreChunk = chunkFiles.find( ( file ) => file.startsWith( 'axe-core.' ) && file.endsWith( '.js' ) );
		const axeCoreSize = axeCoreChunk ? fs.statSync( path.join( chunksDir, axeCoreChunk ) ).size : 0;

		const totalSize = mainBundleSize + axeCoreSize;
		const totalSizeKiB = Math.round( totalSize / 1024 );

		// Total size should be reasonable (less than original 601 KiB plus some buffer)
		expect( totalSizeKiB ).toBeLessThan( 700 ); // Allow some buffer for webpack overhead

		console.log( `Total pageScanner assets: ${ totalSizeKiB } KiB` );
		console.log( `Main bundle: ${ Math.round( mainBundleSize / 1024 ) } KiB, axe-core chunk: ${ Math.round( axeCoreSize / 1024 ) } KiB` );
	} );
} );
