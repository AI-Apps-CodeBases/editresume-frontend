'use client'

import { TemplateProps } from '../types'
import { BaseTemplate, renderBulletPoints, applyReplacements, filterVisibleSections, shouldShowField } from '../BaseTemplate'

export default function AtsFriendlyTemplate({ data, config, replacements }: TemplateProps) {
  const orderedSections = config.layout.sectionOrder.length > 0
    ? config.layout.sectionOrder
        .map(id => data.sections.find(s => s.id === id))
        .filter(Boolean) as typeof data.sections
    : data.sections

  // CRITICAL: Filter sections by visibility - ensures mark/unmark works
  const visibleSections = filterVisibleSections(orderedSections)

  return (
    <BaseTemplate data={data} config={config} replacements={replacements}>
      <header
        className="mb-5"
        style={{
          borderBottom: `2px solid ${config.design.colors.primary}`,
          paddingBottom: '10px',
        }}
      >
        {shouldShowField(data.fieldsVisible, 'name') && (
          <h1
            style={{
              fontFamily: config.typography.fontFamily.heading,
              fontSize: `${config.typography.fontSize.h1}px`,
              fontWeight: config.typography.fontWeight?.heading || 700,
              color: config.design.colors.primary,
              marginBottom: '4px',
            }}
          >
            {applyReplacements(data.name, replacements)}
          </h1>
        )}
        <div
          className="flex flex-wrap gap-3 text-xs"
          style={{ color: config.design.colors.secondary }}
        >
          {shouldShowField(data.fieldsVisible, 'email') && data.email && <span>{data.email}</span>}
          {shouldShowField(data.fieldsVisible, 'phone') && data.phone && <span>{data.phone}</span>}
          {shouldShowField(data.fieldsVisible, 'location') && data.location && <span>{data.location}</span>}
          {shouldShowField(data.fieldsVisible, 'linkedin') && data.linkedin && <span>{data.linkedin}</span>}
          {shouldShowField(data.fieldsVisible, 'website') && data.website && <span>{data.website}</span>}
        </div>
      </header>

      {shouldShowField(data.fieldsVisible, 'summary') && data.summary && (
        <section style={{ marginBottom: `${config.spacing.sectionGap}px` }}>
          <h2
            className="mb-2"
            style={{
              fontFamily: config.typography.fontFamily.heading,
              fontSize: `${config.typography.fontSize.h2}px`,
              fontWeight: config.typography.fontWeight?.heading || 700,
              color: config.design.colors.primary,
              textTransform: 'uppercase',
            }}
          >
            Professional Summary
          </h2>
          <p
            style={{
              fontSize: `${config.typography.fontSize.body}px`,
              lineHeight: config.typography.lineHeight,
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
              fontWeight: config.typography.fontWeight?.heading || 700,
              color: config.design.colors.primary,
              textTransform: 'uppercase',
              borderBottom: config.design.dividers ? `1px solid ${config.design.colors.accent}` : 'none',
              paddingBottom: config.design.dividers ? '2px' : '0',
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






