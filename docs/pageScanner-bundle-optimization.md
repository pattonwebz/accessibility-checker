# pageScanner Bundle Size Optimization

## Overview

This document describes the optimization implemented to reduce the pageScanner bundle size from 601 KiB to 45 KiB (90% reduction), bringing it well under the performance budget of 244 KiB.

## Problem

The pageScanner bundle was 601 KiB, exceeding the recommended 244 KiB limit for optimal web performance. This was causing webpack build warnings and potentially impacting site performance for users on slower connections.

## Root Cause

The issue was caused by importing the entire axe-core library statically:

```javascript
import 'axe-core';  // This imports the entire 538KB+ library
```

Even though the plugin only uses 8 specific axe-core rules:
- `meta-viewport`
- `blink` 
- `marquee`
- `document-title`
- `tabindex`
- `html-lang-valid`
- `html-has-lang`
- `form-field-multiple-labels`

## Solution: Dynamic Import with Code Splitting

### 1. Dynamic Import Implementation

Replaced the static import with a dynamic import using webpack's code splitting:

```javascript
// Before
import 'axe-core';

// After  
async function loadAxe() {
    if (axeModule) {
        return axeModule;
    }
    
    try {
        const axeCore = await import(/* webpackChunkName: "axe-core" */ 'axe-core');
        axeModule = axeCore.default || axeCore || window.axe;
        return axeModule;
    } catch (error) {
        // Fallback to global axe if dynamic import fails
        if (typeof window !== 'undefined' && window.axe) {
            axeModule = window.axe;
            return axeModule;
        }
        throw new Error('Failed to load axe-core: ' + error.message);
    }
}
```

### 2. Webpack Configuration Updates

Added code splitting configuration to separate axe-core into its own chunk:

```javascript
optimization: {
    splitChunks: {
        cacheGroups: {
            // Separate axe-core into its own chunk for better caching and lazy loading
            axeCore: {
                test: /[\\/]node_modules[\\/]axe-core[\\/]/,
                name: 'axe-core',
                chunks: 'async',
                priority: 10,
            },
        },
    },
},
```

### 3. Performance Budgets

Added performance budgets to prevent future regressions:

```javascript
performance: {
    maxEntrypointSize: 250000, // 244 KiB = ~250KB
    maxAssetSize: 250000,
    hints: 'warning',
    assetFilter: function(assetFilename) {
        // Only enforce size limits on JavaScript bundles
        return assetFilename.endsWith('.js');
    },
},
```

## Results

### Bundle Size Reduction
- **Before**: pageScanner.bundle.js = 601 KiB  
- **After**: pageScanner.bundle.js = 45 KiB
- **Reduction**: 556 KiB (90% smaller)

### Performance Impact
- **Main bundle loading**: 556 KiB faster initial load
- **axe-core loading**: 560 KiB loaded asynchronously only when scanning is initiated
- **Performance budget**: Now well under 244 KiB limit (45 KiB vs 244 KiB limit)

### Build Output
```
pageScanner.bundle.js        45 KiB  (main bundle)
chunks/axe-core.[hash].js    560 KiB (loaded dynamically)
```

## Benefits

1. **Faster Initial Page Load**: 90% reduction in main bundle size
2. **Better User Experience**: axe-core only loads when accessibility scanning is needed
3. **Improved Caching**: axe-core is in a separate chunk that can be cached independently
4. **Performance Budget Compliance**: Main bundle is now 81% under the 244 KiB limit
5. **Future-Proof**: Performance budgets prevent regression

## Testing

Added comprehensive tests to ensure the optimization works correctly:

### Bundle Size Tests (`tests/jest/pageScanner/bundleSize.test.js`)
- Validates main bundle is under performance budget
- Confirms axe-core is split into separate chunk
- Monitors total asset size

### Functional Tests (`tests/jest/pageScanner/dynamicLoading.test.js`)
- Verifies dynamic import implementation
- Confirms webpack configuration is correct
- Validates code structure integrity

## Browser Compatibility

The dynamic import approach is compatible with:
- All modern browsers that support ES2020 dynamic imports
- Webpack automatically provides polyfills for older browsers via babel-loader

## Fallback Strategy

The implementation includes robust fallback mechanisms:
1. **Module Caching**: Loaded axe-core is cached to avoid repeated imports
2. **Global Fallback**: Falls back to `window.axe` if dynamic import fails
3. **Error Handling**: Provides clear error messages for debugging

## Future Optimizations

Potential future improvements:
1. **Selective Rule Import**: Import only the specific axe rules needed (8 vs 100+)
2. **Custom axe Build**: Create a minimal axe build with only required functionality
3. **Service Worker Caching**: Cache axe-core chunk for offline access

## Monitoring

The performance budgets will automatically warn if bundle sizes exceed limits in future builds. The test suite validates bundle structure and size constraints on every test run.