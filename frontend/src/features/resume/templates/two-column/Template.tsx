'use client'

import { TemplateProps } from '../types'
import { BaseTemplate, renderBulletPoints, applyReplacements, filterVisibleSections, shouldShowField } from '../BaseTemplate'

const SUMMARY_ID = '__summary__'

export default function TwoColumnTemplate({ data, config, replacements }: TemplateProps) {
  const orderedSections = config.layout.sectionOrder.length > 0
    ? config.layout.sectionOrder
        .map(id => data.sections.find(s => s.id === id))
        .filter(Boolean) as typeof data.sections
    : data.sections

  const visibleSections = filterVisibleSections(orderedSections)

  const leftIdsFromConfig = config.layout.twoColumnLeft
  const rightIdsFromConfig = config.layout.twoColumnRight
  
  // Debug: log config values
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('TwoColumnTemplate config:', {
      twoColumnLeft: leftIdsFromConfig,
      twoColumnRight: rightIdsFromConfig,
      hasLeft: leftIdsFromConfig !== undefined,
      hasRight: rightIdsFromConfig !== undefined
    })
  }
  
  const hasConfigDistribution = leftIdsFromConfig !== undefined || rightIdsFromConfig !== undefined
  
  const leftIds: string[] = hasConfigDistribution 
    ? (Array.isArray(leftIdsFromConfig) ? leftIdsFromConfig : [])
    : (() => {
        const leftColumnKeywords = ['skill', 'certificate', 'certification', 'education', 'academic', 'qualification', 'award', 'honor']
        const defaultLeft: string[] = []
        
        if (data.summary && shouldShowField(data.fieldsVisible, 'summary')) {
          defaultLeft.push(SUMMARY_ID)
        }
        
        return [
          ...defaultLeft,
          ...visibleSections
            .filter(s => {
              const titleLower = s.title.toLowerCase()
              return leftColumnKeywords.some(keyword => titleLower.includes(keyword))
            })
            .map(s => s.id)
        ]
      })()
  
  const rightIds: string[] = hasConfigDistribution
    ? (Array.isArray(rightIdsFromConfig) ? rightIdsFromConfig : [])
    : (() => {
        const leftColumnKeywords = ['skill', 'certificate', 'certification', 'education', 'academic', 'qualification', 'award', 'honor']
        return visibleSections
          .filter(s => {
            const titleLower = s.title.toLowerCase()
            return !leftColumnKeywords.some(keyword => titleLower.includes(keyword))
          })
          .map(s => s.id)
      })()

  const leftSections = visibleSections.filter(s => leftIds.includes(s.id))
  const rightSections = visibleSections.filter(s => rightIds.includes(s.id) || (!leftIds.includes(s.id) && !rightIds.includes(s.id)))
  const summaryInLeft = leftIds.includes(SUMMARY_ID)
  const summaryInRight = rightIds.includes(SUMMARY_ID)

  return (
    <BaseTemplate data={data} config={config} replacements={replacements}>
      <header
        className="mb-6"
        style={{
          borderBottom: `2px solid ${config.design.colors.primary}`,
          paddingBottom: '12px',
        }}
      >
        {shouldShowField(data.fieldsVisible, 'name') && (
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
        )}
        {shouldShowField(data.fieldsVisible, 'title') && data.title && (
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
          {shouldShowField(data.fieldsVisible, 'email') && data.email && <span>{data.email}</span>}
          {shouldShowField(data.fieldsVisible, 'phone') && data.phone && <span>{data.phone}</span>}
          {shouldShowField(data.fieldsVisible, 'location') && data.location && <span>{data.location}</span>}
        </div>
      </header>

      <div className="flex" style={{ gap: `${config.spacing.sectionGap}px` }}>
        <div style={{ width: `${config.layout.columnWidth || 40}%`, display: 'flex', flexDirection: 'column', gap: `${config.spacing.sectionGap}px` }}>
          {shouldShowField(data.fieldsVisible, 'summary') && data.summary && summaryInLeft && (
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
          {shouldShowField(data.fieldsVisible, 'summary') && data.summary && summaryInRight && (
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

          {rightSections.map((section) => (
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

