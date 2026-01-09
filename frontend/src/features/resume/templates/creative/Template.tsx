'use client'

import { TemplateProps } from '../types'
import { BaseTemplate, renderBulletPoints, applyReplacements, filterVisibleSections, shouldShowField } from '../BaseTemplate'
import { getFontFamily } from '../utils'

export default function CreativeTemplate({ data, config, replacements }: TemplateProps) {
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

  return (
    <BaseTemplate data={data} config={config} replacements={replacements}>
      <header
        className="mb-8"
        style={{
          background: `linear-gradient(135deg, ${config.design.colors.primary} 0%, ${config.design.colors.accent} 100%)`,
          color: 'white',
          padding: '32px',
          borderRadius: '8px',
          marginBottom: '32px',
        }}
      >
        {shouldShowField(data.fieldsVisible, 'name') && (
          <h1
            style={{
                fontFamily: getFontFamily(config.typography.fontFamily.heading),
              fontSize: `${config.typography.fontSize.h1}px`,
              fontWeight: config.typography.fontWeight?.heading || 700,
              marginBottom: '8px',
              letterSpacing: config.typography.letterSpacing || 0,
            }}
          >
            {applyReplacements(data.name, replacements)}
          </h1>
        )}
        {shouldShowField(data.fieldsVisible, 'title') && data.title && (
          <p
            style={{
              fontSize: `${config.typography.fontSize.body + 3}px`,
              opacity: 0.95,
              marginBottom: '16px',
            }}
          >
            {applyReplacements(data.title, replacements)}
          </p>
        )}
        <div className="flex flex-wrap gap-4 text-sm" style={{ opacity: 0.9 }}>
          {shouldShowField(data.fieldsVisible, 'email') && data.email && <span>{data.email}</span>}
          {shouldShowField(data.fieldsVisible, 'phone') && data.phone && <span>{data.phone}</span>}
          {shouldShowField(data.fieldsVisible, 'location') && data.location && <span>{data.location}</span>}
          {shouldShowField(data.fieldsVisible, 'linkedin') && data.linkedin && <span>{data.linkedin}</span>}
          {shouldShowField(data.fieldsVisible, 'website') && data.website && <span>{data.website}</span>}
        </div>
      </header>

      {shouldShowField(data.fieldsVisible, 'summary') && data.summary && (
        <section style={{ marginBottom: `${config.spacing.sectionGap}px` }}>
          <div
            className="mb-4 p-4 rounded-lg"
            style={{
              background: `${config.design.colors.primary}15`,
              borderLeft: `4px solid ${config.design.colors.primary}`,
            }}
          >
            <p
              style={{
                fontSize: `${config.typography.fontSize.body + 1}px`,
                lineHeight: config.typography.lineHeight,
                fontStyle: 'italic',
              }}
            >
              {applyReplacements(data.summary, replacements)}
            </p>
          </div>
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
              position: 'relative',
              paddingLeft: '16px',
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '4px',
                background: config.design.colors.primary,
                borderRadius: '2px',
              }}
            />
            {applyReplacements(section.title, replacements)}
          </h2>
          {renderBulletPoints(section.bullets, config, replacements)}
        </section>
      ))}
    </BaseTemplate>
  )
}






