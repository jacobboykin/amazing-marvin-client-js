module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Allow longer lines in body and footer for generated commit messages
    'body-max-line-length': [0, 'always', 200],
    'footer-max-line-length': [0, 'always', 200],
    // Keep header line reasonable
    'header-max-length': [2, 'always', 72],
    // Subject line should be reasonable
    'subject-max-length': [2, 'always', 50]
  },
  ignores: [
    // Ignore semantic-release commits
    (message) => message.includes('[skip ci]') || message.startsWith('chore(release):')
  ]
};