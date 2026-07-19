// src/utils/colorScheme.js

/**
 * Refined palettes for the generated journal.
 *
 * Each scheme exposes semantic roles rather than raw colors so page
 * layouts stay consistent across schemes:
 *   ink    – primary text
 *   accent – headings, rules and highlights
 *   subtle – secondary text (labels, page numbers)
 *   line   – ruled lines and grid strokes
 *   faint  – dot grids and background strokes
 *   wash   – very light fills (cells, bands)
 */
const SCHEMES = {
    color: {
        ink: '#232B36',
        accent: '#39657F',
        subtle: '#7C8794',
        line: '#C9D2DC',
        faint: '#DDE4EB',
        wash: '#F3F6F9'
    },
    monochrome: {
        ink: '#1A1A1A',
        accent: '#2E2E2E',
        subtle: '#6E6E6E',
        line: '#CFCFCF',
        faint: '#E0E0E0',
        wash: '#F4F4F4'
    }
};

/**
 * Applies a color scheme based on user preference.
 * @param {Object} doc - The jsPDF document instance (unused, kept for API compatibility).
 * @param {string} colorScheme - The color scheme ('color' or 'monochrome').
 * @returns {Object} colors - Semantic colors plus legacy textColor/lineColor/highlightColor aliases.
 */
function applyColorScheme(doc, colorScheme) {
    const scheme = colorScheme === 'color' ? SCHEMES.color : SCHEMES.monochrome;
    return {
        ...scheme,
        // Legacy aliases kept for backwards compatibility.
        textColor: scheme.ink,
        lineColor: scheme.line,
        highlightColor: scheme.accent
    };
}

export { applyColorScheme, SCHEMES };
