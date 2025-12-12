'use client'

import { TemplateProps } from '../types'
import { BaseTemplate, renderBulletPoints, applyReplacements } from '../BaseTemplate'

export default function ModernTemplate({ data, config, replacements }: TemplateProps) {
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
        <h1
          style={{
            fontFamily: config.typography.fontFamily.heading,
            fontSize: `${config.typography.fontSize.h1}px`,
            fontWeight: config.typography.fontWeight?.heading || 700,
            color: config.design.colors.primary,
            marginBottom: '10px',
            letterSpacing: config.typography.letterSpacing || 1,
          }}
        >
          {applyReplacements(data.name, replacements)}
        </h1>
        {data.title && (
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

      {data.summary && (
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

      {orderedSections.map((section) => (
        <section
          key={section.id}
          style={{ marginBottom: `${config.spacing.sectionGap}px` }}
        >
          <h2
            className="mb-4"
            style={{
              fontFamily: config.typography.fontFamily.heading,
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

