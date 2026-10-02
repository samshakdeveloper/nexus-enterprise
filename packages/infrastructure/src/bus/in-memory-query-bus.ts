import type { Query, QueryBus, QueryHandler } from "@nexus/application";

export class InMemoryQueryBus implements QueryBus {
  private readonly handlers = new Map<string, QueryHandler<Query, unknown>>();

  public register<TQuery extends Query, TResult>(queryName: string, handler: QueryHandler<TQuery, TResult>): void {
    if (this.handlers.has(queryName)) {
      throw new Error(`A handler is already registered for query "${queryName}".`);
    }
    this.handlers.set(queryName, handler);
  }

  public async execute<TQuery extends Query, TResult>(query: TQuery): Promise<TResult> {
    const handler = this.handlers.get(query.queryName);
    if (!handler) {
      throw new Error(`No handler registered for query "${query.queryName}".`);
    }
    return handler.execute(query) as Promise<TResult>;
  }
}
