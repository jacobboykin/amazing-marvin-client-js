# Amazing Marvin Client - Development Commands
# Use `just <command>` to run these commands

# Default recipe to display help
default:
    @just --list

# Install dependencies
install:
    npm ci

# Development workflow
dev:
    npm run dev

# Build the project
build:
    npm run build

# Clean build artifacts
clean:
    npm run clean

# Type checking
typecheck:
    npm run typecheck:all

# Linting
lint:
    npm run lint

# Fix linting issues
lint-fix:
    npm run lint:fix

# Run tests
test:
    npm run test

# Run tests in watch mode
test-watch:
    npm run test:watch

# Run tests with coverage
test-coverage:
    npm run test:coverage

# Full CI pipeline (matches what runs in CI)
ci:
    npm run ci

# Security audit
audit:
    npm audit --audit-level=high

# Commit using commitizen
commit:
    npm run commit

# Prepare package for publishing
prepare-release:
    npm run prepublishOnly

# Test package installation locally
test-install:
    npm pack
    npm install -g ./jacobboykin-amazing-marvin-client-*.tgz
    node -e "console.log('Package installed successfully')"
    npm uninstall -g @jacobboykin/amazing-marvin-client

# Clean up packed files
clean-pack:
    rm -f jacobboykin-amazing-marvin-client-*.tgz

# Complete development setup
setup: install
    pre-commit install

# Run all checks (type, lint, test, build) - useful for pre-commit
check: typecheck lint test-coverage build

# Quick verification before pushing
verify: check audit

# Install pre-commit hooks
install-hooks:
    pre-commit install

# Run pre-commit on all files
run-hooks:
    pre-commit run --all-files