import { writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildChecklist, checklistMarkdown, coverageRatio } from '../src/core/checklist'

describe('coverage file', () => {
  it('writes the checklist the report cites', () => {
    const rows = buildChecklist()
    expect(coverageRatio(rows)).toBeGreaterThanOrEqual(0.9)
    writeFileSync(new URL('../COVERAGE.md', import.meta.url), checklistMarkdown(rows))
  })
})
