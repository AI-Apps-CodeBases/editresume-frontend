'use client'

import { TemplateProps } from '../types'
import { BaseTemplate, renderBulletPoints, applyReplacements, filterVisibleSections, shouldShowField } from '../BaseTemplate'
import { getFontFamily } from '../utils'

export default function ProfessionalTemplate({ data, config, replacements }: TemplateProps) {
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

  const contactItems = [
    shouldShowField(data.fieldsVisible, 'email') && data.email,
    shouldShowField(data.fieldsVisible, 'phone') && data.phone,
    shouldShowField(data.fieldsVisible, 'location') && data.location,
    shouldShowField(data.fieldsVisible, 'linkedin') && data.linkedin,
    shouldShowField(data.fieldsVisible, 'website') && data.website,
  ].filter(Boolean)

  return (
    <BaseTemplate data={data} config={config} replacements={replacements}>
      <header
        className="mb-8 text-center"
        style={{
          borderBottom: config.design.dividers ? `3px solid ${config.design.colors.primary}` : 'none',
          paddingBottom: config.design.dividers ? '20px' : '0',
          marginBottom: config.design.dividers ? '24px' : '16px',
        }}
      >
        {shouldShowField(data.fieldsVisible, 'name') && (
          <h1
            style={{
                fontFamily: getFontFamily(config.typography.fontFamily.heading),
              fontSize: `${config.typography.fontSize.h1}px`,
              fontWeight: config.typography.fontWeight?.heading || 600,
              color: config.design.colors.primary,
              marginBottom: '8px',
              letterSpacing: config.typography.letterSpacing || 0.2,
            }}
          >
            {applyReplacements(data.name, replacements)}
          </h1>
        )}
        {shouldShowField(data.fieldsVisible, 'title') && data.title && (
          <p
            style={{
              fontSize: `${config.typography.fontSize.body + 2}px`,
              color: config.design.colors.secondary,
              fontWeight: 500,
              marginBottom: '12px',
            }}
          >
            {applyReplacements(data.title, replacements)}
          </p>
        )}
        <div
          className="flex flex-wrap justify-center gap-3 text-sm"
          style={{ color: config.design.colors.secondary }}
        >
          {contactItems.map((item, idx) => (
            <span key={idx}>
              {item}
              {idx < contactItems.length - 1 && <span className="mx-2">•</span>}
            </span>
          ))}
        </div>
      </header>

      {shouldShowField(data.fieldsVisible, 'summary') && data.summary && (
        <section style={{ marginBottom: `${config.spacing.sectionGap}px` }}>
          <h2
            className="mb-3 uppercase tracking-wide"
            style={{
                fontFamily: getFontFamily(config.typography.fontFamily.heading),
              fontSize: `${config.typography.fontSize.h2}px`,
              fontWeight: config.typography.fontWeight?.heading || 600,
              color: config.design.colors.primary,
              borderBottom: config.design.dividers ? `2px solid ${config.design.colors.primary}` : 'none',
              paddingBottom: config.design.dividers ? '6px' : '0',
            }}
          >
            Professional Summary
          </h2>
          <p
            className="leading-relaxed"
            style={{
              fontSize: `${config.typography.fontSize.body}px`,
              lineHeight: config.typography.lineHeight,
              color: config.design.colors.text,
            }}
          >
            {applyReplacements(data.summary, replacements)}
          </p>
        </section>
      )}

      {visibleSections.map((section) => (
        <section
          key={section.id}
          style={{ marginBottom: `${config.spacing.sectionGap}px` }}
        >
          <h2
            className="mb-3 uppercase tracking-wide"
            style={{
                fontFamily: getFontFamily(config.typography.fontFamily.heading),
              fontSize: `${config.typography.fontSize.h2}px`,
              fontWeight: config.typography.fontWeight?.heading || 600,
              color: config.design.colors.primary,
              borderBottom: config.design.dividers ? `2px solid ${config.design.colors.primary}` : 'none',
              paddingBottom: config.design.dividers ? '6px' : '0',
            }}
          >
            {applyReplacements(section.title, replacements)}
          </h2>
          {renderBulletPoints(section.bullets, config, replacements)}
        </section>
      ))}
    </BaseTemplate>
  )
}

