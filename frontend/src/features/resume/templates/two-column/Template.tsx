'use client'

import { TemplateProps } from '../types'
import { BaseTemplate, renderBulletPoints, applyReplacements, filterVisibleSections, shouldShowField } from '../BaseTemplate'
import { getFontFamily } from '../utils'

export default function TwoColumnTemplate({ data, config, replacements }: TemplateProps) {
  // Use sectionOrder if available, otherwise use natural order
  // Always include all sections, even if not in sectionOrder
  let orderedSections: typeof data.sections
  if (config.layout.sectionOrder.length > 0) {
    const ordered = config.layout.sectionOrder
      .map(id => data.sections.find(s => s.id === id))
      .filter(Boolean) as typeof data.sections
    // Add any sections not in sectionOrder to the end
    const orderedIds = new Set(config.layout.sectionOrder)
    const remaining = data.sections.filter(s => !orderedIds.has(s.id))
    orderedSections = [...ordered, ...remaining]
  } else {
    orderedSections = data.sections
  }

  // CRITICAL: Filter sections by visibility - ensures mark/unmark works
  const visibleSections = filterVisibleSections(orderedSections)

  const SUMMARY_ID = '__summary__'
  // Ensure arrays exist and are arrays (handle undefined/null cases)
  let leftIds = Array.isArray(config.layout.twoColumnLeft) ? [...config.layout.twoColumnLeft] : []
  let rightIds = Array.isArray(config.layout.twoColumnRight) ? [...config.layout.twoColumnRight] : []
  
  // Auto-distribute if arrays are empty (first load scenario)
  if (leftIds.length === 0 && rightIds.length === 0) {
    const leftColumnKeywords = ['skill', 'certificate', 'certification', 'education', 'academic', 'qualification', 'award', 'honor']
    
    // Add summary to right by default
    if (data.summary && shouldShowField(data.fieldsVisible, 'summary')) {
      rightIds.push(SUMMARY_ID)
    }
    
    // Distribute visible sections between left and right columns
    visibleSections.forEach(section => {
      const titleLower = section.title.toLowerCase()
      if (leftColumnKeywords.some(keyword => titleLower.includes(keyword))) {
        leftIds.push(section.id)
      } else {
        rightIds.push(section.id)
      }
    })
  }
  
  // Use sectionOrder to maintain proper ordering within each column
  const sectionOrder = Array.isArray(config.layout.sectionOrder) && config.layout.sectionOrder.length > 0 
    ? config.layout.sectionOrder 
    : visibleSections.map(s => s.id)
  
  const getSectionOrder = (sectionId: string) => {
    const index = sectionOrder.indexOf(sectionId)
    return index === -1 ? 9999 : index
  }
  
  // Filter and sort sections for each column based on sectionOrder
  // Only include sections that are in the leftIds or rightIds arrays
  const leftSections = visibleSections
    .filter(s => leftIds.includes(s.id))
    .sort((a, b) => getSectionOrder(a.id) - getSectionOrder(b.id))
  
  const rightColumnSections = visibleSections
    .filter(s => rightIds.includes(s.id))
    .sort((a, b) => getSectionOrder(a.id) - getSectionOrder(b.id))
  
  const showSummaryInLeft = leftIds.includes(SUMMARY_ID) && shouldShowField(data.fieldsVisible, 'summary') && data.summary

  return (
    <BaseTemplate data={data} config={config} replacements={replacements}>
      <header
        className="mb-6"
        style={{
          borderBottom: `2px solid ${config.design.colors.primary}`,
          paddingBottom: '12px',
        }}
      >
        {shouldShowField(data.fieldsVisible, 'name') && (
          <h1
            style={{
              fontFamily: getFontFamily(config.typography.fontFamily.heading),
              fontSize: `${config.typography.fontSize.h1}px`,
              fontWeight: config.typography.fontWeight?.heading || 600,
              color: config.design.colors.primary,
              marginBottom: '4px',
            }}
          >
            {applyReplacements(data.name, replacements)}
          </h1>
        )}
        {shouldShowField(data.fieldsVisible, 'title') && data.title && (
          <p
            style={{
              fontSize: `${config.typography.fontSize.body + 1}px`,
              color: config.design.colors.secondary,
              marginBottom: '6px',
            }}
          >
            {applyReplacements(data.title, replacements)}
          </p>
        )}
        <div
          className="flex flex-wrap gap-3 text-xs"
          style={{ color: config.design.colors.secondary }}
        >
          {shouldShowField(data.fieldsVisible, 'email') && data.email && <span>{data.email}</span>}
          {shouldShowField(data.fieldsVisible, 'phone') && data.phone && <span>{data.phone}</span>}
          {shouldShowField(data.fieldsVisible, 'location') && data.location && <span>{data.location}</span>}
        </div>
      </header>

      <div className="flex" style={{ gap: `${config.spacing.sectionGap}px` }}>
        <div style={{ width: `${config.layout.columnWidth || 40}%`, display: 'flex', flexDirection: 'column', gap: `${config.spacing.sectionGap}px` }}>
          {showSummaryInLeft && (
            <section>
              <h2
                className="mb-2"
                style={{
                  fontFamily: getFontFamily(config.typography.fontFamily.heading),
                  fontSize: `${config.typography.fontSize.h2}px`,
                  fontWeight: config.typography.fontWeight?.heading || 600,
                  color: config.design.colors.primary,
                  borderBottom: `1px solid ${config.design.colors.accent}`,
                  paddingBottom: '4px',
                }}
              >
                Summary
              </h2>
              <p
                className="text-xs"
                style={{
                  fontSize: `${config.typography.fontSize.body}px`,
                  lineHeight: config.typography.lineHeight,
                }}
              >
                {applyReplacements(data.summary, replacements)}
              </p>
            </section>
          )}

          {leftSections.map((section) => (
            <section key={section.id}>
              <h2
                className="mb-2"
                style={{
                  fontFamily: getFontFamily(config.typography.fontFamily.heading),
                  fontSize: `${config.typography.fontSize.h2}px`,
                  fontWeight: config.typography.fontWeight?.heading || 600,
                  color: config.design.colors.primary,
                  borderBottom: `1px solid ${config.design.colors.accent}`,
                  paddingBottom: '4px',
                }}
              >
                {applyReplacements(section.title, replacements)}
              </h2>
              {renderBulletPoints(section.bullets, config, replacements)}
            </section>
          ))}
        </div>

        <div style={{ width: `${100 - (config.layout.columnWidth || 40)}%`, display: 'flex', flexDirection: 'column', gap: `${config.spacing.sectionGap}px` }}>
          {rightIds.includes(SUMMARY_ID) && shouldShowField(data.fieldsVisible, 'summary') && data.summary && (
            <section>
              <h2
                className="mb-2"
                style={{
                  fontFamily: getFontFamily(config.typography.fontFamily.heading),
                  fontSize: `${config.typography.fontSize.h2}px`,
                  fontWeight: config.typography.fontWeight?.heading || 600,
                  color: config.design.colors.primary,
                  borderBottom: `1px solid ${config.design.colors.accent}`,
                  paddingBottom: '4px',
                }}
              >
                Summary
              </h2>
              <p
                className="text-xs"
                style={{
                  fontSize: `${config.typography.fontSize.body}px`,
                  lineHeight: config.typography.lineHeight,
                }}
              >
                {applyReplacements(data.summary, replacements)}
              </p>
            </section>
          )}
          {rightColumnSections.map((section) => (
            <section key={section.id}>
              <h2
                className="mb-2"
                style={{
                  fontFamily: getFontFamily(config.typography.fontFamily.heading),
                  fontSize: `${config.typography.fontSize.h2}px`,
                  fontWeight: config.typography.fontWeight?.heading || 600,
                  color: config.design.colors.primary,
                  borderBottom: `1px solid ${config.design.colors.accent}`,
                  paddingBottom: '4px',
                }}
              >
                {applyReplacements(section.title, replacements)}
              </h2>
              {renderBulletPoints(section.bullets, config, replacements)}
            </section>
          ))}
        </div>
      </div>
    </BaseTemplate>
  )
}

