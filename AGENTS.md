# Repository Guidelines

## Project Structure & Module Organization

The app is a build-free static site. `index.html` contains the application shell, while browser modules live in `src/`. Detection, metadata, C2PA verification, conversion, and verdict logic are top-level modules. Frequency transforms and Worker code are under `src/frequency/`; batch queue, reporting, conversion, ZIP, and UI modules are under `src/batch/`. Tests use Node's built-in runner in `test/`. Documentation and screenshots live in `docs/`; vendored third-party assets belong in `vendor/`.

## Build, Test, and Development Commands

- `python -m http.server 8000` serves the repository at `http://localhost:8000`. HTTP is required for ES modules and Web Workers.
- `npm test` runs all `node:test` unit tests.
- `node --check src/main.js` performs a quick syntax check; run it for every changed JavaScript entry point.
- `git diff --check` detects whitespace errors before committing.

There is no compile or bundle step.

## Coding Style & Naming Conventions

Use four-space indentation, semicolons, single-quoted JavaScript strings, and ES module imports. Prefer small pure helpers for parsing, scoring, serialization, and filename handling. Use `camelCase` for functions and variables, `UPPER_SNAKE_CASE` for constants, and kebab-case file names. Keep DOM ownership in UI modules and Worker-safe computation free of browser globals. Add translations to both `zh` and `en` entries in `src/i18n.js`.

## Testing Guidelines

Name tests `test/<area>.test.js` and describe observable behavior. Add regression tests for malformed files, numeric invariants, cancellation, and independent batch failures. Browser-facing changes also require a local smoke test in desktop and mobile viewports. Never depend on network access in unit tests.

## Commit & Pull Request Guidelines

History follows concise Conventional Commit subjects such as `feat:`, `fix:`, and `chore:`. Keep commits scoped and imperative. Pull requests should explain behavior changes, list verification commands, link relevant issues, and include screenshots for visible UI changes.

## Security & Configuration

Image bytes must remain client-side. Do not commit keys, user images, temporary browser profiles, or downloaded test artifacts. Treat C2PA verification as stronger evidence than heuristic pixel analysis, and document any new external CDN dependency.
