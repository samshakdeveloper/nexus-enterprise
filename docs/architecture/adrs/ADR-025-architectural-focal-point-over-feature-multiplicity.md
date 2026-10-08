# ADR-008: Keep domain use cases few to keep the focus on architecture

- **Status:** Accepted
- **Date:** 2026-10-08 

## Context

This repository exists to demonstrate architecture and infrastructure:
layer boundaries, event-driven communication, observability, and
deployment. A large number of similar business use cases (for example many
CRUD operations) would add code to read without adding new architectural
evidence.

## Decision

We keep the number of domain use cases small and deliberate.

- Each use case should demonstrate something the existing ones do not.
- The set may grow over time, up to roughly ten use cases, but it will not
  grow into a broad feature catalog.
- Effort goes into the foundations instead: enforced layer boundaries,
  transactional outbox with Kafka, observability, and deployment.

## Consequences

**Positive**

- A small codebase where every pattern can be followed end to end without
  repetitive code.
- Existing use cases serve as reference templates for new ones.

**Negative / trade-offs**

- The system may look functionally small to someone expecting a full
  product. This ADR explains that this is intentional.
- Behavior under more complex domain needs (such as pagination or complex
  authorization rules) is not demonstrated here.

## Alternatives considered

- **Many CRUD use cases:** shows breadth, but repeats the same patterns and
  hides the architectural focus.