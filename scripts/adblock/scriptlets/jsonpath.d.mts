export interface JsonPath {
  readonly valid: boolean
  readonly value: unknown
  apply(data: unknown): unknown
}

export function createJsonPath(query: string): JsonPath
