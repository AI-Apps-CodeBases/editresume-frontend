'use client'

import { TemplateProps } from '../types'
import { BaseTemplate, renderBulletPoints, applyReplacements, filterVisibleSections, shouldShowField } from '../BaseTemplate'
import { getFontFamily } from '../utils'

export default function CorporatePremiumTemplate({ data, config, replacements }: TemplateProps) {
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

  const sidebarWidth = config.layout.columnWidth || 30
  const mainWidth = 100 - sidebarWidth

  const contactItems = [
    { label: 'Email', value: shouldShowField(data.fieldsVisible, 'email') && data.email },
    { label: 'Phone', value: shouldShowField(data.fieldsVisible, 'phone') && data.phone },
    { label: 'Location', value: shouldShowField(data.fieldsVisible, 'location') && data.location },
    { label: 'LinkedIn', value: shouldShowField(data.fieldsVisible, 'linkedin') && data.linkedin },
    { label: 'Website', value: shouldShowField(data.fieldsVisible, 'website') && data.website },
    { label: 'GitHub', value: shouldShowField(data.fieldsVisible, 'github') && data.github },
  ].filter(item => item.value)

  return (
    <BaseTemplate data={data} config={config} replacements={replacements}>
      <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
        {/* Sidebar */}
        <div
          style={{
            width: `${sidebarWidth}%`,
            background: config.design.colors.primary,
            color: 'white',
            padding: '32px 24px',
            borderRadius: '8px',
            minHeight: '200px',
          }}
        >
          {shouldShowField(data.fieldsVisible, 'name') && (
            <h1
              style={{
                fontFamily: getFontFamily(config.typography.fontFamily.heading),
                fontSize: `${config.typography.fontSize.h1}px`,
                fontWeight: config.typography.fontWeight?.heading || 700,
                marginBottom: '8px',
                letterSpacing: '0.5px',
              }}
            >
              {applyReplacements(data.name, replacements)}
            </h1>
          )}
          {shouldShowField(data.fieldsVisible, 'title') && data.title && (
            <p
              style={{
                fontSize: `${config.typography.fontSize.body + 2}px`,
                opacity: 0.9,
                marginBottom: '24px',
                fontWeight: 300,
              }}
            >
              {applyReplacements(data.title, replacements)}
            </p>
          )}

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '20px', marginTop: '20px' }}>
            {contactItems.map((item, idx) => (
              <div key={idx} style={{ marginBottom: '12px' }}>
                <div
                  style={{
                    fontSize: `${config.typography.fontSize.body - 1}px`,
                    opacity: 0.8,
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontWeight: 600,
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontSize: `${config.typography.fontSize.body}px`,
                    fontWeight: 400,
                  }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div style={{ width: `${mainWidth}%` }}>
          {shouldShowField(data.fieldsVisible, 'summary') && data.summary && (
            <section style={{ marginBottom: `${config.spacing.sectionGap}px` }}>
              <h2
                className="mb-3"
                style={{
                  fontFamily: getFontFamily(config.typography.fontFamily.heading),
                  fontSize: `${config.typography.fontSize.h2}px`,
                  fontWeight: config.typography.fontWeight?.heading || 700,
                  color: config.design.colors.primary,
                  borderBottom: `2px solid ${config.design.colors.accent}`,
                  paddingBottom: '6px',
                  display: 'inline-block',
                }}
              >
                Professional Summary
              </h2>
              <p
                style={{
                  fontSize: `${config.typography.fontSize.body}px`,
                  lineHeight: config.typography.lineHeight,
                  color: config.design.colors.text,
                  marginTop: '12px',
                }}
              >
                {applyReplacements(data.summary, replacements)}
              </p>
            </section>
          )}
        </div>
      </div>

      {/* Main Content Sections */}
      <div style={{ width: '100%' }}>
        {visibleSections.map((section) => (
          <section
            key={section.id}
            style={{ marginBottom: `${config.spacing.sectionGap}px` }}
          >
            <h2
              className="mb-3"
              style={{
                fontFamily: getFontFamily(config.typography.fontFamily.heading),
                fontSize: `${config.typography.fontSize.h2}px`,
                fontWeight: config.typography.fontWeight?.heading || 700,
                color: config.design.colors.primary,
                borderBottom: `2px solid ${config.design.colors.accent}`,
                paddingBottom: '6px',
                display: 'inline-block',
              }}
            >
              {applyReplacements(section.title, replacements)}
            </h2>
            {renderBulletPoints(section.bullets, config, replacements)}
          </section>
        ))}
      </div>
    </BaseTemplate>
  )
}

