/**
 * Section deduplication utilities
 * Handles merging of duplicate sections with semantic title normalization
 */

export interface Section {
  id: string
  title: string
  bullets: Array<{
    id: string
    text: string
    params?: Record<string, any>
  }>
}

/**
 * Normalize section title for semantic comparison
 * Handles variations like "Work Experience" vs "Experience" vs "Professional Experience"
 */
export function normalizeSectionTitle(title: string): string {
  const normalized = title.toLowerCase().trim()
  
  // Semantic mapping for section titles
  // REMOVED "Additional Skills" and "Core Skills" from mapping to preserve separate sections
  // Only merge truly identical sections (e.g. "Skills" and "skills")
  const semanticMap: Record<string, string> = {
    "work experience": "work experience",
    "professional experience": "work experience",
    "employment": "work experience",
    "employment history": "work experience",
    "career history": "work experience",
    "professional history": "work experience",
    "work history": "work experience",
    "experience": "work experience",
    "academic projects": "projects",
    "project experience": "projects",
    "project": "projects",
    "projects": "projects",
    // REMOVED: "technical skills", "core competencies", "competencies", "expertise", "skill" → "skills"
    // This prevents "Additional Skills" and "Core Skills" from being merged
    "skills": "skills", // Only exact "skills" matches
    "education & training": "education",
    "academic background": "education",
    "educational background": "education",
    "education": "education",
    "certification": "certifications",
    "certificate": "certifications",
    "certifications": "certifications",
    "award": "awards",
    "honor": "awards",
    "honors": "awards",
    "awards": "awards",
  }
  
  // Check if any semantic mapping applies
  for (const [variant, canonical] of Object.entries(semanticMap)) {
    if (normalized === variant || normalized.includes(variant)) {
      // Check if the variant is at word boundaries
      const regex = new RegExp(`\\b${variant}\\b`, 'i')
      if (regex.test(normalized)) {
        return canonical
      }
    }
  }
  
  return normalized
}

/**
 * Deduplicate and merge sections by normalized title
 * Merges bullets from duplicate sections and removes duplicate bullets
 */
export function deduplicateSections(sections: Section[]): Section[] {
  if (!Array.isArray(sections) || sections.length === 0) {
    return []
  }
  
  const sectionMap = new Map<string, Section>()
  
  for (const section of sections) {
    if (!section || !section.title) continue
    
    const normalizedTitle = normalizeSectionTitle(section.title)
    const bullets: Array<string | { text?: string; params?: any }> = Array.isArray(section.bullets) ? section.bullets : []
    
    if (sectionMap.has(normalizedTitle)) {
      // Merge into existing section
      const existingSection = sectionMap.get(normalizedTitle)!
      
      // Use the most descriptive title (prefer longer, more specific titles)
      if (section.title.length > existingSection.title.length) {
        existingSection.title = section.title
      }
      
      // Get existing bullet texts for deduplication
      const existingBulletTexts = new Set(
        existingSection.bullets
          .map(b => (b.text || '').trim())
          .filter(t => t !== '')
      )
      
      // For work experience sections, add separator between jobs
      const isWorkExp = normalizedTitle === "work experience"
      const lastBullet = existingSection.bullets[existingSection.bullets.length - 1]
      if (isWorkExp && existingSection.bullets.length > 0 && lastBullet?.text?.trim() !== '') {
        existingSection.bullets.push({
          id: `${existingSection.id}-sep-${Date.now()}`,
          text: '',
          params: {}
        })
      }
      
      // Merge bullets, removing duplicates (exact and near-duplicates)
      let bulletIndex = existingSection.bullets.length
      for (const bullet of bullets) {
        let bulletText = ''
        if (typeof bullet === 'string') {
          bulletText = bullet.trim()
        } else if (typeof bullet === 'object' && bullet !== null && 'text' in bullet) {
          bulletText = String((bullet as any).text || '').trim()
        }
        const bulletLower = bulletText.toLowerCase()
        
        // Skip empty bullets and exact duplicates (case-insensitive)
        // REMOVED near-duplicate check - it was too aggressive and causing bullets to be lost
        // Only check for exact duplicates to preserve all content (including company headers)
        if (bulletText && !existingBulletTexts.has(bulletLower)) {
          existingBulletTexts.add(bulletLower)
          existingSection.bullets.push({
            id: `${existingSection.id}-${bulletIndex}`,
            text: bulletText,
            params: (typeof bullet === 'object' && bullet !== null && 'params' in bullet
              ? bullet.params
              : undefined) || {}
          })
          bulletIndex++
        }
      }
      
    } else {
      // Create new section entry
      const normalizedSection: Section = {
        id: section.id || `section-${sectionMap.size}-${Date.now()}`,
        title: section.title,
        bullets: bullets.map((bullet, idx) => ({
          id: `${section.id || `section-${sectionMap.size}`}-${idx}`,
          text: typeof bullet === 'string' 
            ? bullet 
            : (typeof bullet === 'object' && bullet !== null && 'text' in bullet
                ? String(bullet.text || '')
                : ''),
          params: (typeof bullet === 'object' && bullet !== null && 'params' in bullet
            ? bullet.params
            : undefined) || {}
        }))
      }
      sectionMap.set(normalizedTitle, normalizedSection)
    }
  }
  
  return Array.from(sectionMap.values())
}

const DEFAULT_SECTION_ORDER = [
  'title section',
  'title',
  'contact information',
  'contact',
  'professional summary',
  'summary',
  'work experience',
  'skills',
  'certifications',
  'education'
]

function getSectionOrderIndex(title: string): number {
  const titleLower = title.toLowerCase().trim()
  const normalized = normalizeSectionTitle(title)
  
  // Handle title section (must be first)
  if (titleLower.includes('title section') || (titleLower.includes('title') && titleLower.includes('section'))) {
    return 0
  }
  
  // Handle title (second)
  if (titleLower.includes('title') && !titleLower.includes('section')) {
    return 1
  }
  
  // Handle contact information (third)
  if (titleLower.includes('contact information') || (titleLower.includes('contact') && titleLower.includes('information'))) {
    return 2
  }
  
  // Handle contact (fourth)
  if (titleLower.includes('contact')) {
    return 3
  }
  
  // Handle professional summary (fifth)
  if (titleLower.includes('professional summary') || (titleLower.includes('professional') && titleLower.includes('summary'))) {
    return 4
  }
  
  // Handle summary (sixth)
  if (normalized === 'summary' || titleLower.includes('summary')) {
    return 5
  }
  
  // Handle work experience using normalized title (seventh)
  if (normalized === 'work experience') {
    return 6
  }
  
  // Handle skills using normalized title (eighth)
  if (normalized === 'skills') {
    return 7
  }
  
  // Handle certifications using normalized title (ninth)
  if (normalized === 'certifications') {
    return 8
  }
  
  // Handle education using normalized title (tenth)
  if (normalized === 'education') {
    return 9
  }
  
  // All other sections go after
  return DEFAULT_SECTION_ORDER.length
}

export function sortSectionsByDefaultOrder(sections: Section[]): Section[] {
  if (!Array.isArray(sections) || sections.length === 0) {
    return []
  }
  
  const sorted = [...sections].sort((a, b) => {
    const indexA = getSectionOrderIndex(a.title)
    const indexB = getSectionOrderIndex(b.title)
    return indexA - indexB
  })
  
  return sorted
}

