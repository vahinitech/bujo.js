// src/utils/colorScheme.test.js

import { applyColorScheme, SCHEMES } from '../../src/utils/colorScheme.js';

describe('applyColorScheme', () => {
    test('should return the refined color scheme for "color" mode', () => {
        const result = applyColorScheme({}, 'color');
        expect(result).toMatchObject(SCHEMES.color);
        expect(result.textColor).toBe(SCHEMES.color.ink);
        expect(result.lineColor).toBe(SCHEMES.color.line);
        expect(result.highlightColor).toBe(SCHEMES.color.accent);
    });

    test('should return monochrome scheme for non-color mode', () => {
        const result = applyColorScheme({}, 'monochrome');
        expect(result).toMatchObject(SCHEMES.monochrome);
        expect(result.textColor).toBe(SCHEMES.monochrome.ink);
    });

    test('should fall back to monochrome for unknown schemes', () => {
        const result = applyColorScheme({}, 'neon');
        expect(result).toMatchObject(SCHEMES.monochrome);
    });
});
