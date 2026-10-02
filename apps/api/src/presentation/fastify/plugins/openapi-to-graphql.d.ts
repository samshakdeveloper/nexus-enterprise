declare module "openapi-to-graphql" {
  export interface Options {
    strict?: boolean;
    fillEmptyResponses?: boolean;
    viewer?: boolean;
    baseUrl?: string;
    [key: string]: unknown;
  }

  export function openapiToGraphql(
    openapiObject: unknown,
    options?: Options,
  ): Promise<{ schema: unknown; report: unknown }>;
}
