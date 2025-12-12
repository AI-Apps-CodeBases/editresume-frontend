'use client'

import { TemplateProps } from '../types'
import { BaseTemplate, renderBulletPoints, applyReplacements } from '../BaseTemplate'

export default function TwoColumnTemplate({ data, config, replacements }: TemplateProps) {
  const orderedSections = config.layout.sectionOrder.length > 0
    ? config.layout.sectionOrder
        .map(id => data.sections.find(s => s.id === id))
        .filter(Boolean) as typeof data.sections
    : data.sections

  const leftColumnSections = ['Skills', 'Education', 'Certifications', 'Languages']
  const rightColumnSections = orderedSections.filter(
    s => !leftColumnSections.some(lc => s.title.toLowerCase().includes(lc.toLowerCase()))
  )
  const leftSections = orderedSections.filter(
    s => leftColumnSections.some(lc => s.title.toLowerCase().includes(lc.toLowerCase()))
  )

  return (
    <BaseTemplate data={data} config={config} replacements={replacements}>
      <header
        className="mb-6"
        style={{
          borderBottom: `2px solid ${config.design.colors.primary}`,
          paddingBottom: '12px',
        }}
      >
        <h1
          style={{
            fontFamily: config.typography.fontFamily.heading,
            fontSize: `${config.typography.fontSize.h1}px`,
            fontWeight: config.typography.fontWeight?.heading || 600,
            color: config.design.colors.primary,
            marginBottom: '4px',
          }}
        >
          {applyReplacements(data.name, replacements)}
        </h1>
        {data.title && (
          <p
            style={{
              fontSize: `${config.typography.fontSize.body + 1}px`,
              color: config.design.colors.secondary,
              marginBottom: '6px',
            }}
          >
            {applyReplacements(data.title, replacements)}
          </p>
        )}
        <div
          className="flex flex-wrap gap-3 text-xs"
          style={{ color: config.design.colors.secondary }}
        >
          {data.email && <span>{data.email}</span>}
          {data.phone && <span>{data.phone}</span>}
          {data.location && <span>{data.location}</span>}
        </div>
      </header>

      <div className="flex" style={{ gap: `${config.spacing.sectionGap}px` }}>
        <div style={{ width: `${config.layout.columnWidth || 40}%`, display: 'flex', flexDirection: 'column', gap: `${config.spacing.sectionGap}px` }}>
          {data.summary && (
            <section>
              <h2
                className="mb-2"
                style={{
                  fontFamily: config.typography.fontFamily.heading,
                  fontSize: `${config.typography.fontSize.h2}px`,
                  fontWeight: config.typography.fontWeight?.heading || 600,
                  color: config.design.colors.primary,
                  borderBottom: `1px solid ${config.design.colors.accent}`,
                  paddingBottom: '4px',
                }}
              >
                Summary
              </h2>
              <p
                className="text-xs"
                style={{
                  fontSize: `${config.typography.fontSize.body}px`,
                  lineHeight: config.typography.lineHeight,
                }}
              >
                {applyReplacements(data.summary, replacements)}
              </p>
            </section>
          )}

          {leftSections.map((section) => (
            <section key={section.id}>
              <h2
                className="mb-2"
                style={{
                  fontFamily: config.typography.fontFamily.heading,
                  fontSize: `${config.typography.fontSize.h2}px`,
                  fontWeight: config.typography.fontWeight?.heading || 600,
                  color: config.design.colors.primary,
                  borderBottom: `1px solid ${config.design.colors.accent}`,
                  paddingBottom: '4px',
                }}
              >
                {applyReplacements(section.title, replacements)}
              </h2>
              {renderBulletPoints(section.bullets, config, replacements)}
            </section>
          ))}
        </div>

        <div style={{ width: `${100 - (config.layout.columnWidth || 40)}%`, display: 'flex', flexDirection: 'column', gap: `${config.spacing.sectionGap}px` }}>
          {rightColumnSections.map((section) => (
            <section key={section.id}>
              <h2
                className="mb-2"
                style={{
                  fontFamily: config.typography.fontFamily.heading,
                  fontSize: `${config.typography.fontSize.h2}px`,
                  fontWeight: config.typography.fontWeight?.heading || 600,
                  color: config.design.colors.primary,
                  borderBottom: `1px solid ${config.design.colors.accent}`,
                  paddingBottom: '4px',
                }}
              >
                {applyReplacements(section.title, replacements)}
              </h2>
              {renderBulletPoints(section.bullets, config, replacements)}
            </section>
          ))}
        </div>
      </div>
    </BaseTemplate>
  )
}

