import type { QueryHandler } from "./query-handler.js";
import type { Query } from "./query.js";

export interface QueryBus {
  register<TQuery extends Query, TResult>(queryName: string, handler: QueryHandler<TQuery, TResult>): void;
  execute<TQuery extends Query, TResult>(query: TQuery): Promise<TResult>;
}
