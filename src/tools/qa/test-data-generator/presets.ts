export interface SchemaPreset {
  id: string
  labelKey: string
  columns: { name: string; type: string; nullable?: boolean }[]
}

export const SCHEMA_PRESETS: readonly SchemaPreset[] = [
  {
    id: 'user',
    labelKey: 'testData.presets.user',
    columns: [
      { name: 'id', type: 'uuid' },
      { name: 'full_name', type: 'fullName' },
      { name: 'email', type: 'email' },
      { name: 'username', type: 'username' },
      { name: 'password', type: 'password' },
      { name: 'created_at', type: 'datetime' },
      { name: 'is_active', type: 'boolean' },
    ],
  },
  {
    id: 'ecommerce',
    labelKey: 'testData.presets.ecommerce',
    columns: [
      { name: 'order_id', type: 'orderId' },
      { name: 'customer', type: 'fullName' },
      { name: 'sku', type: 'sku' },
      { name: 'amount', type: 'amount' },
      { name: 'currency', type: 'currency' },
      { name: 'status', type: 'status' },
      { name: 'ordered_at', type: 'pastDate' },
    ],
  },
  {
    id: 'employee',
    labelKey: 'testData.presets.employee',
    columns: [
      { name: 'employee_id', type: 'autoIncrement' },
      { name: 'name', type: 'fullName' },
      { name: 'email', type: 'email' },
      { name: 'job_title', type: 'jobTitle' },
      { name: 'company', type: 'company' },
      { name: 'country', type: 'country' },
      { name: 'hired_at', type: 'pastDate' },
    ],
  },
  {
    id: 'geo',
    labelKey: 'testData.presets.geo',
    columns: [
      { name: 'id', type: 'nanoid' },
      { name: 'city', type: 'city' },
      { name: 'country_code', type: 'countryCode' },
      { name: 'latitude', type: 'latitude' },
      { name: 'longitude', type: 'longitude' },
      { name: 'timezone', type: 'timezone' },
    ],
  },
  {
    id: 'apiLog',
    labelKey: 'testData.presets.apiLog',
    columns: [
      { name: 'request_id', type: 'ulid' },
      { name: 'method', type: 'httpMethod' },
      { name: 'path', type: 'slug' },
      { name: 'status', type: 'httpStatus' },
      { name: 'ip', type: 'ipv4' },
      { name: 'user_agent', type: 'userAgent' },
      { name: 'timestamp', type: 'datetime' },
    ],
  },
  {
    id: 'payment',
    labelKey: 'testData.presets.payment',
    columns: [
      { name: 'id', type: 'uuid' },
      { name: 'card_number', type: 'creditCard' },
      { name: 'brand', type: 'cardBrand' },
      { name: 'expiry', type: 'cardExpiry' },
      { name: 'cvv', type: 'cvv' },
      { name: 'amount', type: 'amount' },
      { name: 'iban', type: 'iban', nullable: true },
    ],
  },
]

let nextKey = 1

export function columnsFromPreset(columns: { name: string; type: string; nullable?: boolean }[]) {
  return columns.map((column, index) => ({ ...column, id: `c${index}`, key: nextKey++ }))
}

export function nextColumnKey(): number {
  return nextKey++
}
