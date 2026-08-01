/**
 * Marks the matched span inside a result.
 *
 * Built by splitting the string rather than by injecting `<mark>` into HTML, so a result title
 * that happens to contain markup is still shown as text (NFR-2.2).
 */
export function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim()
  if (needle === '') return <>{text}</>

  const index = text.toLowerCase().indexOf(needle.toLowerCase())
  if (index === -1) return <>{text}</>

  return (
    <>
      {text.slice(0, index)}
      <mark
        className="rounded-[2px] px-0.5"
        style={{ background: 'var(--brand-soft)', color: 'inherit' }}
      >
        {text.slice(index, index + needle.length)}
      </mark>
      {text.slice(index + needle.length)}
    </>
  )
}
