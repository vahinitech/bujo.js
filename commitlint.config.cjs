module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat',    // A new feature
      'fix',     // A bug fix
      'docs',    // Documentation changes
      'style',   // Code style changes (formatting, whitespace)
      'refactor', // Code refactoring (no feature or bug fix)
      'perf',    // Performance improvements
      'test',    // Adding or fixing tests
      'build',   // Changes affecting the build system or dependencies
      'ci',      // Changes to CI/CD configuration
      'chore',   // Minor changes not impacting code (e.g., tool changes)
    ]],
    'subject-case': [
      2,
      'always',
      ['sentence-case', 'start-case', 'lower-case', 'upper-case']  // Allow multiple cases
    ],
    'subject-min-length': [2, 'always', 10],
    'footer-max-line-length': [2, 'always', 100]
  }
};
