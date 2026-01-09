'use client'

import { TemplateProps } from '../types'
import { BaseTemplate, renderBulletPoints, applyReplacements, filterVisibleSections, shouldShowField } from '../BaseTemplate'

export default function GradientTemplate({ data, config, replacements }: TemplateProps) {
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
        className="mb-10"
        style={{
          background: `linear-gradient(135deg, ${config.design.colors.primary} 0%, ${config.design.colors.secondary} 50%, ${config.design.colors.accent} 100%)`,
          color: 'white',
          padding: '48px 36px',
          borderRadius: '16px',
          marginBottom: '36px',
          boxShadow: `0 8px 24px ${config.design.colors.primary}30`,
        }}
      >
        {shouldShowField(data.fieldsVisible, 'name') && (
          <h1
            style={{
              fontFamily: config.typography.fontFamily.heading,
              fontSize: `${config.typography.fontSize.h1}px`,
              fontWeight: config.typography.fontWeight?.heading || 600,
              marginBottom: '16px',
              letterSpacing: config.typography.letterSpacing || 0.3,
              background: 'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.9) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
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
              fontWeight: 400,
            }}
          >
            {applyReplacements(data.title, replacements)}
          </p>
        )}
        <div className="flex flex-wrap gap-4 text-sm" style={{ opacity: 0.9 }}>
          {contactItems.map((item, idx) => (
            <span key={idx} style={{ fontWeight: 300 }}>
              {item}
            </span>
          ))}
        </div>
      </header>

      {shouldShowField(data.fieldsVisible, 'summary') && data.summary && (
        <section style={{ marginBottom: `${config.spacing.sectionGap}px` }}>
          <div
            className="p-5 rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${config.design.colors.primary}10 0%, ${config.design.colors.accent}10 100%)`,
              border: `1px solid ${config.design.colors.primary}20`,
              borderRadius: '12px',
            }}
          >
            <p
              style={{
                fontSize: `${config.typography.fontSize.body + 1}px`,
                lineHeight: config.typography.lineHeight,
                color: config.design.colors.text,
              }}
            >
              {applyReplacements(data.summary, replacements)}
            </p>
          </div>
        </section>
      )}

      {visibleSections.map((section, sectionIdx) => {
        const gradientStart = sectionIdx % 2 === 0 
          ? config.design.colors.primary 
          : config.design.colors.secondary
        const gradientEnd = sectionIdx % 2 === 0 
          ? config.design.colors.secondary 
          : config.design.colors.accent

        return (
          <section
            key={section.id}
            style={{ marginBottom: `${config.spacing.sectionGap}px` }}
          >
            <div className="mb-5">
              <h2
                className="pb-2"
                style={{
                  fontFamily: config.typography.fontFamily.heading,
                  fontSize: `${config.typography.fontSize.h2}px`,
                  fontWeight: config.typography.fontWeight?.heading || 600,
                  background: `linear-gradient(90deg, ${gradientStart} 0%, ${gradientEnd} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginBottom: '8px',
                  position: 'relative',
                }}
              >
                {applyReplacements(section.title, replacements)}
              </h2>
              <div
                style={{
                  height: '3px',
                  background: `linear-gradient(90deg, ${gradientStart} 0%, ${gradientEnd} 100%)`,
                  borderRadius: '2px',
                  width: '60px',
                }}
              />
            </div>
            {renderBulletPoints(section.bullets, config, replacements)}
          </section>
        )
      })}
    </BaseTemplate>
  )
}

