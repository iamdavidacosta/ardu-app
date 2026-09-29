import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const source = process.argv[2]
if (source !== 'org' && source !== 'net' && source !== '--csv') throw new Error('La fuente debe ser org, net o --csv')
const endpoint = source === '--csv' ? null : `https://world.openfoodfacts.${source}/api/v2/search`
const pageSize = 100
const delayMs = 6_500
const destination = resolve(fileURLToPath(new URL('../supabase/migrations/202609290002_seed_colombia_catalog.sql', import.meta.url)))

const sleep = (milliseconds) => new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds))
const sqlText = (value) => value == null ? 'null' : `'${String(value).replaceAll('\0', '').replaceAll("'", "''")}'`

async function fetchPage(page) {
  const url = new URL(endpoint)
  url.searchParams.set('countries_tags_en', 'colombia')
  url.searchParams.set('page', String(page))
  url.searchParams.set('page_size', String(pageSize))
  url.searchParams.set('fields', 'code,product_name,quantity')

  let lastError
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'ARDU/1.0 (https://github.com/iamdavidacosta/ardu-app)', Accept: 'application/json' },
        signal: AbortSignal.timeout(30_000),
      })
      if (response.ok) return response.json()
      lastError = new Error(`HTTP ${response.status} en página ${page}`)
      if (response.status !== 429 && response.status !== 503) throw lastError
    } catch (error) {
      lastError = error
      if (attempt === 4 || /^HTTP (?!429|503)/.test(error.message)) throw error
    }
    await sleep(delayMs * attempt)
  }
  throw lastError
}

function parseDelimited(content) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  const input = content.replace(/^\uFEFF/, '')
  const headerLine = input.split(/\r?\n/, 1)[0]
  const delimiter = headerLine.includes('\t') ? '\t' : ','
  if (!headerLine.includes(delimiter)) throw new Error('El archivo debe estar separado por tabulaciones o comas')
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index]
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') { field += '"'; index += 1 }
      else if (character === '"') quoted = false
      else field += character
    } else if (character === '"') quoted = true
    else if (character === delimiter) { row.push(field); field = '' }
    else if (character === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = '' }
    else field += character
  }
  if (quoted) throw new Error('CSV incompleto: comillas sin cerrar')
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows
}

let products
let sourceDescription
if (source === '--csv') {
  const filePath = process.argv[3]
  if (!filePath) throw new Error('Indica la ruta del CSV de Open Food Facts')
  const [header, ...data] = parseDelimited(await readFile(resolve(filePath), 'utf8'))
  const column = (name) => header.indexOf(name)
  if (column('code') === -1 || column('quantity') === -1 || !header.some((name) => name === 'product_name' || name.startsWith('product_name_'))) {
    throw new Error('El CSV debe contener code, quantity y product_name o nombres por idioma')
  }
  const nameColumns = header.map((name, index) => name.startsWith('product_name_') ? index : -1).filter((index) => index !== -1)
  const cell = (row, index) => index < 0 ? '' : (row[index] ?? '').trim()
  const dataRows = data.filter((row) => row.some((value) => value.trim()))
  for (const row of dataRows) {
    if (row.length !== header.length) throw new Error(`Fila CSV con ${row.length} columnas; se esperaban ${header.length}`)
  }
  const colombiaRows = column('countries_tags') < 0 ? dataRows : dataRows.filter((row) => cell(row, column('countries_tags')).split(',').includes('en:colombia'))
  products = colombiaRows.map((row) => {
    const languageColumn = column(`product_name_${cell(row, column('lc')).toLowerCase()}`)
    const productName = [column('product_name'), column('product_name_es'), languageColumn, column('product_name_en'), ...nameColumns]
      .map((index) => cell(row, index)).find(Boolean) ?? null
    return { code: cell(row, column('code')), product_name: productName, quantity: cell(row, column('quantity')) || null }
  })
  console.log(`CSV: ${dataRows.length} filas; ${colombiaRows.length} productos etiquetados con Colombia`)
  const expectedCount = Number(process.argv[4] ?? 0)
  if (expectedCount && products.length !== expectedCount) throw new Error(`Se esperaban ${expectedCount} productos y el CSV contiene ${products.length}`)
  sourceDescription = 'CSV de Open Food Facts (filtrado por en:colombia)'
} else {
  const firstPage = await fetchPage(1)
  if (!Number.isInteger(firstPage.count) || !Number.isInteger(firstPage.page_size) || !Array.isArray(firstPage.products)) throw new Error('Respuesta inicial inválida')
  const totalPages = Math.ceil(firstPage.count / firstPage.page_size)
  products = [...firstPage.products]
  for (let page = 2; page <= totalPages; page += 1) {
    await sleep(delayMs)
    const response = await fetchPage(page)
    if (response.page !== page || !Array.isArray(response.products)) throw new Error(`Respuesta inválida en página ${page}`)
    products.push(...response.products)
    console.log(`Página ${page}/${totalPages}: ${products.length} productos recibidos`)
  }
  if (products.length !== firstPage.count) throw new Error(`El API anunció ${firstPage.count} productos, pero devolvió ${products.length}; no se generó el seed`)
  sourceDescription = endpoint
}

const byCode = new Map()
for (const product of products) {
  const code = String(product.code ?? '').trim()
  if (!code || code.length > 64) throw new Error('Producto sin código utilizable; no se generó el seed')
  if (byCode.has(code)) throw new Error(`Código duplicado ${code}; no se generó el seed`)
  byCode.set(code, {
    code,
    productName: typeof product.product_name === 'string' ? product.product_name : null,
    quantity: typeof product.quantity === 'string' ? product.quantity : null,
  })
}

const rows = [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code))
const statements = [`-- Datos de Open Food Facts (Colombia), fuente ${sourceDescription}, ODbL: https://world.openfoodfacts.org/terms-of-use`, 'begin;']
for (let offset = 0; offset < rows.length; offset += 500) {
  const values = rows.slice(offset, offset + 500)
    .map(({ code, productName, quantity }) => `    (${sqlText(code)}, ${sqlText(productName)}, ${sqlText(quantity)})`)
    .join(',\n')
  statements.push(`insert into public.catalog_products (code, product_name, quantity)\nvalues\n${values}\non conflict (code) do update\nset product_name = excluded.product_name, quantity = excluded.quantity;`)
}
statements.push('commit;', '')
await writeFile(destination, statements.join('\n'), 'utf8')
console.log(`Seed generado: ${rows.length} productos (${rows.filter((row) => row.productName).length} con nombre, ${rows.filter((row) => row.quantity).length} con cantidad) en ${destination}`)
