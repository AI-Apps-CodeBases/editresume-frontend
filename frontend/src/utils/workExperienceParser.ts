export interface WorkExperienceHeaderParts {
  company: string
  location: string
  title: string
  dateRange: string
}

const MONTH_PATTERN =
  '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)'

function splitTitleDate(text: string): { title: string; dateRange: string } {
  const trimmed = text.trim()
  if (!trimmed) return { title: '', dateRange: '' }

  const monthRange = new RegExp(
    `^(.*?)(?:,?\\s*(${MONTH_PATTERN}\\s+\\d{4}(?:\\s*[–-]\\s*(?:Present|Current|${MONTH_PATTERN}\\s+\\d{4}|\\d{4}))?))$`,
    'i'
  )
  const yearRange = /^(.*?)(?:,?\s*(\d{4}\s*[–-]\s*(?:\d{4}|Present|Current)|\d{4}|Present|Current))$/i

  for (const pattern of [monthRange, yearRange]) {
    const match = trimmed.match(pattern)
    if (match) {
      return {
        title: match[1].replace(/[,\-–\s]+$/, '').trim(),
        dateRange: match[2].trim(),
      }
    }
  }

  return { title: trimmed, dateRange: '' }
}

export function parseWorkExperienceHeader(rawText: string): WorkExperienceHeaderParts {
  const cleaned = rawText.replace(/\*\*/g, '').trim()
  if (!cleaned) {
    return { company: '', location: '', title: '', dateRange: '' }
  }

  if (cleaned.includes(' / ')) {
    const parts = cleaned.split(' / ').map(part => part.trim()).filter(Boolean)
    if (parts.length >= 4) {
      return {
        company: parts[0],
        location: parts[1],
        title: parts[2],
        dateRange: parts[3],
      }
    }
    if (parts.length === 3) {
      return {
        company: parts[0],
        location: '',
        title: parts[1],
        dateRange: parts[2],
      }
    }
    if (parts.length === 2) {
      return { company: parts[0], location: '', title: parts[1], dateRange: '' }
    }
  }

  if (cleaned.includes(' - ')) {
    const [company, rest] = cleaned.split(' - ', 2)
    const { title, dateRange } = splitTitleDate(rest)
    return {
      company: company.trim(),
      location: '',
      title,
      dateRange,
    }
  }

  const { title, dateRange } = splitTitleDate(cleaned)
  return { company: title, location: '', title: '', dateRange }
}
