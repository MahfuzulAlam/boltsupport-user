import axe from 'axe-core'
import { expect } from 'vitest'

/**
 * Rules jsdom cannot judge, disabled so the ones it can are not drowned out.
 *
 * `color-contrast` needs a layout engine to resolve computed colours against what is actually
 * painted behind them; in jsdom every element reports transparent and the rule reports nothing
 * useful either way. NFR-3.1 is verified against the token sheet instead, in contrast.test.ts.
 */
const DISABLED = {
  'color-contrast': { enabled: false },
  // Region requires a landmark ancestor, which a component rendered in isolation does not have.
  region: { enabled: false },
}

export interface AxeOptions {
  /** Extra rules to switch off, with the reason recorded at the call site. */
  disable?: string[]
}

/**
 * Runs axe over a container and fails with the offending markup.
 *
 * Component level rather than page level: the pages are assembled from these, and a violation
 * reported against a whole screen is much harder to locate than one reported against the piece
 * that owns it.
 */
export async function expectNoAxeViolations(
  container: HTMLElement,
  options: AxeOptions = {},
): Promise<void> {
  const rules: Record<string, { enabled: boolean }> = { ...DISABLED }
  for (const rule of options.disable ?? []) rules[rule] = { enabled: false }

  /*
   * Frames are not descended into.
   *
   * The only iframe in the product is the email renderer, and it carries `sandbox=""` with
   * neither allow-scripts nor allow-same-origin precisely so nothing can reach inside it. Its
   * contents are untrusted customer email rather than our markup, so auditing them is neither
   * possible nor ours to do.
   */
  const results = await axe.run(container, { rules, iframes: false })

  if (results.violations.length > 0) {
    const report = results.violations
      .map((violation) => {
        const nodes = violation.nodes.map((node) => `      ${node.html}`).join('\n')
        return `  ${violation.id}: ${violation.help}\n${nodes}`
      })
      .join('\n')
    expect.fail(`axe found ${String(results.violations.length)} violation(s):\n${report}`)
  }
}
