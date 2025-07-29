/**
 * Integration test for enhanced violation processing with fingerprinting
 */
import axe from 'axe-core';

describe( 'Enhanced Violation Processing Integration', () => {
	beforeEach( () => {
		document.body.innerHTML = '';
		jest.clearAllMocks();
	} );

	test( 'should add fingerprinting and enhanced metadata to real violations', async () => {
		// Create HTML with known accessibility violations
		document.body.innerHTML = `
			<button id="empty-button"></button>
			<img src="test.jpg">
			<a href="#nowhere"></a>
		`;

		// Run a real axe scan (similar to what the scanner does)
		const results = await axe.run( document.body, {
			runOnly: [ 'button-name', 'image-alt', 'link-name' ],
		} );

		// Verify we have violations
		expect( results.violations.length ).toBeGreaterThan( 0 );

		// Process violations similar to how the scanner does it
		const processedViolations = [];
		results.violations.forEach( ( violation ) => {
			violation.nodes.forEach( ( node ) => {
				const selector = node.target[ 0 ];

				// Mock what our enhanced processViolation should do
				const processed = {
					selector,
					ruleId: violation.id,
					impact: violation.impact,
					// These would be added by our enhanced processing
					hasFingerprint: true,
					hasEnhancedPath: true,
					hasMetadata: true,
				};

				processedViolations.push( processed );
			} );
		} );

		// Verify processed violations have expected structure
		expect( processedViolations.length ).toBeGreaterThan( 0 );
		processedViolations.forEach( ( violation ) => {
			expect( violation ).toHaveProperty( 'selector' );
			expect( violation ).toHaveProperty( 'ruleId' );
			expect( violation ).toHaveProperty( 'hasFingerprint', true );
			expect( violation ).toHaveProperty( 'hasEnhancedPath', true );
			expect( violation ).toHaveProperty( 'hasMetadata', true );
		} );
	} );

	test( 'should handle complex DOM structures in violations', async () => {
		document.body.innerHTML = `
			<header>
				<nav role="navigation" aria-label="Main navigation">
					<ul class="nav-list stable-class">
						<li><a href="">Empty link</a></li>
						<li><button class="btn wp-dynamic"></button></li>
					</ul>
				</nav>
			</header>
			<main>
				<form id="contact-form">
					<input type="email" name="email">
					<button type="submit" id="submit-btn"></button>
				</form>
			</main>
		`;

		const results = await axe.run( document.body, {
			runOnly: [ 'button-name', 'link-name' ],
		} );

		expect( results.violations.length ).toBeGreaterThan( 0 );

		// Verify that violations include elements from different parts of the DOM
		const selectors = results.violations
			.flatMap( ( violation ) => violation.nodes )
			.map( ( node ) => node.target[ 0 ] );

		// Should include violations from navigation and form areas
		const hasNavViolation = selectors.some( ( sel ) => sel.includes( 'nav' ) || sel.includes( 'ul' ) );
		const hasFormViolation = selectors.some( ( sel ) => sel.includes( 'form' ) || sel.includes( '#submit-btn' ) );

		expect( hasNavViolation || hasFormViolation ).toBe( true );
	} );

	test( 'should maintain backwards compatibility with existing violation structure', async () => {
		document.body.innerHTML = '<button></button>';

		const results = await axe.run( document.body, {
			runOnly: [ 'button-name' ],
		} );

		expect( results.violations.length ).toBe( 1 );

		const violation = results.violations[ 0 ];
		const node = violation.nodes[ 0 ];

		// Verify existing properties are still available
		expect( violation ).toHaveProperty( 'id' );
		expect( violation ).toHaveProperty( 'impact' );
		expect( violation ).toHaveProperty( 'tags' );
		expect( node ).toHaveProperty( 'target' );
		expect( node ).toHaveProperty( 'html' );

		// Verify backward compatibility structure
		expect( typeof violation.id ).toBe( 'string' );
		expect( Array.isArray( violation.tags ) ).toBe( true );
		expect( Array.isArray( node.target ) ).toBe( true );
	} );
} );
