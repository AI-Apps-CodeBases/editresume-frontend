'use client'

import { TemplateProps } from '../types'
import { BaseTemplate, renderBulletPoints, applyReplacements, filterVisibleSections, shouldShowField } from '../BaseTemplate'
import { getFontFamily } from '../utils'

export default function ModernTemplate({ data, config, replacements }: TemplateProps) {
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
        className="mb-10 text-center"
        style={{
          borderBottom: `4px solid ${config.design.colors.primary}`,
          paddingBottom: '24px',
          marginBottom: '28px',
        }}
      >
        {shouldShowField(data.fieldsVisible, 'name') && (
          <h1
            style={{
                fontFamily: getFontFamily(config.typography.fontFamily.heading),
              fontSize: `${config.typography.fontSize.h1}px`,
              fontWeight: config.typography.fontWeight?.heading || 700,
              color: config.design.colors.primary,
              marginBottom: '10px',
              letterSpacing: config.typography.letterSpacing || 1,
            }}
          >
            {applyReplacements(data.name, replacements)}
          </h1>
        )}
        {shouldShowField(data.fieldsVisible, 'title') && data.title && (
          <p
            style={{
              fontSize: `${config.typography.fontSize.body + 3}px`,
              color: config.design.colors.secondary,
              marginBottom: '16px',
              fontWeight: 500,
            }}
          >
            {applyReplacements(data.title, replacements)}
          </p>
        )}
        <div
          className="flex flex-wrap justify-center gap-4 text-sm"
          style={{ color: config.design.colors.secondary }}
        >
          {contactItems.map((item, idx) => (
            <span key={idx}>{item}</span>
          ))}
        </div>
      </header>

      {shouldShowField(data.fieldsVisible, 'summary') && data.summary && (
        <section style={{ marginBottom: `${config.spacing.sectionGap}px` }}>
          <div
            className="mb-4"
            style={{
              height: '3px',
              background: `linear-gradient(to right, ${config.design.colors.primary}, ${config.design.colors.accent}, transparent)`,
              borderRadius: '2px',
            }}
          />
          <p
            className="leading-relaxed"
            style={{
              fontSize: `${config.typography.fontSize.body + 1}px`,
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
            className="mb-4"
            style={{
                fontFamily: getFontFamily(config.typography.fontFamily.heading),
              fontSize: `${config.typography.fontSize.h2}px`,
              fontWeight: config.typography.fontWeight?.heading || 700,
              color: config.design.colors.primary,
              textTransform: 'uppercase',
              letterSpacing: '2px',
              borderLeft: `4px solid ${config.design.colors.primary}`,
              paddingLeft: '12px',
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

