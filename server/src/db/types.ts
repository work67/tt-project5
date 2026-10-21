export type SqlValue = string | number | null

/** Minimal async database interface, implemented by local SQLite and Cloudflare D1. */
export interface Db {
  get<T>(sql: string, ...params: SqlValue[]): Promise<T | undefined>
  all<T>(sql: string, ...params: SqlValue[]): Promise<T[]>
  run(sql: string, ...params: SqlValue[]): Promise<{ changes: number }>
}
