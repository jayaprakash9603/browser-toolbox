import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { feature } from 'topojson-client'
import { geoPath, geoNaturalEarth1 } from 'd3-geo'
import iso3166 from 'iso-3166-1'
import world from 'world-atlas/countries-110m.json' with { type: 'json' }

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, '../public/sites/whatsapp/world-map.json')

const countries = feature(world, world.objects.countries)
const projection = geoNaturalEarth1().fitSize([960, 500], countries)
const pathGen = geoPath(projection)

const paths = {}
for (const f of countries.features) {
  const numeric = String(f.id ?? '')
  const row = iso3166.whereNumeric(numeric)
  const iso = row?.alpha2
  if (!iso) continue
  const d = pathGen(f)
  if (d) paths[iso] = d
}

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, JSON.stringify({ paths }), 'utf8')
console.log(`Wrote ${Object.keys(paths).length} countries to ${outPath}`)
