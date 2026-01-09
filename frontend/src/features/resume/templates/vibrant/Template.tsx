'use client'

import { TemplateProps } from '../types'
import { BaseTemplate, renderBulletPoints, applyReplacements, filterVisibleSections, shouldShowField } from '../BaseTemplate'

// Color palette for different sections
const sectionColors = [
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#f59e0b', // Orange
  '#10b981', // Green
  '#ef4444', // Red
  '#06b6d4', // Cyan
]

export default function VibrantTemplate({ data, config, replacements }: TemplateProps) {
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
    shouldShowField(data.fieldsVisible, 'github') && data.github,
  ].filter(Boolean)

  return (
    <BaseTemplate data={data} config={config} replacements={replacements}>
      <header
        className="mb-8"
        style={{
          background: `linear-gradient(135deg, ${config.design.colors.primary} 0%, ${config.design.colors.secondary} 100%)`,
          color: 'white',
          padding: '40px 32px',
          borderRadius: '12px',
          marginBottom: '32px',
          boxShadow: `0 4px 12px ${config.design.colors.primary}40`,
        }}
      >
        {shouldShowField(data.fieldsVisible, 'name') && (
          <h1
            style={{
              fontFamily: config.typography.fontFamily.heading,
              fontSize: `${config.typography.fontSize.h1}px`,
              fontWeight: config.typography.fontWeight?.heading || 700,
              marginBottom: '12px',
              letterSpacing: config.typography.letterSpacing || 0.5,
              textShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            {applyReplacements(data.name, replacements)}
          </h1>
        )}
        {shouldShowField(data.fieldsVisible, 'title') && data.title && (
          <p
            style={{
              fontSize: `${config.typography.fontSize.body + 4}px`,
              opacity: 0.95,
              marginBottom: '20px',
              fontWeight: 500,
            }}
          >
            {applyReplacements(data.title, replacements)}
          </p>
        )}
        <div className="flex flex-wrap gap-4 text-sm" style={{ opacity: 0.9 }}>
          {contactItems.map((item, idx) => (
            <span key={idx} style={{ fontWeight: 400 }}>
              {item}
            </span>
          ))}
        </div>
      </header>

      {shouldShowField(data.fieldsVisible, 'summary') && data.summary && (
        <section style={{ marginBottom: `${config.spacing.sectionGap}px` }}>
          <div
            className="p-5 rounded-lg"
            style={{
              background: `${config.design.colors.accent}15`,
              borderLeft: `5px solid ${config.design.colors.accent}`,
              borderRadius: '8px',
            }}
          >
            <p
              style={{
                fontSize: `${config.typography.fontSize.body + 1}px`,
                lineHeight: config.typography.lineHeight,
                color: config.design.colors.text,
                fontStyle: 'italic',
              }}
            >
              {applyReplacements(data.summary, replacements)}
            </p>
          </div>
        </section>
      )}

      {visibleSections.map((section, sectionIdx) => {
        const sectionColor = sectionColors[sectionIdx % sectionColors.length]
        return (
          <section
            key={section.id}
            style={{ marginBottom: `${config.spacing.sectionGap}px` }}
          >
            <div
              className="mb-4 p-3 rounded-lg"
              style={{
                background: sectionColor,
                color: 'white',
                boxShadow: `0 2px 8px ${sectionColor}40`,
              }}
            >
              <h2
                style={{
                  fontFamily: config.typography.fontFamily.heading,
                  fontSize: `${config.typography.fontSize.h2}px`,
                  fontWeight: config.typography.fontWeight?.heading || 700,
                  margin: 0,
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                }}
              >
                {applyReplacements(section.title, replacements)}
              </h2>
            </div>
            {renderBulletPoints(section.bullets, config, replacements)}
          </section>
        )
      })}
    </BaseTemplate>
  )
}

