# ADR-003: Use Nodemailer behind an email provider port

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

When a new user signs up, we send them a welcome email (and a verification code, if there is one). The `email-worker` handles this: it reads the `USER_CREATED` event from Kafka, uses Redis to skip events it has already processed, sends the email, and then publishes `EMAIL_SENT` or `EMAIL_FAILED` back to Kafka.

We had to decide how the sending itself would work. Two things mattered to us from the start:

1. We didn't want to reinvent the wheel for something this common, and we didn't want to tie ourselves to one vendor.
2. We don't know how email will go out in the long run. A plain SMTP server is enough today, but we might move to SES, SendGrid or something else later, and we don't want to rewrite the worker when that day comes.

The project already follows Hexagonal Architecture (Ports & Adapters), so it was clear where this decision should live.

## Decision

We use **Nodemailer** to send email. It is the de facto standard library for this in Node.js: it has been around for years, it is widely used, answers to most questions are easy to find, and it works with any SMTP server.

The more important part is that we don't call Nodemailer directly from the handler. There is a port:

```ts
// ports/email-provider.port.ts
export interface IEmailProviderPort {
  send(payload: SendEmailPayload): Promise<void>;
}
```

Nodemailer is just one implementation of it (`adapters/nodemailer.adapter.ts`). Connection settings (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`) come from `env.ts` and are validated with Zod.

If we ever want to change the library or the sending service, the plan is to write a new adapter that implements the same interface and swap it in where Nodemailer is created in `email-worker.ts`. The handler logic (idempotency, offset commits, event publishing) should not need to change.

Environments are kept apart in the same spirit. In dev we run a Mailpit instance inside the cluster that catches all mail and gives us a web UI. In prod the real SMTP credentials come from the `nexus-smtp` Secret, which is built from Vault through ExternalSecrets. The code is identical in both; only the env differs.

## Alternatives considered

**A vendor SDK (SES, SendGrid, etc.) from day one.** We would have reached vendor-specific features sooner, but we'd have been tied to that vendor from the start and would have needed a separate way to fake it in dev. SMTP plus Mailpit keeps local development simple. If we move to one of these SDKs later, the adapter is where it goes.

**Talking to SMTP ourselves, or using a smaller library.** Not worth it. Building proper HTML emails, handling encoding and headers, and managing secure connections are all details Nodemailer has already solved.

**Calling Nodemailer straight from the handler, with no port.** This was the simplest option and would have worked at first, but it makes the handler harder to test and creates exactly the lock-in we were trying to avoid.

## Consequences

**The good**

- Changing the email provider is limited to writing a new adapter, not rewriting the worker.
- The handler is easy to test. Unit tests pass a mock with a `send` method instead of sending real mail (we already do this in `email-worker-handler.spec.ts`).
- Dev and local work need no real email, only Mailpit.

**Things to watch**

- **The decoupling isn't complete yet.** `EmailWorkerHandler` currently imports the `NodemailerAdapter` type directly instead of `IEmailProviderPort`. Until we fix that, swapping the adapter will also mean touching the handler, which undercuts the point of this ADR. The fix is small (type the constructor parameter with the interface) and should be done soon.
- The port only knows about `to`, `subject` and `html`. Attachments, cc/bcc and templates are not part of the contract. When we need them, we should extend the contract on purpose rather than let Nodemailer-specific features leak through the port.
- The sender address (`from`) is hardcoded inside the adapter rather than read from env. It needs to be configurable per environment.
- Nodemailer only sends. Retries, backoff and the DLQ are on us to build in the worker, and this decision doesn't solve any of that.
- We take on one more runtime dependency (`nodemailer`) and need to keep up with its security updates.

## Follow-ups

- [ ] Change `EmailWorkerHandler` to depend on `IEmailProviderPort` instead of `NodemailerAdapter`.
- [ ] Move the sender address to env.
- [ ] Check and set the `secure` option explicitly for the SMTP connection (the default port is 465).
- [ ] If we switch providers, write a new ADR and mark this one `Superseded`.
