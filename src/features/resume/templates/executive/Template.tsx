'use client'

import { TemplateProps } from '../types'
import { BaseTemplate, renderBulletPoints, applyReplacements } from '../BaseTemplate'

export default function ExecutiveTemplate({ data, config, replacements }: TemplateProps) {
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
          borderBottom: `1px solid ${config.design.colors.accent}`,
          paddingBottom: '24px',
          marginBottom: '32px',
        }}
      >
        <h1
          style={{
            fontFamily: config.typography.fontFamily.heading,
            fontSize: `${config.typography.fontSize.h1}px`,
            fontWeight: config.typography.fontWeight?.heading || 700,
            color: config.design.colors.primary,
            marginBottom: '12px',
            letterSpacing: config.typography.letterSpacing || 0.3,
          }}
        >
          {applyReplacements(data.name, replacements)}
        </h1>
        {data.title && (
          <p
            style={{
              fontSize: `${config.typography.fontSize.body + 3}px`,
              color: config.design.colors.accent,
              marginBottom: '16px',
              fontWeight: 400,
              fontStyle: 'italic',
              letterSpacing: '2px',
            }}
          >
            {applyReplacements(data.title, replacements)}
          </p>
        )}
        <div
          className="flex flex-wrap justify-center gap-4 text-sm"
          style={{ 
            color: config.design.colors.secondary,
            fontSize: `${config.typography.fontSize.body}px`,
            letterSpacing: '0.5px',
          }}
        >
          {contactItems.map((item, idx) => (
            <span key={idx}>{item}</span>
          ))}
        </div>
      </header>

      {data.summary && (
        <section className="mb-10">
          <div className="text-center mb-4">
            <div
              className="mx-auto mb-4"
              style={{
                width: '60px',
                height: '1px',
                background: config.design.colors.accent,
              }}
            />
          </div>
          <p
            className="text-center leading-relaxed italic"
            style={{
              fontSize: `${config.typography.fontSize.body + 1}px`,
              lineHeight: config.typography.lineHeight,
              color: config.design.colors.text,
              maxWidth: '90%',
              margin: '0 auto',
            }}
          >
            {applyReplacements(data.summary, replacements)}
          </p>
        </section>
      )}

      {orderedSections.map((section) => (
        <section
          key={section.id}
          className="mb-8"
          style={{ marginBottom: `${config.spacing.sectionGap}px` }}
        >
          <div className="flex items-center mb-4">
            <div
              style={{
                width: '40px',
                height: '2px',
                background: config.design.colors.accent,
                marginRight: '12px',
              }}
            />
            <h2
              className="uppercase tracking-widest"
              style={{
                fontFamily: config.typography.fontFamily.heading,
                fontSize: `${config.typography.fontSize.h2}px`,
                fontWeight: config.typography.fontWeight?.heading || 700,
                color: config.design.colors.primary,
                letterSpacing: '3px',
              }}
            >
              {applyReplacements(section.title, replacements)}
            </h2>
            <div
              className="flex-1 ml-4"
              style={{
                height: '1px',
                background: config.design.colors.accent,
              }}
            />
          </div>
          {renderBulletPoints(section.bullets, config, replacements)}
        </section>
      ))}
    </BaseTemplate>
  )
}




