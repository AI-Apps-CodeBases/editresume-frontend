'use client'

import { TemplateProps } from '../types'
import { BaseTemplate, renderBulletPoints, applyReplacements } from '../BaseTemplate'

export default function ClassicTemplate({ data, config, replacements }: TemplateProps) {
  const orderedSections = config.layout.sectionOrder.length > 0
    ? config.layout.sectionOrder
        .map(id => data.sections.find(s => s.id === id))
        .filter(Boolean) as typeof data.sections
    : data.sections

  const contactItems = [
    data.email,
    data.phone,
    data.location,
    data.linkedin,
    data.website,
    data.github,
  ].filter(Boolean)

  return (
    <BaseTemplate data={data} config={config} replacements={replacements}>
      <header
        className="mb-8"
        style={{
          borderBottom: config.design.dividers ? `3px solid ${config.design.colors.primary}` : 'none',
          paddingBottom: config.design.dividers ? '20px' : '0',
          marginBottom: config.design.dividers ? '24px' : '16px',
        }}
      >
        <div className="text-center mb-4">
          <h1
            style={{
              fontFamily: config.typography.fontFamily.heading,
              fontSize: `${config.typography.fontSize.h1}px`,
              fontWeight: config.typography.fontWeight?.heading || 700,
              color: config.design.colors.primary,
              marginBottom: '8px',
              letterSpacing: '0.5px',
            }}
          >
            {applyReplacements(data.name, replacements)}
          </h1>
          {data.title && (
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
        </div>
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

      {data.summary && (
        <section style={{ marginBottom: `${config.spacing.sectionGap}px` }}>
          <h2
            className="mb-3 uppercase tracking-wide"
            style={{
              fontFamily: config.typography.fontFamily.heading,
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

      {orderedSections.map((section) => (
        <section
          key={section.id}
          style={{ marginBottom: `${config.spacing.sectionGap}px` }}
        >
          <h2
            className="mb-3 uppercase tracking-wide"
            style={{
              fontFamily: config.typography.fontFamily.heading,
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

