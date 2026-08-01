import { gzipSync } from 'node:zlib'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * NFR-1.6: the initial bundle stays under 250KB gzipped.
 *
 * "Initial" means what the browser fetches before the first screen can render: the entry
 * script, everything index.html preloads, and the stylesheet. Lazy route chunks do not count,
 * and neither does the mock API worker, which is a development fixture excluded from a real
 * build by VITE_ENABLE_MOCK_API=false.
 *
 * This exists because the budget regressed by 200KB in a single step without anything failing:
 * a shared dependency was hoisted into the entry chunk and the only symptom was a bigger number
 * in a build log nobody diffs.
 */
const BUDGET_BYTES = 250 * 1024
const DIST = 'dist'

const html = readFileSync(join(DIST, 'index.html'), 'utf8')
const assets = [
  ...html.matchAll(/<script[^>]+src="([^"]+)"/g),
  ...html.matchAll(/rel="modulepreload"[^>]+href="([^"]+)"/g),
  ...html.matchAll(/rel="stylesheet"[^>]+href="([^"]+)"/g),
].map((match) => match[1].replace(/^\//, ''))

let total = 0
const rows = []
for (const asset of assets) {
  const path = join(DIST, asset)
  if (!existsSync(path)) continue
  const size = gzipSync(readFileSync(path)).length
  total += size
  rows.push([asset, size])
}

rows.sort((a, b) => b[1] - a[1])
for (const [asset, size] of rows) {
  console.log(`  ${(size / 1024).toFixed(1).padStart(7)} KB  ${asset}`)
}

const kb = (total / 1024).toFixed(1)
const budgetKb = (BUDGET_BYTES / 1024).toFixed(0)

if (total > BUDGET_BYTES) {
  console.error(`\n✖ initial bundle is ${kb} KB gzipped, over the ${budgetKb} KB budget (NFR-1.6).`)
  console.error(
    '  Usually a dependency used by two lazy routes was hoisted into the entry chunk.\n' +
      '  Check build.rolldownOptions.output.advancedChunks in vite.config.ts.',
  )
  process.exit(1)
}

console.log(`\n✓ initial bundle ${kb} KB gzipped, under the ${budgetKb} KB budget (NFR-1.6).`)
