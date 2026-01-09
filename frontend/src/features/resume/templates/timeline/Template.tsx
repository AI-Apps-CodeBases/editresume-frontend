'use client'

import { TemplateProps } from '../types'
import { BaseTemplate, renderBulletPoints, applyReplacements, filterVisibleSections, shouldShowField, filterVisibleBullets } from '../BaseTemplate'
import { getFontFamily } from '../utils'

export default function TimelineTemplate({ data, config, replacements }: TemplateProps) {
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
          borderBottom: `3px solid ${config.design.colors.primary}`,
          paddingBottom: '20px',
          marginBottom: '32px',
        }}
      >
        {shouldShowField(data.fieldsVisible, 'name') && (
          <h1
            style={{
              fontFamily: config.typography.fontFamily.heading,
              fontSize: `${config.typography.fontSize.h1}px`,
              fontWeight: config.typography.fontWeight?.heading || 600,
              color: config.design.colors.primary,
              marginBottom: '8px',
              letterSpacing: config.typography.letterSpacing || 0.2,
            }}
          >
            {applyReplacements(data.name, replacements)}
          </h1>
        )}
        {shouldShowField(data.fieldsVisible, 'title') && data.title && (
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
        <div className="flex flex-wrap gap-3 text-sm" style={{ color: config.design.colors.secondary }}>
          {contactItems.map((item, idx) => (
            <span key={idx}>
              {item}
              {idx < contactItems.length - 1 && <span className="mx-2">•</span>}
            </span>
          ))}
        </div>
      </header>

      {shouldShowField(data.fieldsVisible, 'summary') && data.summary && (
        <section style={{ marginBottom: `${config.spacing.sectionGap}px` }}>
          <div
            style={{
              paddingLeft: '24px',
              borderLeft: `3px solid ${config.design.colors.accent}`,
              marginLeft: '8px',
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

      {visibleSections.map((section) => {
        // CRITICAL: Filter bullets by visibility for timeline template
        const visibleBullets = filterVisibleBullets(section.bullets)
        return (
        <section
          key={section.id}
          style={{
            marginBottom: `${config.spacing.sectionGap}px`,
            position: 'relative',
            paddingLeft: '32px',
          }}
        >
          {/* Timeline line */}
          <div
            style={{
              position: 'absolute',
              left: '8px',
              top: '0',
              bottom: '-24px',
              width: '3px',
              background: config.design.colors.primary,
              borderRadius: '2px',
            }}
          />
          
          {/* Timeline marker */}
          <div
            style={{
              position: 'absolute',
              left: '0',
              top: '4px',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: config.design.colors.primary,
              border: `3px solid white`,
              boxShadow: `0 0 0 2px ${config.design.colors.primary}`,
            }}
          />

          <h2
            className="mb-4"
            style={{
              fontFamily: config.typography.fontFamily.heading,
              fontSize: `${config.typography.fontSize.h2}px`,
              fontWeight: config.typography.fontWeight?.heading || 600,
              color: config.design.colors.primary,
              marginBottom: '12px',
            }}
          >
            {applyReplacements(section.title, replacements)}
          </h2>
          
          <div style={{ paddingLeft: '8px' }}>
            {visibleBullets.map((bullet, bulletIdx) => {
              const text = applyReplacements(bullet.text, replacements)
              // Check if it's a company header (starts with **)
              const isHeader = text.startsWith('**') && text.includes('**', 2)
              let cleanText = text.replace(/\*\*/g, '')
              
              // Remove bullet characters
              const bulletChars = ['•', '▪', '▫', '◦', '‣', '⁃', '→', '·', '○', '●', '◾', '◽', '■', '-', '*']
              bulletChars.forEach(char => {
                cleanText = cleanText.replace(new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '').trim()
              })

              if (isHeader) {
                return (
                  <div
                    key={bullet.id}
                    style={{
                      marginBottom: '8px',
                      marginTop: bulletIdx > 0 ? '12px' : '0',
                      paddingLeft: '20px',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: '0',
                        top: '8px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: config.design.colors.accent,
                      }}
                    />
                    <div
                      style={{
                        fontFamily: getFontFamily(config.typography.fontFamily.heading),
                        fontSize: `${config.typography.fontSize.body + 1}px`,
                        fontWeight: 600,
                        color: config.design.colors.primary,
                      }}
                      dangerouslySetInnerHTML={{ __html: cleanText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                    />
                  </div>
                )
              }

              return (
                <div
                  key={bullet.id}
                  style={{
                    marginBottom: `${config.spacing.itemGap}px`,
                    paddingLeft: '20px',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: '0',
                      top: '6px',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: config.design.colors.accent,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: getFontFamily(config.typography.fontFamily.body),
                      fontSize: `${config.typography.fontSize.body}px`,
                      lineHeight: config.typography.lineHeight,
                      color: config.design.colors.text,
                    }}
                    dangerouslySetInnerHTML={{ __html: cleanText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                  />
                </div>
              )
            })}
          </div>
        </section>
        )
      })}
    </BaseTemplate>
  )
}

