'use client'

import { TemplateProps } from '../types'
import { BaseTemplate, renderBulletPoints, applyReplacements } from '../BaseTemplate'

export default function CreativeTemplate({ data, config, replacements }: TemplateProps) {
  const orderedSections = config.layout.sectionOrder.length > 0
    ? config.layout.sectionOrder
        .map(id => data.sections.find(s => s.id === id))
        .filter(Boolean) as typeof data.sections
    : data.sections

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
        <h1
          style={{
            fontFamily: config.typography.fontFamily.heading,
            fontSize: `${config.typography.fontSize.h1}px`,
            fontWeight: config.typography.fontWeight?.heading || 700,
            marginBottom: '8px',
            letterSpacing: config.typography.letterSpacing || 0,
          }}
        >
          {applyReplacements(data.name, replacements)}
        </h1>
        {data.title && (
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
          {data.email && <span>{data.email}</span>}
          {data.phone && <span>{data.phone}</span>}
          {data.location && <span>{data.location}</span>}
          {data.linkedin && <span>{data.linkedin}</span>}
          {data.website && <span>{data.website}</span>}
        </div>
      </header>

      {data.summary && (
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






