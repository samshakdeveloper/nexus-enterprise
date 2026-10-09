# ADR-002: Generate the GraphQL API from OpenAPI with GraphQL Mesh

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

The API is a REST API built with Fastify. Every route is validated with Zod, and the Swagger (OpenAPI) document is generated automatically from those Zod schemas.

Many projects also ask for a GraphQL API. We did not want to write and maintain a second API by hand next to the REST one.

## Decision

REST and Zod stay the only place where the API is defined. The GraphQL API is generated from the OpenAPI document with [GraphQL Mesh](https://the-guild.dev/graphql/mesh) and served by Mercurius at `/graphql`.

It works like this:

1. When the server is ready, the GraphQL plugin takes the OpenAPI document from the Swagger plugin.
2. It keeps only the successful (2xx) responses and builds a GraphQL schema from the document.
3. It replaces the placeholder schema in Mercurius with the generated one.

Each route under `/api/` must have an `operationId`, which names the GraphQL operation (for example `createUser`). The API refuses to start if a route does not have one.

When a GraphQL operation runs, Mesh calls the matching REST endpoint over HTTP, using the address in `API_PUBLIC_URL`.

The code is in `../../apps/api/src/presentation/fastify/plugins/graphql-mesh.plugin.ts`.

## Why

- **Simple to set up.** There is no GraphQL schema or resolver to write. Mesh reads the Swagger document, and the Swagger document is generated from Zod.
- **Nothing to keep in sync.** REST, Swagger and GraphQL all come from the same Zod schemas. A new route appears in GraphQL automatically.
- **Write it once.** After the plugin is set up, you do not touch the GraphQL code again.
- **Many projects need it.** GraphQL is a common request, and this gives it at almost no extra work.

## Consequences

Good:

- No hand-written GraphQL code to maintain.
- Validation and business logic stay in one place, behind the REST routes.

Trade-offs:

- Every GraphQL call makes an extra HTTP request back to the REST API. This adds latency and depends on `API_PUBLIC_URL` being reachable from the API itself.
- The schema follows the REST design. It is a mapping of the endpoints, not a graph designed for GraphQL clients.
- Only 2xx responses are included, so error responses are not part of the GraphQL schema.
- The schema is built at startup. It is not stored in Git, so it cannot be reviewed in a pull request.
- If building the schema fails, the error is logged and the server keeps running with only the placeholder schema. GraphQL is then empty without the API failing.
- It adds dependencies and some work at startup.

## When not to use this

If a project only needs REST and Swagger, or the client says GraphQL is not needed for now, do not add it. It would use resources for nothing.

If you need a GraphQL API designed around a graph, with relations between types, custom resolvers or subscriptions, a generated schema is not enough. Write the schema by hand.

In Nexus the plugin is always registered, so removing it means deleting one `register` call in `fastify-request-pipeline.adapter.ts`.

## Other options

- **A hand-written schema and resolvers.** Full control and a better GraphQL design, but it is a second API to maintain and keep in sync with the REST one.
- **Generating types from the domain code**, with libraries such as Pothos or TypeGraphQL. Types stay in code, but you still write the resolver layer.
- **REST only.** The simplest option, and the right one when nobody needs GraphQL.
- **Mesh as a separate gateway service.** Keeps the API clean, but it is one more service to run and deploy.
