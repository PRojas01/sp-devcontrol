# Contributing to SP-DevControl

Thank you for considering contributing! This project aims to be the governance layer for AI-assisted development, and every contribution helps.

## Code of Conduct

Be respectful, constructive, and professional. We enforce a zero-tolerance policy for harassment.

## How to Contribute

### Reporting Bugs

1. Search existing issues to avoid duplicates
2. Include: OS version, Node version, reproduction steps, expected vs actual behavior
3. Attach relevant logs from `.devcontrol/storage/` or console output

### Suggesting Features

1. Describe the problem you're solving, not just the solution
2. Explain how it fits the governance-for-AI-development mission
3. Include examples of how the feature would work end-to-end

### Pull Requests

1. Fork the repository
2. Create a branch from `main`: `git checkout -b feat/your-feature`
3. Follow code conventions (see below)
4. Write tests for new functionality
5. Ensure all tests pass: `npm test`
6. Run typecheck: `npm run typecheck`
7. Commit with conventional commits format (see below)
8. Open a PR against `main`

## Code Conventions

- **Language**: TypeScript strict mode, ESM modules
- **Formatting**: 2-space indentation, semicolons, single quotes
- **Naming**: camelCase for variables/functions, PascalCase for types/classes
- **Imports**: group by: 1) built-in, 2) external, 3) internal, 4) types
- **Types**: prefer interfaces over type aliases for object shapes
- **Async**: use async/await, avoid raw promises
- **Error handling**: use specific error messages, avoid catch-all
- **File structure**: one primary export per module

## Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add approval gate for protected paths
fix: correct Windows path normalization in hooks
docs: update MCP integration guide
test: add compliance engine tests
chore: update dependencies
```

## Test Convention

- Use Vitest (`describe`/`it`/`expect`)
- Use `mkdtempSync` + `rmSync` for temp directories
- Import from `.js` extensions (compiled output)
- One `describe` block per module, one `it` per scenario

## Project Structure

```
src/           — TypeScript source
  catalog/     — Control definitions
  cli.ts       — CLI entry point (37 commands)
tests/         — Test files (mirror src/ structure)
docs/          — Project documentation
release/       — Standalone binaries (gitignored)
```

## Questions?

Open a GitHub Discussion or check the [README](README.md) for quickstart.
