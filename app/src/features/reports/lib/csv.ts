/**
 * CSV export.
 *
 * Every report exports (FR-7.3), and the export is the report rather than a subset: a figure a
 * lead can see but cannot get out of the product is a figure they will rebuild by hand in a
 * spreadsheet, which is exactly the workflow reporting is meant to replace.
 */

/** RFC 4180 quoting. A comment containing a comma or a quote must survive the round trip. */
function escapeCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((row) => row.map(escapeCell).join(',')).join('\r\n')
}

/**
 * Hands the file to the browser.
 *
 * A data: URL would be simpler but caps out around 2MB in some browsers, and a year of ratings
 * clears that. The object URL is revoked on the next frame so the tab does not hold the blob.
 */
export function downloadCsv(filename: string, csv: string): void {
  // A byte order mark, so a spreadsheet opens UTF-8 comments correctly rather than as mojibake.
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.append(link)
  link.click()
  link.remove()
  window.requestAnimationFrame(() => {
    URL.revokeObjectURL(url)
  })
}
