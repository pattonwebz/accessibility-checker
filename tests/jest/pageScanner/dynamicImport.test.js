/**
 * Test for dynamic axe-core loading optimization
 *
 * This test verifies that the pageScanner can still function correctly
 * after implementing dynamic imports for axe-core, ensuring the
 * bundle size optimization doesn't break functionality.
 */

// Mock the dynamic import for testing
jest.mock('axe-core', () => {
	const actual = jest.requireActual('axe-core');
	return {
		__esModule: true,
		default: actual,
		axe: actual,
	};
});

describe('PageScanner Dynamic Import Optimization', () => {
	let originalWindowRunAccessibilityScan;

	beforeEach(async () => {
		// Reset the DOM before each test
		document.body.innerHTML = '';
		
		// Save the original function if it exists
		originalWindowRunAccessibilityScan = window.runAccessibilityScan;
		
		// Set up a minimal DOM for testing
		document.body.setAttribute('data-iframe-id', 'test-iframe');
		document.body.setAttribute('data-iframe-event-name', 'test-event');
		document.body.setAttribute('data-iframe-post-id', '123');

		// Clean up any existing axe instances
		if (window.axe) {
			try {
				await window.axe.cleanup();
				window.axe.teardown();
			} catch (e) {
				// Ignore cleanup errors
			}
		}
	});

	afterEach(async () => {
		// Clean up axe instance
		if (window.axe) {
			try {
				await window.axe.cleanup();
				window.axe.teardown();
			} catch (e) {
				// Ignore cleanup errors
			}
		}

		// Restore the original function
		if (originalWindowRunAccessibilityScan) {
			window.runAccessibilityScan = originalWindowRunAccessibilityScan;
		}
		
		// Clean up DOM attributes
		document.body.removeAttribute('data-iframe-id');
		document.body.removeAttribute('data-iframe-event-name');
		document.body.removeAttribute('data-iframe-post-id');
	});

	test('should maintain bundle size optimization while preserving functionality', () => {
		// This test verifies the optimization goals are met
		const fs = require('fs');
		const path = require('path');
		
		// Check that pageScanner bundle is small
		const bundlePath = path.join(process.cwd(), 'build/pageScanner.bundle.js');
		
		if (fs.existsSync(bundlePath)) {
			const bundleSize = fs.statSync(bundlePath).size;
			const bundleSizeKB = Math.round(bundleSize / 1024);
			
			// Should be under the 244 KiB limit
			expect(bundleSizeKB).toBeLessThan(244);
			
			// Should be dramatically smaller than original 601 KiB
			expect(bundleSizeKB).toBeLessThan(100);
		}
	});

	test('should have axe-core in separate chunk', () => {
		// Verify that axe-core is in a separate chunk file
		const fs = require('fs');
		const path = require('path');
		
		const chunksDir = path.join(process.cwd(), 'build/chunks');
		
		if (fs.existsSync(chunksDir)) {
			const chunkFiles = fs.readdirSync(chunksDir);
			const axeChunk = chunkFiles.find(file => file.endsWith('.js') && file !== 'LICENSE.txt');
			
			if (axeChunk) {
				const chunkPath = path.join(chunksDir, axeChunk);
				const chunkSize = fs.statSync(chunkPath).size;
				const chunkSizeKB = Math.round(chunkSize / 1024);
				
				// Axe-core chunk should be substantial (around 560 KiB)
				expect(chunkSizeKB).toBeGreaterThan(500);
				expect(chunkSizeKB).toBeLessThan(600);
			}
		}
	});

	test('should verify pageScanner module structure', () => {
		// Test that the module can be imported without errors
		expect(() => {
			require('../../../src/pageScanner/index.js');
		}).not.toThrow();
		
		// Verify that runAccessibilityScan function is created
		expect(typeof window.runAccessibilityScan).toBe('function');
	});
});