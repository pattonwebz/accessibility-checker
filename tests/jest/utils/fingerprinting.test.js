/**
 * Tests for fingerprinting utility functions
 */
import { generateViolationFingerprint, generateViolationMetadata, generateEnhancedDOMPath } from '../../../src/pageScanner/utils/fingerprinting';

describe( 'Fingerprinting Utilities', () => {
	beforeEach( () => {
		document.body.innerHTML = '';
	} );

	describe( 'generateViolationFingerprint', () => {
		test( 'should generate consistent fingerprints for same element and rule', () => {
			document.body.innerHTML = '<button id="test-btn">Click me</button>';
			const element = document.getElementById( 'test-btn' );

			const fingerprint1 = generateViolationFingerprint( 'button-name', element, '#test-btn' );
			const fingerprint2 = generateViolationFingerprint( 'button-name', element, '#test-btn' );

			expect( fingerprint1 ).toBe( fingerprint2 );
			expect( fingerprint1 ).toMatch( /^button-name-[a-f0-9]+$/ );
		} );

		test( 'should generate different fingerprints for different rules', () => {
			document.body.innerHTML = '<button id="test-btn">Click me</button>';
			const element = document.getElementById( 'test-btn' );

			const fingerprint1 = generateViolationFingerprint( 'button-name', element, '#test-btn' );
			const fingerprint2 = generateViolationFingerprint( 'color-contrast', element, '#test-btn' );

			expect( fingerprint1 ).not.toBe( fingerprint2 );
		} );

		test( 'should generate different fingerprints for different elements', () => {
			document.body.innerHTML = `
				<button id="btn1">Button 1</button>
				<button id="btn2">Button 2</button>
			`;
			const element1 = document.getElementById( 'btn1' );
			const element2 = document.getElementById( 'btn2' );

			const fingerprint1 = generateViolationFingerprint( 'button-name', element1, '#btn1' );
			const fingerprint2 = generateViolationFingerprint( 'button-name', element2, '#btn2' );

			expect( fingerprint1 ).not.toBe( fingerprint2 );
		} );

		test( 'should handle elements without IDs', () => {
			document.body.innerHTML = '<button class="test-btn">Click me</button>';
			const element = document.querySelector( '.test-btn' );

			const fingerprint = generateViolationFingerprint( 'button-name', element, '.test-btn' );

			expect( fingerprint ).toMatch( /^button-name-[a-f0-9]+$/ );
		} );

		test( 'should handle null element gracefully', () => {
			const fingerprint = generateViolationFingerprint( 'button-name', null, 'missing-selector' );

			expect( fingerprint ).toMatch( /^button-name-[a-f0-9]+$/ );
		} );
	} );

	describe( 'generateEnhancedDOMPath', () => {
		test( 'should prefer ID-based selectors', () => {
			document.body.innerHTML = '<div id="container"><button id="my-button">Click</button></div>';
			const element = document.getElementById( 'my-button' );

			const path = generateEnhancedDOMPath( element );

			expect( path ).toBe( '#my-button' );
		} );

		test( 'should filter out dynamic classes', () => {
			document.body.innerHTML = '<div><button class="stable-class wp-dynamic js-temp">Click</button></div>';
			const element = document.querySelector( 'button' );

			const path = generateEnhancedDOMPath( element );

			expect( path ).toContain( 'stable-class' );
			expect( path ).not.toContain( 'wp-dynamic' );
			expect( path ).not.toContain( 'js-temp' );
		} );

		test( 'should include stable attributes', () => {
			document.body.innerHTML = '<div><input type="email" name="user-email" role="textbox"></div>';
			const element = document.querySelector( 'input' );

			const path = generateEnhancedDOMPath( element );

			expect( path ).toContain( 'type="email"' );
			expect( path ).toContain( 'name="user-email"' );
			expect( path ).toContain( 'role="textbox"' );
		} );

		test( 'should use nth-of-type for similar elements without unique identifiers', () => {
			document.body.innerHTML = `
				<ul>
					<li>Item 1</li>
					<li>Item 2</li>
					<li>Item 3</li>
				</ul>
			`;
			const secondItem = document.querySelectorAll( 'li' )[ 1 ];

			const path = generateEnhancedDOMPath( secondItem );

			expect( path ).toContain( 'li:nth-of-type(2)' );
		} );

		test( 'should limit path depth', () => {
			document.body.innerHTML = `
				<div><div><div><div><div><div>
					<button>Deep button</button>
				</div></div></div></div></div></div>
			`;
			const element = document.querySelector( 'button' );

			const path = generateEnhancedDOMPath( element );
			const pathSegments = path.split( ' > ' );

			expect( pathSegments.length ).toBeLessThanOrEqual( 5 );
		} );

		test( 'should handle null element', () => {
			const path = generateEnhancedDOMPath( null );

			expect( path ).toBe( '' );
		} );
	} );

	describe( 'generateViolationMetadata', () => {
		test( 'should extract element characteristics', () => {
			document.body.innerHTML = '<button id="test" class="btn primary" aria-label="Submit form">Submit</button>';
			const element = document.getElementById( 'test' );

			const metadata = generateViolationMetadata( element );

			expect( metadata.elementCharacteristics ).toMatchObject( {
				tagName: 'button',
				textContent: 'submit',
				hasChildren: false,
				childCount: 0,
			} );

			expect( metadata.elementCharacteristics.attributes ).toMatchObject( {
				id: 'test',
				class: 'btn primary',
				'aria-label': 'Submit form',
			} );
		} );

		test( 'should include contextual information', () => {
			document.body.innerHTML = `
				<form id="contact-form">
					<input type="text" name="name">
					<button type="submit">Submit</button>
					<button type="reset">Reset</button>
				</form>
			`;
			const submitButton = document.querySelector( 'button[type="submit"]' );

			const metadata = generateViolationMetadata( submitButton );

			expect( metadata.contextualInfo ).toMatchObject( {
				parentTag: 'form',
				parentId: 'contact-form',
				siblingIndex: 1, // Second child (after input)
				totalSiblings: 3,
				nextSiblingTag: 'button',
			} );
		} );

		test( 'should include enhanced path', () => {
			document.body.innerHTML = '<div><button id="my-btn">Click</button></div>';
			const element = document.getElementById( 'my-btn' );

			const metadata = generateViolationMetadata( element );

			expect( metadata.enhancedPath ).toBe( '#my-btn' );
		} );

		test( 'should include timestamp and document position', () => {
			document.body.innerHTML = '<button>Test</button>';
			const element = document.querySelector( 'button' );

			const metadata = generateViolationMetadata( element );

			expect( metadata.timestamp ).toBeGreaterThan( 0 );
			expect( typeof metadata.documentPosition ).toBe( 'number' );
		} );

		test( 'should handle null element', () => {
			const metadata = generateViolationMetadata( null );

			expect( metadata ).toEqual( {} );
		} );
	} );

	describe( 'Integration with different HTML structures', () => {
		test( 'should work with complex nested structures', () => {
			document.body.innerHTML = `
				<header>
					<nav role="navigation" aria-label="Main navigation">
						<ul class="nav-list">
							<li><a href="/home">Home</a></li>
							<li><a href="/about">About</a></li>
						</ul>
					</nav>
				</header>
			`;
			const aboutLink = document.querySelector( 'a[href="/about"]' );

			const fingerprint = generateViolationFingerprint( 'link-name', aboutLink, 'a[href="/about"]' );
			const path = generateEnhancedDOMPath( aboutLink );
			const metadata = generateViolationMetadata( aboutLink );

			expect( fingerprint ).toMatch( /^link-name-[a-f0-9]+$/ );
			expect( path ).toContain( 'nav[role="navigation"]' );
			expect( metadata.elementCharacteristics.tagName ).toBe( 'a' );
		} );

		test( 'should handle form elements appropriately', () => {
			document.body.innerHTML = `
				<form>
					<label for="email">Email:</label>
					<input type="email" id="email" name="email" required>
					<button type="submit">Submit</button>
				</form>
			`;
			const emailInput = document.getElementById( 'email' );

			const fingerprint = generateViolationFingerprint( 'label', emailInput, '#email' );
			const path = generateEnhancedDOMPath( emailInput );

			expect( fingerprint ).toMatch( /^label-[a-f0-9]+$/ );
			expect( path ).toBe( '#email' );
		} );
	} );
} );
