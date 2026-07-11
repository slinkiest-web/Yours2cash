export interface QueryResult<T> {
  data: T | null
  error: string | null
}
