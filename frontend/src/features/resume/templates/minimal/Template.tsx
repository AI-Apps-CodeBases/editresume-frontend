'use client'

import { TemplateProps } from '../types'
import { BaseTemplate, renderBulletPoints, applyReplacements, filterVisibleSections, shouldShowField } from '../BaseTemplate'

export default function MinimalTemplate({ data, config, replacements }: TemplateProps) {
  const orderedSections = config.layout.sectionOrder.length > 0
    ? config.layout.sectionOrder
        .map(id => data.sections.find(s => s.id === id))
        .filter(Boolean) as typeof data.sections
    : data.sections

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
      <header className="mb-8">
        {shouldShowField(data.fieldsVisible, 'name') && (
          <h1
            style={{
              fontFamily: config.typography.fontFamily.heading,
              fontSize: `${config.typography.fontSize.h1}px`,
              fontWeight: config.typography.fontWeight?.heading || 500,
              color: config.design.colors.primary,
              marginBottom: '4px',
              letterSpacing: config.typography.letterSpacing || 0.3,
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
              marginBottom: '8px',
            }}
          >
            {applyReplacements(data.title, replacements)}
          </p>
        )}
        <div
          className="flex flex-wrap gap-2 text-xs"
          style={{ color: config.design.colors.secondary }}
        >
          {contactItems.map((item, idx) => (
            <span key={idx}>
              {item}
              {idx < contactItems.length - 1 && <span className="mx-1">•</span>}
            </span>
          ))}
        </div>
      </header>

      {shouldShowField(data.fieldsVisible, 'summary') && data.summary && (
        <section style={{ marginBottom: `${config.spacing.sectionGap}px` }}>
          <p
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
            className="mb-2"
            style={{
              fontFamily: config.typography.fontFamily.heading,
              fontSize: `${config.typography.fontSize.h2}px`,
              fontWeight: config.typography.fontWeight?.heading || 500,
              color: config.design.colors.primary,
              textTransform: 'uppercase',
              letterSpacing: '1px',
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

