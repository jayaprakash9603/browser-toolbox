export interface UnitDefinition {
  id: string
  name: string
  toBase: number
  offset?: number
}

export interface UnitCategory {
  id: string
  name: string
  base: string
  units: UnitDefinition[]
}

export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    id: 'length',
    name: 'Length',
    base: 'm',
    units: [
      { id: 'mm', name: 'Millimeter', toBase: 0.001 },
      { id: 'cm', name: 'Centimeter', toBase: 0.01 },
      { id: 'm', name: 'Meter', toBase: 1 },
      { id: 'km', name: 'Kilometer', toBase: 1000 },
      { id: 'in', name: 'Inch', toBase: 0.0254 },
      { id: 'ft', name: 'Foot', toBase: 0.3048 },
      { id: 'yd', name: 'Yard', toBase: 0.9144 },
      { id: 'mi', name: 'Mile', toBase: 1609.344 },
    ],
  },
  {
    id: 'weight',
    name: 'Weight',
    base: 'kg',
    units: [
      { id: 'mg', name: 'Milligram', toBase: 1e-6 },
      { id: 'g', name: 'Gram', toBase: 0.001 },
      { id: 'kg', name: 'Kilogram', toBase: 1 },
      { id: 't', name: 'Tonne', toBase: 1000 },
      { id: 'oz', name: 'Ounce', toBase: 0.028349523125 },
      { id: 'lb', name: 'Pound', toBase: 0.45359237 },
      { id: 'st', name: 'Stone', toBase: 6.35029318 },
    ],
  },
  {
    id: 'temperature',
    name: 'Temperature',
    base: '°C',
    units: [
      { id: 'c', name: 'Celsius', toBase: 1 },
      { id: 'f', name: 'Fahrenheit', toBase: 5 / 9, offset: -32 },
      { id: 'k', name: 'Kelvin', toBase: 1, offset: -273.15 },
    ],
  },
  {
    id: 'area',
    name: 'Area',
    base: 'm²',
    units: [
      { id: 'mm2', name: 'Square millimeter', toBase: 1e-6 },
      { id: 'cm2', name: 'Square centimeter', toBase: 1e-4 },
      { id: 'm2', name: 'Square meter', toBase: 1 },
      { id: 'ha', name: 'Hectare', toBase: 10_000 },
      { id: 'km2', name: 'Square kilometer', toBase: 1e6 },
      { id: 'ft2', name: 'Square foot', toBase: 0.09290304 },
      { id: 'ac', name: 'Acre', toBase: 4046.8564224 },
      { id: 'mi2', name: 'Square mile', toBase: 2_589_988.110336 },
    ],
  },
  {
    id: 'volume',
    name: 'Volume',
    base: 'l',
    units: [
      { id: 'ml', name: 'Milliliter', toBase: 0.001 },
      { id: 'l', name: 'Liter', toBase: 1 },
      { id: 'm3', name: 'Cubic meter', toBase: 1000 },
      { id: 'tsp', name: 'Teaspoon (US)', toBase: 0.00492892159 },
      { id: 'tbsp', name: 'Tablespoon (US)', toBase: 0.0147867648 },
      { id: 'cup', name: 'Cup (US)', toBase: 0.2365882365 },
      { id: 'pt', name: 'Pint (US)', toBase: 0.473176473 },
      { id: 'gal', name: 'Gallon (US)', toBase: 3.785411784 },
      { id: 'ft3', name: 'Cubic foot', toBase: 28.316846592 },
    ],
  },
  {
    id: 'speed',
    name: 'Speed',
    base: 'm/s',
    units: [
      { id: 'ms', name: 'Meter/second', toBase: 1 },
      { id: 'kmh', name: 'Kilometer/hour', toBase: 1 / 3.6 },
      { id: 'mph', name: 'Mile/hour', toBase: 0.44704 },
      { id: 'kn', name: 'Knot', toBase: 0.514444444 },
      { id: 'fts', name: 'Foot/second', toBase: 0.3048 },
    ],
  },
  {
    id: 'time',
    name: 'Time',
    base: 's',
    units: [
      { id: 'ms', name: 'Millisecond', toBase: 0.001 },
      { id: 's', name: 'Second', toBase: 1 },
      { id: 'min', name: 'Minute', toBase: 60 },
      { id: 'h', name: 'Hour', toBase: 3600 },
      { id: 'd', name: 'Day', toBase: 86_400 },
      { id: 'wk', name: 'Week', toBase: 604_800 },
    ],
  },
  {
    id: 'data',
    name: 'Data',
    base: 'B',
    units: [
      { id: 'b', name: 'Bit', toBase: 0.125 },
      { id: 'B', name: 'Byte', toBase: 1 },
      { id: 'KB', name: 'Kilobyte (10³)', toBase: 1e3 },
      { id: 'MB', name: 'Megabyte (10⁶)', toBase: 1e6 },
      { id: 'GB', name: 'Gigabyte (10⁹)', toBase: 1e9 },
      { id: 'TB', name: 'Terabyte (10¹²)', toBase: 1e12 },
      { id: 'KiB', name: 'Kibibyte (2¹⁰)', toBase: 1024 },
      { id: 'MiB', name: 'Mebibyte (2²⁰)', toBase: 1024 ** 2 },
      { id: 'GiB', name: 'Gibibyte (2³⁰)', toBase: 1024 ** 3 },
      { id: 'TiB', name: 'Tebibyte (2⁴⁰)', toBase: 1024 ** 4 },
    ],
  },
  {
    id: 'pressure',
    name: 'Pressure',
    base: 'Pa',
    units: [
      { id: 'pa', name: 'Pascal', toBase: 1 },
      { id: 'kpa', name: 'Kilopascal', toBase: 1000 },
      { id: 'bar', name: 'Bar', toBase: 100_000 },
      { id: 'atm', name: 'Atmosphere', toBase: 101_325 },
      { id: 'psi', name: 'PSI', toBase: 6894.757293168 },
      { id: 'mmhg', name: 'mmHg', toBase: 133.322387415 },
    ],
  },
  {
    id: 'energy',
    name: 'Energy',
    base: 'J',
    units: [
      { id: 'j', name: 'Joule', toBase: 1 },
      { id: 'kj', name: 'Kilojoule', toBase: 1000 },
      { id: 'cal', name: 'Calorie', toBase: 4.184 },
      { id: 'kcal', name: 'Kilocalorie', toBase: 4184 },
      { id: 'wh', name: 'Watt-hour', toBase: 3600 },
      { id: 'kwh', name: 'Kilowatt-hour', toBase: 3_600_000 },
      { id: 'btu', name: 'BTU', toBase: 1055.05585262 },
    ],
  },
  {
    id: 'power',
    name: 'Power',
    base: 'W',
    units: [
      { id: 'w', name: 'Watt', toBase: 1 },
      { id: 'kw', name: 'Kilowatt', toBase: 1000 },
      { id: 'mw', name: 'Megawatt', toBase: 1e6 },
      { id: 'hp', name: 'Horsepower', toBase: 745.699871582 },
    ],
  },
  {
    id: 'frequency',
    name: 'Frequency',
    base: 'Hz',
    units: [
      { id: 'hz', name: 'Hertz', toBase: 1 },
      { id: 'khz', name: 'Kilohertz', toBase: 1000 },
      { id: 'mhz', name: 'Megahertz', toBase: 1e6 },
      { id: 'ghz', name: 'Gigahertz', toBase: 1e9 },
      { id: 'rpm', name: 'RPM', toBase: 1 / 60 },
    ],
  },
  {
    id: 'angle',
    name: 'Angle',
    base: '°',
    units: [
      { id: 'deg', name: 'Degree', toBase: 1 },
      { id: 'rad', name: 'Radian', toBase: 180 / Math.PI },
      { id: 'grad', name: 'Gradian', toBase: 0.9 },
      { id: 'turn', name: 'Turn', toBase: 360 },
    ],
  },
]

export type UnitResult = { ok: true; value: number } | { ok: false; error: string }

export function getUnitCategory(categoryId: string): UnitCategory | undefined {
  return UNIT_CATEGORIES.find((category) => category.id === categoryId)
}

export function convertUnit(
  categoryId: string,
  value: number,
  fromId: string,
  toId: string,
): UnitResult {
  if (!Number.isFinite(value)) return { ok: false, error: 'Value must be a number.' }
  const category = getUnitCategory(categoryId)
  if (!category) return { ok: false, error: `Unknown category "${categoryId}".` }
  const from = category.units.find((unit) => unit.id === fromId)
  const to = category.units.find((unit) => unit.id === toId)
  if (!from || !to) return { ok: false, error: 'Unknown unit.' }
  const baseValue = (value + (from.offset ?? 0)) * from.toBase
  const result = baseValue / to.toBase - (to.offset ?? 0)
  return { ok: true, value: result }
}
