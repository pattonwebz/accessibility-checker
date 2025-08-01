/**
 * Axe-core external loader
 * This script loads axe-core from CDN to keep the main bundle size small
 * while maintaining all accessibility checking functionality.
 */

(function() {
	'use strict';

	// Check if axe is already loaded
	if (typeof window.axe !== 'undefined') {
		return;
	}

	// Load axe-core from CDN
	const script = document.createElement('script');
	script.src = 'https://cdn.jsdelivr.net/npm/axe-core@4.8.2/axe.min.js';
	script.async = false; // Load synchronously to ensure axe is available
	script.onload = function() {
		console.log('Axe-core loaded externally');
	};
	script.onerror = function() {
		console.error('Failed to load axe-core from CDN');
	};
	
	// Insert before any existing scripts
	const firstScript = document.getElementsByTagName('script')[0];
	if (firstScript) {
		firstScript.parentNode.insertBefore(script, firstScript);
	} else {
		document.head.appendChild(script);
	}
})();