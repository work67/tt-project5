import type { Db, SqlValue } from './types.js'

export class D1Db implements Db {
  constructor(private readonly d1: D1Database) {}

  async get<T>(sql: string, ...params: SqlValue[]) {
    const row = await this.d1.prepare(sql).bind(...params).first<T>()
    return row ?? undefined
  }

  async all<T>(sql: string, ...params: SqlValue[]) {
    const { results } = await this.d1.prepare(sql).bind(...params).all<T>()
    return results
  }

  async run(sql: string, ...params: SqlValue[]) {
    const { meta } = await this.d1.prepare(sql).bind(...params).run()
    return { changes: meta.changes }
  }
}
