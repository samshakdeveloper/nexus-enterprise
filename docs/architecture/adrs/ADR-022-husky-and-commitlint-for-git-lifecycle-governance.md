# ADR-022: Use Husky and Commitlint for Git lifecycle governance

- **Status:** Accepted
- **Date:** 2026-10-08 

## Context

Quality rules (formatting, lint, tests, commit message format, branch flow)
are only useful if they are applied consistently, and it is cheaper to
catch problems before they reach the shared repository than in review or
CI.

## Decision

We enforce standards at three points:

- **Git hooks with Husky** (installed through the `prepare` script). The
  `pre-commit` hook runs linting, formatting, and tests for the TypeScript
  and Go code.
- **Commit messages with Commitlint** in the `commit-msg` hook, using the
  Conventional Commits format with an allowed list of types (`feat`, `fix`,
  `docs`, `refactor`, `test`, `chore`, and others) and of scopes that match
  the workspaces (`api`, `domain`, `application`, `infrastructure`, and so
  on).
- **Branch flow in CI:** a workflow rejects pull requests unless they follow
  `development` → `staging` → `main`.

## Consequences

**Positive**

- Consistent code style and commit history, which also enables automated
  changelogs and clearer reviews.
- Many problems are caught locally, before CI.
- Scopes tie each change to a part of the monorepo.

**Negative / trade-offs**

- The `pre-commit` hook currently runs the whole lint, format, and test
  suite on every commit, which is slow. A `.lintstagedrc.json` exists but
  is not used by the hook. Staged-file checks belong in `pre-commit`, and
  full tests in `pre-push` or CI.
- Hooks can be skipped (`--no-verify`), so CI must remain the authoritative
  check, and the branch flow should also be protected with GitHub branch
  rules.
- The scope list must be kept in sync as new areas appear (for example
  `contracts`, `k8s`, `platform`, `docs`).

## Alternatives considered

- **CI-only checks:** nothing to install, but slower feedback and noisy
  failed pipelines.
- **lint-staged only, no commit message rules:** faster, but leaves commit
  history unstructured.
- **Free-form commit messages:** no setup, but no automation or consistency.