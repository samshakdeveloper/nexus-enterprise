# ADR-023: Use eslint-plugin-boundaries to enforce hexagonal layers

- **Status:** Accepted
- **Date:** 2026-10-08 

## Context

Clean and hexagonal architectures only work if dependencies point inward.
Documentation and code review alone do not stop an accidental import from
the domain into infrastructure; over time the layers erode.

## Decision

We encode the dependency rules as lint errors with
**eslint-plugin-boundaries**, configured in the root ESLint setup:

- Each workspace is an element: `domain`, `application`, `infrastructure`,
  `shared`, and `app`.
- Allowed dependencies (everything else is disallowed by default):
    - `domain` → `shared`
    - `application` → `domain`, `shared`
    - `infrastructure` → `application`, `domain`, `shared`
    - `shared` → nothing
    - `app` → `infrastructure`, `application`, `domain`, `shared`
- The rule runs together with type-aware TypeScript linting in the
  pre-commit hook and in CI, so violations block merges.

## Consequences

**Positive**

- The architecture is checked automatically instead of relying on reviewers.
- New contributors get immediate feedback when they break a boundary.
- The rules are short, readable, and version-controlled.

**Negative / trade-offs**

- This is static analysis at lint time, not a compiler guarantee; it can be
  disabled with comments if not reviewed.
- Rules apply at the package level. Layers inside an app (for example
  presentation versus the container in `apps/api`) are not checked.
- Third-party imports are not restricted, so a framework import in the
  domain would not be caught by this rule alone; a restricted-imports rule
  can be added.
- Test folders are excluded from linting, so they are not covered.

## Alternatives considered

- **dependency-cruiser:** powerful graph analysis and reports, but a
  separate tool and configuration from the linter we already run.
- **Nx module boundary rules:** similar idea, but would require adopting Nx.
- **Convention and code review only:** no tooling, but violations appear
  gradually and unnoticed.