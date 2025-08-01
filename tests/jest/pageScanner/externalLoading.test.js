/**
 * Tests for pageScanner external axe-core loading optimization
 * Validates that the bundle size is significantly reduced while maintaining functionality
 */

import fs from 'fs';
import path from 'path';

describe('PageScanner External Axe-core Loading Optimization', () => {
	const buildPath = path.resolve(__dirname, '../../../build');
	const bundlePath = path.join(buildPath, 'pageScanner.bundle.js');

	test('should dramatically reduce bundle size by loading axe-core externally', () => {
		// Check if build directory and bundle file exist
		expect(fs.existsSync(buildPath)).toBe(true);
		expect(fs.existsSync(bundlePath)).toBe(true);

		// Get bundle size
		const stats = fs.statSync(bundlePath);
		const bundleSizeBytes = stats.size;
		const bundleSizeKB = Math.round(bundleSizeBytes / 1024);

		console.log(`PageScanner bundle size: ${bundleSizeKB} KiB`);

		// Should be well under the 244 KiB webpack limit
		expect(bundleSizeKB).toBeLessThan(244);

		// Should be dramatically smaller than original 601 KiB
		expect(bundleSizeKB).toBeLessThan(100);

		// Should be around 40-50 KiB with external loading
		expect(bundleSizeKB).toBeGreaterThan(30);
		expect(bundleSizeKB).toBeLessThan(60);
	});

	test('should include axe-loader for external axe-core loading', () => {
		const bundleContent = fs.readFileSync(bundlePath, 'utf8');

		// Should include the external loader logic
		expect(bundleContent).toContain('axe-core');
		
		// Should not include the full axe-core library (would contain specific axe strings)
		// This is a basic check - the bundle should be much smaller without axe-core embedded
		expect(bundleContent.length).toBeLessThan(100000); // Less than 100KB of content
	});

	test('should maintain module structure without dynamic imports', () => {
		const bundleContent = fs.readFileSync(bundlePath, 'utf8');

		// Should not contain dynamic import syntax since user wanted to avoid it
		expect(bundleContent).not.toContain('import(');
		
		// Bundle should contain the external axe loader
		expect(bundleContent).toContain('axe-core');
		
		// Should be significantly smaller than the original with embedded axe-core
		expect(bundleContent.length).toBeLessThan(200000); // Less than 200KB content
	});
});