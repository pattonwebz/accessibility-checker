/**
 * Utility functions for creating unique fingerprints for accessibility violations
 * to improve issue identification and tracking across scans.
 */

import { normalizeText } from '../helpers/helpers.js';

/**
 * CSS.escape polyfill for environments where it's not available
 * @param {string} value - String to escape
 * @return {string} Escaped string
 */
function cssEscape( value ) {
	if ( typeof CSS !== 'undefined' && CSS.escape ) {
		return CSS.escape( value );
	}

	// Polyfill for CSS.escape
	return value.replace( /[!"#$%&'()*+,.\/:;<=>?@[\]^`{|}~]/g, '\\$&' );
}

/**
 * Generate a stable hash from a string using djb2 algorithm
 * @param {string} str - String to hash
 * @return {number} Hash value
 */
function simpleHash( str ) {
	let hash = 5381;
	for ( let i = 0; i < str.length; i++ ) {
		hash = ( ( hash * 33 ) + str.charCodeAt( i ) ) % Number.MAX_SAFE_INTEGER;
	}
	return Math.abs( hash );
}

/**
 * Get stable characteristics of an element for fingerprinting
 * @param {HTMLElement} element - Element to analyze
 * @return {Object} Object containing stable element characteristics
 */
function getElementCharacteristics( element ) {
	if ( ! element ) {
		return {};
	}

	const tagName = element.tagName.toLowerCase();
	const textContent = normalizeText( element.textContent || '' );
	const attributes = {};

	// Collect stable attributes (not dynamic ones)
	const stableAttributes = [
		'id', 'class', 'role', 'type', 'name', 'src', 'href', 'alt',
		'title', 'placeholder', 'aria-label', 'aria-labelledby',
		'aria-describedby', 'data-testid', 'for', 'value',
	];

	stableAttributes.forEach( ( attr ) => {
		const value = element.getAttribute( attr );
		if ( value !== null ) {
			attributes[ attr ] = value;
		}
	} );

	return {
		tagName,
		textContent: textContent.substring( 0, 100 ), // Limit text content length
		attributes,
		hasChildren: element.children.length > 0,
		childCount: element.children.length,
	};
}

/**
 * Get contextual information about element's position and surroundings
 * @param {HTMLElement} element - Element to analyze
 * @return {Object} Contextual information
 */
function getElementContext( element ) {
	if ( ! element ) {
		return {};
	}

	const parent = element.parentElement;
	const previousSibling = element.previousElementSibling;
	const nextSibling = element.nextElementSibling;

	return {
		parentTag: parent ? parent.tagName.toLowerCase() : null,
		parentId: parent ? parent.id : null,
		parentClass: parent ? parent.className : null,
		siblingIndex: parent ? Array.from( parent.children ).indexOf( element ) : -1,
		totalSiblings: parent ? parent.children.length : 0,
		previousSiblingTag: previousSibling ? previousSibling.tagName.toLowerCase() : null,
		nextSiblingTag: nextSibling ? nextSibling.tagName.toLowerCase() : null,
	};
}

/**
 * Generate enhanced DOM path with better stability and uniqueness
 * @param {HTMLElement} element - Element to generate path for
 * @return {string} Enhanced DOM path
 */
export function generateEnhancedDOMPath( element ) {
	if ( ! element ) {
		return '';
	}

	const path = [];
	let current = element;

	while ( current && current.nodeType === Node.ELEMENT_NODE && current !== document.body ) {
		let selector = current.nodeName.toLowerCase();

		// Use ID if available and appears to be stable (not auto-generated)
		if ( current.id && ! current.id.match( /^(wp-|js-|css-|auto-|temp-|gen-|\d+$)/ ) ) {
			selector = `#${ cssEscape( current.id ) }`;
			path.unshift( selector );
			break; // ID is unique, stop here
		}

		// Add stable classes (filter out dynamic ones)
		if ( current.className ) {
			const stableClasses = current.className.trim().split( /\s+/ )
				.map( ( cls ) => cssEscape( cls ) )
				.filter( ( cls ) => {
					// Filter out likely dynamic classes
					return ! cls.match( /^(wp-|js-|css-|generated-|dynamic-|random-|temp-|\d+$|.*-\d{4,}$)/ );
				} )
				.slice( 0, 3 ); // Limit to first 3 stable classes

			if ( stableClasses.length > 0 ) {
				selector += `.${ stableClasses.join( '.' ) }`;
			}
		}

		// Add stable attributes for better identification
		const stableAttrs = [ 'role', 'type', 'name', 'data-testid' ];
		stableAttrs.forEach( ( attr ) => {
			const value = current.getAttribute( attr );
			if ( value && ! value.match( /^(temp-|auto-|gen-|\d+$)/ ) ) {
				selector += `[${ attr }="${ cssEscape( value ) }"]`;
			}
		} );

		// Use semantic positioning only as a last resort
		const parent = current.parentElement;
		if ( parent && ! current.id && ! current.className ) {
			const siblings = Array.from( parent.children ).filter( ( child ) =>
				child.nodeName === current.nodeName
			);
			if ( siblings.length > 1 ) {
				const index = siblings.indexOf( current ) + 1;
				selector += `:nth-of-type(${ index })`;
			}
		}

		path.unshift( selector );
		current = current.parentElement;

		// Limit path depth to avoid overly complex selectors
		if ( path.length >= 5 ) {
			break;
		}
	}

	return path.length ? path.join( ' > ' ) : '';
}

/**
 * Create a unique fingerprint for an accessibility violation
 * @param {string}      ruleId   - Accessibility rule ID
 * @param {HTMLElement} element  - Element that has the violation
 * @param {string}      selector - CSS selector for the element
 * @return {string} Unique fingerprint hash
 */
export function generateViolationFingerprint( ruleId, element, selector ) {
	const elementChars = getElementCharacteristics( element );
	const context = getElementContext( element );

	// Create a stable fingerprint based on multiple factors
	const fingerprintData = {
		ruleId,
		selector: selector || '',
		tagName: elementChars.tagName,
		textContent: elementChars.textContent,
		attributes: elementChars.attributes,
		parentTag: context.parentTag,
		parentId: context.parentId,
		siblingIndex: context.siblingIndex,
		totalSiblings: context.totalSiblings,
	};

	// Create a deterministic string from the fingerprint data
	const fingerprintString = JSON.stringify( fingerprintData, Object.keys( fingerprintData ).sort() );
	const hash = simpleHash( fingerprintString );

	// Return a human-readable hash format
	return `${ ruleId }-${ hash.toString( 16 ) }`;
}

/**
 * Generate additional metadata for enhanced issue identification
 * @param {HTMLElement} element - Element to analyze
 * @return {Object} Additional metadata
 */
export function generateViolationMetadata( element ) {
	if ( ! element ) {
		return {};
	}

	const characteristics = getElementCharacteristics( element );
	const context = getElementContext( element );

	// Calculate element's position in document flow
	let documentPosition = 0;
	const allElements = document.querySelectorAll( '*' );
	for ( let i = 0; i < allElements.length; i++ ) {
		if ( allElements[ i ] === element ) {
			documentPosition = i;
			break;
		}
	}

	return {
		elementCharacteristics: characteristics,
		contextualInfo: context,
		documentPosition,
		timestamp: Date.now(),
		enhancedPath: generateEnhancedDOMPath( element ),
	};
}
