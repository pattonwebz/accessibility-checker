# Custom Axe-Core Build

This directory contains scripts for customizing the axe-core build to reduce bundle size.

## prune-axe.js

This script runs automatically during `npm install` (via the postinstall hook) and customizes axe-core by:

1. **Removing unused locale files** - Keeps only `_template.json` which serves as the English locale
2. **Documenting rules usage** - Lists the 8 standard axe-core rules that accessibility-checker uses

### Rules Kept

The script preserves these 8 standard axe-core rules that are used by accessibility-checker:

- `meta-viewport` - Ensures viewport meta tag doesn't disable zooming
- `blink` - Ensures blink elements are not used  
- `marquee` - Ensures marquee elements are not used
- `document-title` - Ensures documents have a title
- `tabindex` - Ensures tabindex values are not greater than 0
- `html-lang-valid` - Ensures lang attribute has a valid value
- `html-has-lang` - Ensures html element has a lang attribute
- `form-field-multiple-labels` - Ensures form fields don't have multiple labels

### Integration

The script is automatically run via the `postinstall` hook in package.json:

```json
"postinstall": "patch-package && node scripts/prune-axe.js && ./scripts/prepare.sh"
```

This follows the patch-package pattern for dependency customization while maintaining a minimal footprint.

### Bundle Impact

- Reduces locale files from 12 to 1 (English only)
- Provides foundation for further rule pruning if needed
- Maintains all functionality required by accessibility-checker
- All tests continue to pass (28 test suites, 484 tests)