#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const ROOT = join(process.cwd(), 'src')
const MAX_LINES = 300
const TARGET_EXTENSIONS = new Set(['.tsx'])
const ALLOWLIST = new Set([
  'components/Editor/VisualResumeEditor.tsx',
  'app/billing/page.tsx',
  'app/editor/page.tsx',
  'app/profile/page.tsx',
  'components/AI/AIImprovementWidget.tsx',
  'components/AI/AIWizard.tsx',
  'components/AI/CoverLetterGenerator.tsx',
  'components/AI/EnhancedATSScoreWidget.tsx',
  'components/AI/GrammarStylePanel.tsx',
  'components/AI/JobDescriptionMatcher.tsx',
  'components/AI/JobMatchAnalyticsDashboard.tsx',
  'components/Editor/DesignPanel.tsx',
  'components/Editor/JobDetailView.tsx',
  'components/Editor/JobsView.tsx',
  'components/Editor/LeftSidebar.tsx',
  'components/Editor/RightPanel.tsx',
  'components/Resume/PreviewPanel.tsx',
  'components/Resume/VersionControlPanel.tsx',
  'components/SettingsPanel.tsx',
  'features/resume-automation/components/ResumeAutomationFlow.tsx'
])

function walk(dir, results = []) {
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.')) continue
      if (entry.name === 'node_modules' || entry.name === '.next') continue
      walk(join(dir, entry.name), results)
    } else if (TARGET_EXTENSIONS.has(extname(entry.name))) {
      results.push(join(dir, entry.name))
    }
  }
  return results
}

function countLines(filePath) {
  const content = readFileSync(filePath, 'utf8')
  return content.split(/\r?\n/).length
}

const files = walk(ROOT)
const oversized = files
  .map((file) => {
    const relativePath = file.startsWith(ROOT) ? file.slice(ROOT.length + 1) : file
    return {
      file,
      relativePath,
      lines: countLines(file)
    }
  })
  .filter(({ lines }) => lines > MAX_LINES)
  .filter(({ relativePath }) => !ALLOWLIST.has(relativePath))

if (oversized.length > 0) {
  console.error('The following components exceed the 300 line limit:')
  for (const { relativePath, lines } of oversized) {
    console.error(`  - ${relativePath} (${lines} lines)`)
  }
  process.exit(1)
}

process.exit(0)


