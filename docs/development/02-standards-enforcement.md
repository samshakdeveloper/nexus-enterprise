# Engineering Standards & Enforcement

This document lists the rules the code has to follow and where each one is checked.

| Rule               | Tool           | Checked in                           |
| ------------------ | -------------- | ------------------------------------ |
| Code formatting    | Prettier       | `npm run format`, pre-commit hook    |
| Go formatting      | gofmt          | `npm run format:go`, pre-commit hook |
| Linting and layers | ESLint         | pre-commit hook, CI                  |
| Commit messages    | commitlint     | `commit-msg` hook                    |
| Tests and build    | Vitest, Go     | pre-commit hook, CI                  |
| Merge path         | GitHub Actions | pull requests                        |

## Formatting

Prettier formats TypeScript, JSON and Markdown. The settings are in `.prettierrc`: double quotes, semicolons, 2 spaces, trailing commas, a line width of 120, and LF line endings.

```bash
npm run format          # fix formatting
npm run format:check    # only check
```

The Go code in `apps/pdf-worker` uses gofmt (`npm run format:go` and `npm run format:check:go`).

## Linting

ESLint 9 is configured in [`eslint.config.js`](../../eslint.config.js). The main rules are:

- The type-checked rules from `typescript-eslint`.
- Layer boundaries, which stop inner layers from importing outer ones (see [DDD & Hexagonal Layers](../architecture/02-ddd-hexagonal-layers.md)).
- Import order: built-ins, external packages, internal packages, then relative imports, in alphabetical order with a blank line between groups.
- Unused variables are errors, unless the name starts with `_`.
- `console.log` is a warning in `apps/`. `console.warn`, `console.error` and `console.info` are allowed.

Build output, `node_modules`, config files and `test` folders are not linted.

TypeScript itself runs in strict mode, with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` turned on (see `tsconfig.base.json`).

```bash
npm run lint        # check
npm run lint:fix    # fix what can be fixed
npm run check:all   # format check + lint
npm run fix:all     # format + lint fix
```

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org), checked by commitlint:

```
type(scope): short description
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `revert`.

The scope is optional. If you use one, it has to be one of: `api`, `web`, `domain`, `application`, `infrastructure`, `shared`, `email-worker`, `event-worker`, `pdf-worker`, `monitoring`, `architecture`, `ci`, `root`.

```
feat(api): add refresh token endpoint
fix(event-worker): mark outbox rows only after publishing
docs(architecture): add ADR for the Kafka broker
chore(ci): cache the turbo folder
```

The default rules of the conventional config also apply, for example the length of the first line and no capital letter at the start of the description.

## Git hooks

Husky runs two hooks:

- `pre-commit` runs lint, formatting, the TypeScript tests and the Go tests.
- `commit-msg` checks the commit message with commitlint.

Because the whole test suite runs on every commit, commits can take a while. Some integration tests may start a Postgres container, so keep Docker running.

The hook runs `prettier --write` but does not stage the files it changes. Run `npm run format` before `git add`, so what you commit is what was formatted.

## CI and merging

Two workflows run the checks:

- `ci-feature.yml` runs lint on every push to a feature branch.
- `ci-main.yml` runs on pull requests into `development`, `staging` and `main`. It runs lint, then the TypeScript and Go tests with coverage, then a full build. Draft pull requests skip it until they are marked ready.

A repository ruleset on `development`, `staging` and `main` requires the `Lint Checks` status check to pass before merging.

Changes move in one direction: feature branches go into `development`, `development` goes into `staging`, and `staging` goes into `main`. `enforce-branch-pipeline.yml` rejects any pull request into `staging` that does not come from `development`, and any pull request into `main` that does not come from `staging`.

Before opening a pull request, run:

```bash
npm run check:all && npm run test:all && npm run build
```
