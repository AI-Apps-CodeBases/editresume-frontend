'use client'

import { TemplateProps } from '../types'
import { BaseTemplate, renderBulletPoints, applyReplacements, filterVisibleSections, shouldShowField } from '../BaseTemplate'

// Icon placeholders - in a real implementation, these would be SVG icons
const SectionIcons: Record<string, string> = {
  'Experience': '💼',
  'Education': '🎓',
  'Skills': '⚡',
  'Projects': '🚀',
  'Certifications': '🏆',
  'Awards': '⭐',
  'Languages': '🌐',
  'Publications': '📚',
}

const getSectionIcon = (title: string): string => {
  const normalizedTitle = title.toLowerCase()
  for (const [key, icon] of Object.entries(SectionIcons)) {
    if (normalizedTitle.includes(key.toLowerCase())) {
      return icon
    }
  }
  return '📋'
}

export default function InfographicTemplate({ data, config, replacements }: TemplateProps) {
  const orderedSections = config.layout.sectionOrder.length > 0
    ? config.layout.sectionOrder
        .map(id => data.sections.find(s => s.id === id))
        .filter(Boolean) as typeof data.sections
    : data.sections

  // CRITICAL: Filter sections by visibility - ensures mark/unmark works
  const visibleSections = filterVisibleSections(orderedSections)

  const contactItems = [
    { icon: '📧', value: shouldShowField(data.fieldsVisible, 'email') && data.email },
    { icon: '📱', value: shouldShowField(data.fieldsVisible, 'phone') && data.phone },
    { icon: '📍', value: shouldShowField(data.fieldsVisible, 'location') && data.location },
    { icon: '💼', value: shouldShowField(data.fieldsVisible, 'linkedin') && data.linkedin },
    { icon: '🌐', value: shouldShowField(data.fieldsVisible, 'website') && data.website },
    { icon: '💻', value: shouldShowField(data.fieldsVisible, 'github') && data.github },
  ].filter(item => item.value)

  return (
    <BaseTemplate data={data} config={config} replacements={replacements}>
      <header
        className="mb-10"
        style={{
          background: `linear-gradient(135deg, ${config.design.colors.primary}15 0%, ${config.design.colors.accent}15 100%)`,
          padding: '32px',
          borderRadius: '16px',
          border: `2px solid ${config.design.colors.primary}30`,
          marginBottom: '32px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${config.design.colors.primary} 0%, ${config.design.colors.accent} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
              boxShadow: `0 4px 12px ${config.design.colors.primary}40`,
            }}
          >
            👤
          </div>
          <div style={{ flex: 1 }}>
            {shouldShowField(data.fieldsVisible, 'name') && (
              <h1
                style={{
                  fontFamily: config.typography.fontFamily.heading,
                  fontSize: `${config.typography.fontSize.h1}px`,
                  fontWeight: config.typography.fontWeight?.heading || 700,
                  color: config.design.colors.primary,
                  marginBottom: '8px',
                  letterSpacing: config.typography.letterSpacing || 0.3,
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
                  fontWeight: 500,
                }}
              >
                {applyReplacements(data.title, replacements)}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-4" style={{ marginTop: '16px' }}>
          {contactItems.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: `${config.typography.fontSize.body}px`,
                color: config.design.colors.text,
              }}
            >
              <span style={{ fontSize: '16px' }}>{item.icon}</span>
              <span>{item.value}</span>
            </div>
          ))}
        </div>
      </header>

      {shouldShowField(data.fieldsVisible, 'summary') && data.summary && (
        <section style={{ marginBottom: `${config.spacing.sectionGap}px` }}>
          <div
            className="p-5 rounded-xl"
            style={{
              background: `${config.design.colors.accent}10`,
              border: `2px solid ${config.design.colors.accent}30`,
              borderRadius: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
              <span style={{ fontSize: '24px', lineHeight: 1 }}>💡</span>
              <p
                style={{
                  fontSize: `${config.typography.fontSize.body + 1}px`,
                  lineHeight: config.typography.lineHeight,
                  color: config.design.colors.text,
                  margin: 0,
                  flex: 1,
                }}
              >
                {applyReplacements(data.summary, replacements)}
              </p>
            </div>
          </div>
        </section>
      )}

      {visibleSections.map((section) => {
        const icon = getSectionIcon(section.title)
        return (
          <section
            key={section.id}
            style={{
              marginBottom: `${config.spacing.sectionGap}px`,
              padding: '20px',
              background: `${config.design.colors.primary}05`,
              borderRadius: '12px',
              border: `1px solid ${config.design.colors.primary}20`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: `linear-gradient(135deg, ${config.design.colors.primary} 0%, ${config.design.colors.accent} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  boxShadow: `0 2px 8px ${config.design.colors.primary}30`,
                }}
              >
                {icon}
              </div>
              <h2
                style={{
                  fontFamily: config.typography.fontFamily.heading,
                  fontSize: `${config.typography.fontSize.h2}px`,
                  fontWeight: config.typography.fontWeight?.heading || 700,
                  color: config.design.colors.primary,
                  margin: 0,
                  letterSpacing: config.typography.letterSpacing || 0.3,
                }}
              >
                {applyReplacements(section.title, replacements)}
              </h2>
            </div>
            <div style={{ paddingLeft: '8px' }}>
              {renderBulletPoints(section.bullets, config, replacements)}
            </div>
          </section>
        )
      })}
    </BaseTemplate>
  )
}

