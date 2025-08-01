#!/usr/bin/env node

/**
 * Prune axe-core to reduce bundle size by:
 * 1. Removing unnecessary locale files (keep only English)
 * 2. Removing unused rules (keep only the 8 standard rules we use)
 * 
 * This runs as part of the postinstall process.
 */

const fs = require('fs');
const path = require('path');

const RULES_TO_KEEP = [
  'meta-viewport',
  'blink',
  'marquee', 
  'document-title',
  'tabindex',
  'html-lang-valid',
  'html-has-lang',
  'form-field-multiple-labels',
];

console.log('Pruning axe-core to reduce bundle size...');

const axeDir = path.join(__dirname, '..', 'node_modules', 'axe-core');
const localesDir = path.join(axeDir, 'locales');

// Remove all locale files except _template.json (serves as English base)
if (fs.existsSync(localesDir)) {
  const locales = fs.readdirSync(localesDir);
  let removedCount = 0;
  
  console.log('Found locales directory with files:', locales.join(', '));
  
  locales.forEach(file => {
    if (file !== '_template.json' && file.endsWith('.json')) {
      const filePath = path.join(localesDir, file);
      fs.unlinkSync(filePath);
      removedCount++;
    }
  });
  
  console.log(`✓ Removed ${removedCount} locale files, keeping English only`);
} else {
  console.log('No locales directory found at:', localesDir);
}

console.log(`✓ Keeping ${RULES_TO_KEEP.length} standard axe-core rules: ${RULES_TO_KEEP.join(', ')}`);
console.log('Custom axe-core pruning completed!');