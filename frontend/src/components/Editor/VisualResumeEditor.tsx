'use client'
import React, { useState, useRef, useEffect, useCallback } from 'react'
import config from '@/lib/config';
import InlineGrammarChecker from '@/components/AI/InlineGrammarChecker'
import LeftSidebar from './LeftSidebar'
import AIWorkExperience from '@/components/AI/AIWorkExperience'
import AISectionAssistant from '@/components/AI/AISectionAssistant'
import Comments from './Comments'
import { useSettings } from '@/contexts/SettingsContext'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { SortableContactFieldItem } from '@/features/resume/components/SortableContactFieldItem'
import type { Bullet, CustomField, ResumeData, Section } from '@/features/resume/types'

const normalizeId = (id: string | number | null | undefined) =>
  id === null || id === undefined ? '' : id.toString()

interface Props {
  data: ResumeData
  onChange: (data: ResumeData) => void
  template?: string
  onAIImprove?: (text: string, context?: string) => Promise<string>
  onAddContent?: (newContent: any) => void
  roomId?: string | null
  onAddComment?: (text: string, targetType: string, targetId: string) => void
  onResolveComment?: (commentId: string) => void
  onDeleteComment?: (commentId: string) => void
  onCreateRoom?: () => void
  onJoinRoom?: (roomId: string) => void
  onLeaveRoom?: () => void
  isConnected?: boolean
  activeUsers?: Array<{ user_id: string; name: string; joined_at: string }>
  onViewChange?: (view: 'editor' | 'jobs' | 'resumes') => void
  hideSidebar?: boolean // Hide the built-in sidebar when used in ModernEditorLayout
}

const isCompanyHeaderBullet = (bullet: Bullet) => {
  if (!bullet?.text) return false
  const raw = bullet.text.trim()
  if (!raw) return false
  if (raw.startsWith('**') && raw.includes('**', 2)) return true

  const normalized = raw.replace(/^•\s*/, '')
  const parts = normalized.split(' / ').map((part) => part.trim()).filter(Boolean)
  if (parts.length < 2) return false

  const [companyPart, rolePart] = parts
  if (!companyPart || !rolePart) return false

  const hasCompanyText = /[A-Za-z]/.test(companyPart)
  const hasRoleText = /[A-Za-z]/.test(rolePart)
  if (!hasCompanyText || !hasRoleText) return false

  if (parts.length >= 3) {
    const datePart = parts[parts.length - 1]
    if (datePart) {
      const hasDateHint = /(\d{4}|\b(?:present|current|past|ongoing)\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b)/i.test(datePart)
      if (!hasDateHint) return false
    }
  }

  return true
}

const partitionCompanyGroups = (bullets: Bullet[]) => {
  const groups: Bullet[][] = []
  for (let i = 0; i < bullets.length;) {
    const current = bullets[i]
    if (isCompanyHeaderBullet(current)) {
      const group: Bullet[] = [current]
      i += 1
      while (i < bullets.length && !isCompanyHeaderBullet(bullets[i])) {
        group.push(bullets[i])
        i += 1
      }
      groups.push(group)
    } else {
      groups.push([current])
      i += 1
    }
  }
  return groups
}

const getOrderedCompanyGroups = (bullets: Bullet[]) => {
  const groups = partitionCompanyGroups(bullets)
  const visible = groups.filter(group => !isCompanyHeaderBullet(group[0]) || group[0].params?.visible !== false)
  const hidden = groups.filter(group => isCompanyHeaderBullet(group[0]) && group[0].params?.visible === false)
  return [...visible, ...hidden]
}

const flattenGroups = (groups: Bullet[][]) => {
  const flattened: Bullet[] = []
  groups.forEach(group => {
    group.forEach(item => flattened.push(item))
  })
  return flattened
}

export default function VisualResumeEditor({
  data,
  onChange,
  template = 'tech',
  onAIImprove,
  onAddContent,
  roomId,
  onAddComment,
  onResolveComment,
  onDeleteComment,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  isConnected = false,
  activeUsers = [],
  onViewChange,
  hideSidebar = false
}: Props) {
  const [jdKeywords, setJdKeywords] = useState<{
    matching: string[];
    missing: string[];
    high_frequency: Array<{ keyword: string, frequency: number, importance: string }>;
    priority: string[];
  } | null>(null);
  const [showAIImproveModal, setShowAIImproveModal] = useState(false);
  const [aiImproveContext, setAiImproveContext] = useState<{ sectionId: string, bulletId: string, currentText: string, mode?: 'existing' | 'new' } | null>(null);
  const [selectedMissingKeywords, setSelectedMissingKeywords] = useState<Set<string>>(new Set());
  const [generatedBulletOptions, setGeneratedBulletOptions] = useState<string[]>([]);
  const [isGeneratingBullets, setIsGeneratingBullets] = useState(false);
  const [selectedBullets, setSelectedBullets] = useState<Set<number>>(new Set());
  const hasCleanedDataRef = useRef(false); // Track if we've cleaned old HTML data

  // Collapsible sections state
  const [isTitleSectionOpen, setIsTitleSectionOpen] = useState(true);
  const [isContactSectionOpen, setIsContactSectionOpen] = useState(true);
  const [isSummarySectionOpen, setIsSummarySectionOpen] = useState(true);
  const [openSections, setOpenSections] = useState<Set<string>>(() => {
    // Initialize all sections as open by default
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('openSections');
      if (saved) return new Set(JSON.parse(saved));
    }
    return new Set();
  });
  const [openCompanyGroups, setOpenCompanyGroups] = useState<Set<string>>(() => {
    // Initialize all company groups as open by default
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('openCompanyGroups');
      if (saved) return new Set(JSON.parse(saved));
    }
    return new Set();
  });

  // Update localStorage when openSections changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('openSections', JSON.stringify(Array.from(openSections)));
    }
  }, [openSections]);

  // Update localStorage when openCompanyGroups changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('openCompanyGroups', JSON.stringify(Array.from(openCompanyGroups)));
    }
  }, [openCompanyGroups]);

  // Initialize sections as open when they're added
  useEffect(() => {
    if (data.sections.length > 0) {
      setOpenSections(prev => {
        const updated = new Set(prev);
        // Add all sections that aren't already in the set
        data.sections.forEach(s => {
          if (!updated.has(s.id)) {
            updated.add(s.id);
          }
        });
        // Remove sections that no longer exist
        const existingIds = new Set(data.sections.map(s => s.id));
        Array.from(updated).forEach(id => {
          if (!existingIds.has(id)) {
            updated.delete(id);
          }
        });
        return updated;
      });
    }
  }, [data.sections]);

  // Deduplicate sections by title (case-insensitive) - keep first occurrence
  const lastSectionsRef = useRef<string>('')
  const isDeletingRef = useRef<boolean>(false)
  
  useEffect(() => {
    if (!data.sections || data.sections.length === 0) return
    
    // Skip deduplication if we're in the middle of a deletion operation
    if (isDeletingRef.current) {
      isDeletingRef.current = false
      return
    }

    // Create a signature of current sections to detect actual changes
    const sectionsSignature = JSON.stringify(data.sections.map(s => ({ id: s.id, title: s.title })))
    if (lastSectionsRef.current === sectionsSignature) return // No change, skip
    lastSectionsRef.current = sectionsSignature

    const seenTitles = new Map<string, { id: string, index: number }>()
    const duplicates: string[] = []

    data.sections.forEach((section, index) => {
      if (!section || !section.title) return
      const titleLower = section.title.toLowerCase().trim()

      if (seenTitles.has(titleLower)) {
        const first = seenTitles.get(titleLower)!
        duplicates.push(section.id)
        console.warn(`⚠️ Found duplicate section "${section.title}" (ID: ${section.id}) - keeping first occurrence (ID: ${first.id} at index ${first.index})`)
      } else {
        seenTitles.set(titleLower, { id: section.id, index })
      }
    })

    if (duplicates.length > 0) {
      console.log(`🧹 Removing ${duplicates.length} duplicate section(s)`)
      const deduplicatedSections = data.sections.filter(s => !duplicates.includes(s.id))
      // Update the ref to prevent re-triggering
      lastSectionsRef.current = JSON.stringify(deduplicatedSections.map(s => ({ id: s.id, title: s.title })))
      onChange({ ...data, sections: deduplicatedSections })
    }
  }, [data.sections, data, onChange])

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => {
      const updated = new Set(prev);
      if (updated.has(sectionId)) {
        updated.delete(sectionId);
      } else {
        updated.add(sectionId);
      }
      return updated;
    });
  };

  // Custom title fields (for multiple titles)
  const [customTitleFields, setCustomTitleFields] = useState<CustomField[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('customTitleFields');
      if (saved) return JSON.parse(saved);
    }
    return [];
  });

  // Custom contact fields
  const [customContactFields, setCustomContactFields] = useState<CustomField[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('customContactFields');
      if (saved) return JSON.parse(saved);
    }
    return [];
  });

  // Contact fields configuration with order
  const [contactFieldOrder, setContactFieldOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('contactFieldOrder');
      if (saved) return JSON.parse(saved);
    }
    return ['email', 'phone', 'location', 'linkedin', 'website', 'github'];
  });

  // Save custom fields to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('customTitleFields', JSON.stringify(customTitleFields));
      localStorage.setItem('customContactFields', JSON.stringify(customContactFields));
    }
  }, [customTitleFields, customContactFields]);


  // Save order to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('contactFieldOrder', JSON.stringify(contactFieldOrder));
    }
  }, [contactFieldOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Section order state - includes Title, Contact, Summary, and dynamic sections
  const [sectionOrder, setSectionOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('resumeSectionOrder');
      if (saved) return JSON.parse(saved);
    }
    // Default order: Title, Contact, Summary, then dynamic sections
    return ['title', 'contact', 'summary', ...(data.sections || []).map(s => s.id)];
  });

  // Update section order when sections change
  useEffect(() => {
    const currentSectionIds = new Set(sectionOrder);
    const newSectionIds = new Set(['title', 'contact', 'summary', ...(data.sections || []).map(s => s.id)]);

    // Add new sections to the end
    const newSections = (data.sections || []).filter(s => !currentSectionIds.has(s.id));
    if (newSections.length > 0) {
      setSectionOrder(prev => [...prev, ...newSections.map(s => s.id)]);
    }

    // Remove deleted sections
    const removedSections = Array.from(currentSectionIds).filter(id =>
      id !== 'title' && id !== 'contact' && id !== 'summary' && !newSectionIds.has(id)
    );
    if (removedSections.length > 0) {
      setSectionOrder(prev => prev.filter(id => !removedSections.includes(id)));
    }
  }, [data.sections]);

  // Save section order to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('resumeSectionOrder', JSON.stringify(sectionOrder));
    }
  }, [sectionOrder]);

  // Handle section reordering
  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sectionOrder.indexOf(active.id as string);
      const newIndex = sectionOrder.indexOf(over.id as string);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(sectionOrder, oldIndex, newIndex);
        setSectionOrder(newOrder);
      }
    }
  };

  // Contact field definitions
  const contactFields = {
    email: { label: '📧 email', icon: '📧', field: 'email' },
    phone: { label: '📱 phone', icon: '📱', field: 'phone' },
    location: { label: '📍 location', icon: '📍', field: 'location' },
    linkedin: { label: '💼 LinkedIn', icon: '💼', field: 'linkedin' },
    website: { label: '🌐 website', icon: '🌐', field: 'website' },
    github: { label: '⚡ GitHub', icon: '⚡', field: 'github' },
    portfolio: { label: '🎨 Portfolio', icon: '🎨', field: 'portfolio' },
    twitter: { label: '🐦 Twitter', icon: '🐦', field: 'twitter' }
  };

  // Add custom title field
  const addCustomTitleField = () => {
    const fieldId = `custom_title_${Date.now()}`;
    const fieldName = `customTitle${customTitleFields.length + 1}`;
    const newField = { id: fieldId, label: 'Custom Title', field: fieldName };
    setCustomTitleFields([...customTitleFields, newField]);
    onChange({ ...data, [fieldName]: '' });
  };

  // Add custom contact field
  const addCustomContactField = () => {
    const fieldId = `custom_contact_${Date.now()}`;
    const fieldName = `customContact${customContactFields.length + 1}`;
    const newField = { id: fieldId, label: 'Custom Field', field: fieldName };
    setCustomContactFields([...customContactFields, newField]);
    onChange({ ...data, [fieldName]: '' });
    setContactFieldOrder([...contactFieldOrder, fieldName]);
  };

  // Remove custom field
  const removeCustomTitleField = (fieldId: string) => {
    const field = customTitleFields.find(f => f.id === fieldId);
    if (field) {
      setCustomTitleFields(customTitleFields.filter(f => f.id !== fieldId));
      const newData = { ...data };
      delete (newData as any)[field.field];
      onChange(newData);
    }
  };

  const removeCustomContactField = (fieldId: string) => {
    const field = customContactFields.find(f => f.id === fieldId);
    if (field) {
      setCustomContactFields(customContactFields.filter(f => f.id !== fieldId));
      setContactFieldOrder(contactFieldOrder.filter(f => f !== field.field));
      const newData = { ...data };
      delete (newData as any)[field.field];
      onChange(newData);
    }
  };

  // Select all / Deselect all for title fields
  const toggleAllTitleFields = (enable: boolean) => {
    const fieldsVisible = { ...(data as any).fieldsVisible };
    fieldsVisible.name = enable;
    fieldsVisible.title = enable;
    customTitleFields.forEach(field => {
      fieldsVisible[field.field] = enable;
    });
    onChange({ ...data, fieldsVisible });
  };

  // Select all / Deselect all for contact fields
  const toggleAllContactFields = (enable: boolean) => {
    const fieldsVisible = { ...(data as any).fieldsVisible };
    contactFieldOrder.forEach(fieldKey => {
      fieldsVisible[fieldKey] = enable;
    });
    customContactFields.forEach(field => {
      fieldsVisible[field.field] = enable;
    });
    onChange({ ...data, fieldsVisible });
  };

  const handleContactFieldDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setContactFieldOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Clean HTML from text content (for old data that might have HTML stored)
  const cleanTextContent = useCallback((text: string | undefined | null): string => {
    if (!text) return '';
    // Remove HTML tags but preserve text content
    if (typeof document !== 'undefined') {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = text;
      return tempDiv.textContent || tempDiv.innerText || '';
    }
    // Fallback: simple regex to remove HTML tags
    return text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
  }, []);

  // Load JD keywords from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('currentJDKeywords');
        if (stored) {
          setJdKeywords(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to load JD keywords:', e);
      }
    }

    // Clean any HTML from resume data on mount (for old data compatibility)
    // This prevents hydration errors from old data that might have HTML stored
    // Only run once on initial mount, not on every data change
    if (!hasCleanedDataRef.current && data.summary && (data.summary.includes('<') || data.summary.includes('&'))) {
      const cleanedSummary = cleanTextContent(data.summary);
      if (cleanedSummary !== data.summary) {
        hasCleanedDataRef.current = true;
        // Update only if different to avoid infinite loops
        setTimeout(() => {
          updateField('summary', cleanedSummary);
        }, 100);
      }
    }

    // Listen for storage changes (when match is done)
    const handleStorageChange = () => {
      try {
        const stored = localStorage.getItem('currentJDKeywords');
        if (stored) {
          setJdKeywords(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to load JD keywords:', e);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    // Also poll for changes (same-tab updates)
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Check if bullet text contains JD matching keywords and count occurrences
  const checkBulletMatches = (bulletText: string, sectionTitle?: string, generatedKeywords?: string[]): { matches: boolean; matchedKeywords: string[], keywordCounts: Record<string, number> } => {
    if (!jdKeywords || !bulletText) return { matches: false, matchedKeywords: [], keywordCounts: {} };

    // Exclude certifications from keyword matching
    if (sectionTitle) {
      const sectionLower = sectionTitle.toLowerCase();
      if (sectionLower.includes('certif') || sectionLower.includes('license') || sectionLower.includes('credential')) {
        return { matches: false, matchedKeywords: [], keywordCounts: {} };
      }
    }

    const lowerText = bulletText.toLowerCase();
    const matched: string[] = [];
    const keywordCounts: Record<string, number> = {};

    // Collect all keywords to check (JD keywords + generated keywords)
    const keywordsToCheck = new Set<string>();

    // Add JD matching keywords
    jdKeywords.matching.forEach(kw => {
      if (kw && kw.length > 1 && kw.trim().length > 1) {
        keywordsToCheck.add(kw);
      }
    });

    // Add priority keywords
    jdKeywords.priority.forEach(kw => {
      if (kw && kw.length > 1 && kw.trim().length > 1) {
        keywordsToCheck.add(kw);
      }
    });

    // Add generated keywords (keywords used to generate this bullet)
    if (generatedKeywords && Array.isArray(generatedKeywords)) {
      generatedKeywords.forEach(kw => {
        if (kw && typeof kw === 'string' && kw.length > 1) {
          keywordsToCheck.add(kw);
        }
      });
    }

    keywordsToCheck.forEach(keyword => {
      const keywordLower = keyword.toLowerCase().trim();
      // Skip single letters and very short keywords
      if (keywordLower.length <= 1) return;

      // Use word boundary matching to avoid partial matches like "r" in "project"
      const regex = new RegExp(`\\b${keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches && matches.length > 0) {
        // Preserve original keyword case
        if (!matched.includes(keyword)) {
          matched.push(keyword);
        }
        keywordCounts[keyword] = matches.length;
      }
    });

    return { matches: matched.length > 0, matchedKeywords: matched, keywordCounts };
  };

  // Highlight keywords in text with counts (for display)
  const highlightKeywordsInText = (text: string, matchedKeywords: string[], keywordCounts: Record<string, number>): React.ReactNode => {
    if (!matchedKeywords.length || !text) return text;

    const parts: Array<React.ReactNode> = [];
    let lastIndex = 0;

    // Sort keywords by length (longest first) to avoid partial matches
    const sortedKeywords = [...matchedKeywords].sort((a, b) => b.length - a.length);
    const matches: Array<{ keyword: string, index: number, length: number, count: number }> = [];

    sortedKeywords.forEach(keyword => {
      if (!keyword || typeof keyword !== 'string') return;
      const keywordLower = keyword.toLowerCase().trim();
      if (keywordLower.length <= 1) return;

      try {
        const regex = new RegExp(`\\b${keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        const textMatches = text.matchAll(regex);

        for (const match of textMatches) {
          if (match.index !== undefined && match[0]) {
            matches.push({
              keyword,
              index: match.index,
              length: match[0].length,
              count: keywordCounts[keyword] || 1
            });
          }
        }
      } catch (e) {
        console.warn('Error matching keyword:', keyword, e);
      }
    });

    // Sort matches by index
    matches.sort((a, b) => a.index - b.index);

    // Remove overlapping matches (keep longest)
    const nonOverlapping: typeof matches = [];
    for (const match of matches) {
      const overlaps = nonOverlapping.some(m =>
        (match.index >= m.index && match.index < m.index + m.length) ||
        (match.index + match.length > m.index && match.index + match.length <= m.index + m.length)
      );
      if (!overlaps) {
        nonOverlapping.push(match);
      }
    }

    // Build result with highlighted keywords
    nonOverlapping.forEach((match, idx) => {
      if (match.index === undefined || match.length === undefined) return;

      // Add text before match
      if (match.index > lastIndex) {
        const beforeText = text.substring(lastIndex, match.index);
        if (beforeText) parts.push(beforeText);
      }
      // Add highlighted keyword with count
      const keywordText = text.substring(match.index, match.index + match.length);
      if (keywordText) {
        parts.push(
          <span key={`kw-${idx}-${match.index}`} className="bg-yellow-200 underline font-semibold" title={`${match.keyword} (${match.count}x)`}>
            {keywordText}
            {match.count > 1 && <sup className="text-xs text-gray-600 ml-0.5">{match.count}</sup>}
          </span>
        );
      }
      lastIndex = match.index + match.length;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      if (remainingText) parts.push(remainingText);
    }

    if (parts.length === 0) return text;
    if (parts.length === 1 && typeof parts[0] === 'string') return parts[0];
    return <>{parts}</>;
  };

  // Highlight keywords in HTML string for contentEditable (returns HTML string)
  const highlightKeywordsInHTML = (text: string, matchedKeywords: string[]): string => {
    if (!matchedKeywords.length || !text || typeof text !== 'string') return text || '';

    let highlightedText = text;
    const sortedKeywords = [...matchedKeywords]
      .filter(kw => kw && typeof kw === 'string' && kw.trim().length > 1)
      .sort((a, b) => b.length - a.length);

    if (sortedKeywords.length === 0) return text;

    sortedKeywords.forEach(keyword => {
      try {
        const keywordLower = keyword.toLowerCase().trim();
        if (keywordLower.length <= 1) return;

        const regex = new RegExp(`\\b(${keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');
        highlightedText = highlightedText.replace(regex, (match) => {
          if (!match) return match;
          const escapedKeyword = keyword.replace(/"/g, '&quot;');
          return `<mark class="bg-yellow-200 font-semibold underline" title="JD Keyword: ${escapedKeyword}">${match}</mark>`;
        });
      } catch (e) {
        console.warn('Error highlighting keyword in HTML:', keyword, e);
      }
    });

    return highlightedText;
  };

  // Check if text contains matching keywords
  const getTextMatches = (text: string): { matchedKeywords: string[], keywordCounts: Record<string, number> } => {
    if (!jdKeywords?.matching?.length || !text) {
      return { matchedKeywords: [], keywordCounts: {} };
    }

    const textLower = text.toLowerCase();
    const matchedKeywords: string[] = [];
    const keywordCounts: Record<string, number> = {};

    jdKeywords.matching.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      const regex = new RegExp(`\\b${keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = textLower.match(regex);
      if (matches && matches.length > 0) {
        matchedKeywords.push(keyword);
        keywordCounts[keyword] = matches.length;
      }
    });

    return { matchedKeywords, keywordCounts };
  };

  // Track if component is mounted to avoid hydration errors
  const [isMounted, setIsMounted] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Wait for React hydration to complete
    const hydrationTimer = setTimeout(() => {
      setIsHydrated(true);
    }, 300);
    return () => clearTimeout(hydrationTimer);
  }, []);

  // Update highlighting when keywords change (client-side only to avoid hydration errors)
  useEffect(() => {
    if (!isHydrated) return; // Wait for hydration to complete
    if (typeof window === 'undefined') return; // Skip on server
    if (!jdKeywords?.matching?.length) return;

    // Use requestAnimationFrame to ensure DOM is fully ready
    const frameId = requestAnimationFrame(() => {
      // Update summary highlighting
      const summaryField = document.querySelector('[data-field="summary"]') as HTMLElement;
      if (summaryField && data.summary && !summaryField.matches(':focus')) {
        try {
          const summaryMatches = getTextMatches(data.summary);
          if (summaryMatches.matchedKeywords.length > 0) {
            const currentText = summaryField.textContent || '';
            const normalizedCurrent = currentText.trim();
            const normalizedData = data.summary.trim();
            // Only update if text matches exactly (avoid overwriting user edits or hydration mismatches)
            if (normalizedCurrent === normalizedData || !normalizedCurrent) {
              summaryField.innerHTML = highlightKeywordsInHTML(data.summary, summaryMatches.matchedKeywords);
            }
          }
        } catch (e) {
          console.warn('Error highlighting summary:', e);
        }
      }

      // Skip bullet highlighting - all bullets now use overlay highlighting in JSX
      // Direct innerHTML manipulation interferes with contentEditable editing
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [isHydrated, jdKeywords, data.summary, data.sections]);

  // Add page break styles
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      .resume-container {
        position: relative;
        page-break-inside: avoid;
      }
      
      mark.bg-yellow-200 {
        background-color: #fef08a !important;
        font-weight: 600;
        text-decoration: underline;
        padding: 1px 2px;
        border-radius: 2px;
      }
      
      .page-layout-indicator {
        height: 1px;
        background: #e5e7eb;
        border: none;
        margin: 20px 0;
        position: relative;
      }
      
      .page-layout-indicator::after {
        content: "Page 1";
        position: absolute;
        right: 0;
        top: -8px;
        background: #f3f4f6;
        color: #6b7280;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 3px;
        border: 1px solid #d1d5db;
      }
      
      @media print {
        .resume-container {
          box-shadow: none !important;
          border: none !important;
        }
        
        .page-break-indicator {
          page-break-before: always;
          height: 0;
          border: none;
          background: none;
        }
        
        .page-break-indicator::before {
          display: none;
        }
      }
    `
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])
  const { settings } = useSettings()
  const [draggedSection, setDraggedSection] = useState<string | null>(null)
  const [draggedBullet, setDraggedBullet] = useState<{ sectionId: string, bulletId: string } | null>(null)
  const [draggedCompanyGroup, setDraggedCompanyGroup] = useState<{ sectionId: string, bulletIds: string[] } | null>(null)
  const [isAILoading, setIsAILoading] = useState(false)
  const [isSummaryGenerating, setIsSummaryGenerating] = useState(false)
  const [isGeneratingBullet, setIsGeneratingBullet] = useState(false)
  const [showComments, setShowComments] = useState<string | null>(null)
  const [currentEditingContext, setCurrentEditingContext] = useState<{ type: 'bullet' | 'field', sectionId?: string, bulletId?: string, field?: keyof ResumeData } | null>(null)
  const [useNewExperienceLayout, setUseNewExperienceLayout] = useState(true)
  const [isParsingResume, setIsParsingResume] = useState(false)
  const [showAIParser, setShowAIParser] = useState(false)
  const [showAIWorkExperience, setShowAIWorkExperience] = useState(false)
  const [aiWorkExperienceContext, setAiWorkExperienceContext] = useState<any>(null)
  const [showAISectionAssistant, setShowAISectionAssistant] = useState(false)
  const [aiSectionAssistantContext, setAiSectionAssistantContext] = useState<any>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  // Undo/Redo functionality
  const [history, setHistory] = useState<ResumeData[]>([data])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [isUndoRedoing, setIsUndoRedoing] = useState(false)

  // Save to history when data changes
  useEffect(() => {
    if (!isUndoRedoing) {
      const newHistory = history.slice(0, historyIndex + 1)
      newHistory.push(data)
      if (newHistory.length > 50) newHistory.shift()
      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
    }
  }, [data])

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (historyIndex > 0) {
          setIsUndoRedoing(true)
          setHistoryIndex(historyIndex - 1)
          onChange(history[historyIndex - 1])
          setTimeout(() => setIsUndoRedoing(false), 100)
        }
      } else if ((e.metaKey || e.ctrlKey) && ((e.shiftKey && e.key === 'z') || e.key === 'y')) {
        e.preventDefault()
        if (historyIndex < history.length - 1) {
          setIsUndoRedoing(true)
          setHistoryIndex(historyIndex + 1)
          onChange(history[historyIndex + 1])
          setTimeout(() => setIsUndoRedoing(false), 100)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [history, historyIndex, onChange])


  const updateField = (field: keyof ResumeData, value: string) => {
    onChange({ ...data, [field]: value })
  }

  const updateSection = (sectionId: string | number, updates: Partial<Section>) => {
    const targetSectionId = normalizeId(sectionId)
    const sections = data.sections.map(s =>
      normalizeId(s.id) === targetSectionId ? { ...s, ...updates } : s
    )
    onChange({ ...data, sections })
  }

  const updateBullet = (sectionId: string | number, bulletId: string | number, text: string) => {
    const targetSectionId = normalizeId(sectionId)
    const targetBulletId = normalizeId(bulletId)
    
    console.log('=== updateBullet called ===', {
      sectionId: targetSectionId,
      bulletId: targetBulletId,
      newText: text.substring(0, 50),
      currentSections: data.sections.length
    })
    
    const sections = data.sections.map(s => {
      if (normalizeId(s.id) === targetSectionId) {
        const updatedBullets = s.bullets.map(b => {
          if (normalizeId(b.id) === targetBulletId) {
            console.log('Updating bullet:', {
              oldText: b.text?.substring(0, 50),
              newText: text.substring(0, 50),
              hasParams: !!b.params,
              params: b.params
            })
            // Preserve all bullet properties including params, ensure visible is true if not explicitly false
            return { 
              ...b, 
              text,
              params: {
                ...(b.params || {}),
                visible: b.params?.visible !== false ? true : false // Explicitly set visible
              }
            }
          }
          return b
        })
        
        console.log('Section updated:', {
          sectionTitle: s.title,
          bulletsBefore: s.bullets.length,
          bulletsAfter: updatedBullets.length,
          updatedBulletIndex: updatedBullets.findIndex(b => normalizeId(b.id) === targetBulletId)
        })
        
        return {
          ...s,
          bullets: updatedBullets
        }
      }
      return s
    })
    
    console.log('Calling onChange with updated sections')
    onChange({ ...data, sections })
  }

  const addBullet = (sectionId: string | number) => {
    const targetSectionId = normalizeId(sectionId)
    const sections = data.sections.map(s =>
      normalizeId(s.id) === targetSectionId
        ? {
          ...s,
          bullets: [...s.bullets, { id: Date.now().toString(), text: '', params: {} }]
        }
        : s
    )
    onChange({ ...data, sections })
  }

  const insertBulletAfter = (sectionId: string | number, afterBulletId: string | number) => {
    const targetSectionId = normalizeId(sectionId)
    const targetAfterBulletId = normalizeId(afterBulletId)
    const sections = data.sections.map(s => {
      if (normalizeId(s.id) === targetSectionId) {
        const bullets = [...s.bullets]
        const index = bullets.findIndex(b => normalizeId(b.id) === targetAfterBulletId)
        if (index !== -1) {
          bullets.splice(index + 1, 0, { id: Date.now().toString(), text: '', params: {} })
        }
        return { ...s, bullets }
      }
      return s
    })
    onChange({ ...data, sections })
  }

  const removeBullet = (sectionId: string | number, bulletId: string | number) => {
    const targetSectionId = normalizeId(sectionId)
    const targetBulletId = normalizeId(bulletId)
    const sections = data.sections.map(s =>
      normalizeId(s.id) === targetSectionId
        ? {
          ...s,
          bullets: s.bullets.filter(b => normalizeId(b.id) !== targetBulletId)
        }
        : s
    )
    onChange({ ...data, sections })
  }

  const addSection = () => {
    // Check if "New Section" already exists
    const existingNewSections = data.sections.filter(s =>
      s.title.toLowerCase().trim() === 'new section'
    )

    const sectionNumber = existingNewSections.length > 0
      ? ` ${existingNewSections.length + 1}`
      : ''

    const newSection: Section = {
      id: Date.now().toString(),
      title: `New Section${sectionNumber}`,
      bullets: [{ id: Date.now().toString() + '-1', text: '', params: {} }]
    }
    onChange({ ...data, sections: [...data.sections, newSection] })
  }

  const handleParsedResume = (jobs: any[], sections: any[]) => {
    // Parsing resume data

    const newSections: Section[] = []

    // Create work experience section with modern format
    if (jobs.length > 0) {
      const workExperienceSection: Section = {
        id: `work-experience-${Date.now()}`,
        title: 'Work Experience',
        bullets: []
      }

      jobs.forEach((job, index) => {
        // Create company header
        const companyHeader = {
          id: `company-header-${Date.now()}-${index}`,
          text: `**${job.company} / ${job.role} / ${job.date}**`,
          params: {}
        }
        workExperienceSection.bullets.push(companyHeader)

        // Add job bullets
        job.bullets.forEach((bullet: string, bulletIndex: number) => {
          const bulletItem = {
            id: `bullet-${Date.now()}-${index}-${bulletIndex}`,
            text: `• ${bullet}`,
            params: {}
          }
          workExperienceSection.bullets.push(bulletItem)
        })
      })

      newSections.push(workExperienceSection)
    }

    // Process ALL sections and create modern format for each
    sections.forEach((section, index) => {
      // Processing section

      if (section.content && section.content.length > 0) {
        const modernSection: Section = {
          id: `section-${Date.now()}-${index}`,
          title: section.title,
          bullets: []
        }

        // For each item in the section, create a modern format entry
        section.content.forEach((item: string, itemIndex: number) => {
          // Create a header for each item
          const headerBullet = {
            id: `header-${Date.now()}-${index}-${itemIndex}`,
            text: `**${item} / Type / Date**`,
            params: {}
          }
          modernSection.bullets.push(headerBullet)

          // Add the original item as a bullet point
          const itemBullet = {
            id: `item-${Date.now()}-${index}-${itemIndex}`,
            text: `• ${item}`,
            params: {}
          }
          modernSection.bullets.push(itemBullet)
        })

        newSections.push(modernSection)
      }
    })

    // Deduplicate sections by title before adding
    const seenTitles = new Map<string, number>()
    const deduplicatedSections = newSections.filter((section, index) => {
      if (!section || !section.title) return false
      const titleLower = section.title.toLowerCase().trim()
      if (seenTitles.has(titleLower)) {
        const firstIndex = seenTitles.get(titleLower)!
        console.warn(`⚠️ Removing duplicate section "${section.title}" from parsed resume (keeping first occurrence at index ${firstIndex})`)
        return false
      }
      seenTitles.set(titleLower, index)
      return true
    })

    console.log(`📋 Deduplicated parsed sections: ${newSections.length} → ${deduplicatedSections.length}`)

    // Replace all existing sections with new ones
    onChange({ ...data, sections: deduplicatedSections })
    setShowAIParser(false)
  }

  const getSectionType = (title: string): 'work' | 'project' | 'skill' | 'certificate' | 'education' | 'other' => {
    const lower = title.toLowerCase()
    console.log(`Checking section type for: "${title}"`)

    // More comprehensive detection
    if (lower.includes('project') || lower.includes('portfolio') || lower.includes('development')) {
      console.log('Detected as PROJECT')
      return 'project'
    }
    if (lower.includes('skill') || lower.includes('technical') || lower.includes('technology') || lower.includes('competencies') || lower.includes('expertise') || lower.includes('proficiencies')) {
      console.log('Detected as SKILL')
      return 'skill'
    }
    if (lower.includes('certificate') || lower.includes('certification') || lower.includes('license') || lower.includes('credential') || lower.includes('qualification')) {
      console.log('Detected as CERTIFICATE')
      return 'certificate'
    }
    if (lower.includes('education') || lower.includes('academic') || lower.includes('university') || lower.includes('college') || lower.includes('degree') || lower.includes('diploma')) {
      console.log('Detected as EDUCATION')
      return 'education'
    }
    if (lower.includes('experience') || lower.includes('work') || lower.includes('employment') || lower.includes('career') || lower.includes('professional')) {
      console.log('Detected as WORK')
      return 'work'
    }

    console.log('Detected as OTHER')
    return 'other'
  }


  const moveSectionUp = (sectionId: string) => {
    const sections = [...data.sections]
    const currentIndex = sections.findIndex(s => s.id === sectionId)
    if (currentIndex > 0) {
      [sections[currentIndex], sections[currentIndex - 1]] = [sections[currentIndex - 1], sections[currentIndex]]
      onChange({ ...data, sections })
    }
  }

  const moveSectionDown = (sectionId: string) => {
    const sections = [...data.sections]
    const currentIndex = sections.findIndex(s => s.id === sectionId)
    if (currentIndex < sections.length - 1) {
      [sections[currentIndex], sections[currentIndex + 1]] = [sections[currentIndex + 1], sections[currentIndex]]
      onChange({ ...data, sections })
    }
  }

  const handleAIWorkExperienceUpdate = (updateData: {
    companyName: string
    location?: string
    jobTitle: string
    dateRange: string
    bullets: string[]
  }) => {
    if (!aiWorkExperienceContext) return

    const { sectionId, bulletId } = aiWorkExperienceContext

    // Find the section and update the company header
    const sections = data.sections.map(section => {
      if (section.id === sectionId) {
        const updatedBullets = (section.bullets || []).map(bullet => {
          if (bullet.id === bulletId) {
            // Update the company header with new information
            const location = updateData.location || 'Location'
            return {
              ...bullet,
              text: `**${updateData.companyName} / ${location} / ${updateData.jobTitle} / ${updateData.dateRange}**`
            }
          }
          return bullet
        })

        // Remove existing bullets for this company and add new ones
        const companyBulletIds: string[] = []
        const headerIndex = updatedBullets.findIndex(b => b.id === bulletId)

        // Find all bullets that belong to this company (until next company or end)
        for (let i = headerIndex + 1; i < updatedBullets.length; i++) {
          const bullet = updatedBullets[i]
          if (bullet.text?.startsWith('**') && bullet.text?.includes('**', 2)) {
            break // Next company found
          }
          if (bullet.text?.trim() && bullet.text?.startsWith('•')) {
            companyBulletIds.push(bullet.id)
          }
        }

        // Remove old bullets
        const filteredBullets = updatedBullets.filter(bullet => !companyBulletIds.includes(bullet.id))

        // Add new bullets after the company header
        const newBullets = updateData.bullets.map((bulletText, index) => ({
          id: `bullet-${Date.now()}-${index}`,
          text: `• ${bulletText}`,
          params: {}
        }))

        // Insert new bullets after the company header
        const newHeaderIndex = filteredBullets.findIndex(b => b.id === bulletId)
        filteredBullets.splice(newHeaderIndex + 1, 0, ...newBullets)

        return {
          ...section,
          bullets: filteredBullets
        }
      }
      return section
    })

    onChange({ ...data, sections })
    setShowAIWorkExperience(false)
    setAiWorkExperienceContext(null)
  }

  const handleSectionAssistantUpdate = (sectionData: any) => {
    console.log('=== HANDLING SECTION ASSISTANT UPDATE ===')
    console.log('Section data:', sectionData)
    console.log('Context:', aiSectionAssistantContext)

    try {
      const { itemName, itemType, dateRange, bullets } = sectionData
      const { sectionId, bulletId } = aiSectionAssistantContext

      // Find the section and update the item header
      const sections = data.sections.map(section => {
        if (section.id === sectionId) {
          const updatedBullets = (section.bullets || []).map(bullet => {
            if (bullet.id === bulletId) {
              // Update the item header with new information
              return {
                ...bullet,
                text: `**${itemName} / ${itemType} / ${dateRange}**`
              }
            }
            return bullet
          })

          // Find all bullets that belong to this item (until next item or end)
          const itemBulletIds: string[] = []
          const headerIndex = updatedBullets.findIndex(b => b.id === bulletId)

          // Find all bullets that belong to this item (until next item or end)
          for (let i = headerIndex + 1; i < updatedBullets.length; i++) {
            const bullet = updatedBullets[i]
            if (bullet.text?.startsWith('**') && bullet.text?.includes('**', 2)) {
              break // Next item found
            }
            if (bullet.text?.trim() && bullet.text?.startsWith('•')) {
              itemBulletIds.push(bullet.id)
            }
          }

          // Remove old bullets
          const filteredBullets = updatedBullets.filter(bullet => !itemBulletIds.includes(bullet.id))

          // Add new bullets after the item header
          const newBullets = bullets.map((bulletText: string, index: number) => ({
            id: `bullet-${Date.now()}-${index}`,
            text: `• ${bulletText}`,
            params: {}
          }))

          // Insert new bullets after the item header
          const headerIndexAfter = filteredBullets.findIndex(b => b.id === bulletId)
          filteredBullets.splice(headerIndexAfter + 1, 0, ...newBullets)

          return {
            ...section,
            bullets: filteredBullets
          }
        }
        return section
      })

      onChange({ ...data, sections })
      console.log('Section content updated successfully')

    } catch (error) {
      console.error('Error updating section content:', error)
      alert('Failed to update section content: ' + (error as Error).message)
    }
  }


  const insertSectionAfter = (afterSectionId: string) => {
    const newSection: Section = {
      id: Date.now().toString(),
      title: 'New Section',
      bullets: [{ id: Date.now().toString() + '-1', text: '', params: {} }]
    }
    const index = data.sections.findIndex(s => s.id === afterSectionId)
    if (index !== -1) {
      const sections = [...data.sections]
      sections.splice(index + 1, 0, newSection)
      onChange({ ...data, sections })
    }
  }

  const removeSection = (sectionId: string) => {
    // Mark that we're deleting to prevent deduplication useEffect from interfering
    isDeletingRef.current = true
    
    // Prevent any other operations - just delete the section
    const filteredSections = data.sections.filter(s => s.id !== sectionId)
    
    // Update ref to prevent deduplication from running
    lastSectionsRef.current = JSON.stringify(filteredSections.map(s => ({ id: s.id, title: s.title })))
    
    // Only update sections - don't do anything else
    onChange({ ...data, sections: filteredSections })
  }

  const handleSectionDragStart = (sectionId: string) => {
    setDraggedSection(sectionId)
  }

  const handleSectionDragOver = (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault()
    if (!draggedSection || draggedSection === targetSectionId) return

    const sections = [...data.sections]
    const draggedIdx = sections.findIndex(s => s.id === draggedSection)
    const targetIdx = sections.findIndex(s => s.id === targetSectionId)

    const [removed] = sections.splice(draggedIdx, 1)
    sections.splice(targetIdx, 0, removed)

    onChange({ ...data, sections })
  }

  const handleSectionDragEndOld = () => {
    setDraggedSection(null)
  }

  const handleBulletDragStart = (sectionId: string, bulletId: string, isCompany: boolean = false) => {
    if (isCompany) {
      // Dragging a company - find all its tasks until next company or separator
      const section = data.sections.find(s => s.id === sectionId)
      if (section) {
        const bulletIndex = section.bullets.findIndex(b => b.id === bulletId)
        const groupIds: string[] = [bulletId]

        // Collect all bullets after this company until separator or next company
        for (let i = bulletIndex + 1; i < section.bullets.length; i++) {
          const bullet = section.bullets[i]
          const text = bullet.text.trim()

          // Stop at empty separator or next company
          if (!text || (text.startsWith('**') && text.includes('**', 2))) {
            break
          }
          groupIds.push(bullet.id)
        }

        setDraggedCompanyGroup({ sectionId, bulletIds: groupIds })
        console.log('Dragging company group:', groupIds)
      }
    } else {
      setDraggedBullet({ sectionId, bulletId })
    }
  }

  const handleBulletDragOver = (e: React.DragEvent, targetSectionId: string, targetBulletId: string) => {
    e.preventDefault()
    e.stopPropagation()

    // Handle company group dragging
    if (draggedCompanyGroup) {
      const sections = [...data.sections]
      const sourceSectionIdx = sections.findIndex(s => s.id === draggedCompanyGroup.sectionId)
      const targetSectionIdx = sections.findIndex(s => s.id === targetSectionId)

      if (sourceSectionIdx === -1 || targetSectionIdx === -1) return

      const sourceBullets = [...sections[sourceSectionIdx].bullets]

      // Extract the entire group
      const groupBullets = sourceBullets.filter(b => draggedCompanyGroup.bulletIds.includes(b.id))
      const remainingBullets = sourceBullets.filter(b => !draggedCompanyGroup.bulletIds.includes(b.id))

      if (draggedCompanyGroup.sectionId === targetSectionId) {
        const targetBulletIdx = remainingBullets.findIndex(b => b.id === targetBulletId)
        if (targetBulletIdx !== -1) {
          remainingBullets.splice(targetBulletIdx, 0, ...groupBullets)
        } else {
          remainingBullets.push(...groupBullets)
        }
        sections[sourceSectionIdx].bullets = remainingBullets
      } else {
        sections[sourceSectionIdx].bullets = remainingBullets
        const targetBullets = [...sections[targetSectionIdx].bullets]
        const targetBulletIdx = targetBullets.findIndex(b => b.id === targetBulletId)
        targetBullets.splice(targetBulletIdx, 0, ...groupBullets)
        sections[targetSectionIdx].bullets = targetBullets
      }

      onChange({ ...data, sections })
      return
    }

    // Handle single bullet dragging
    if (!draggedBullet) return

    const sections = [...data.sections]
    const sourceSectionIdx = sections.findIndex(s => s.id === draggedBullet.sectionId)
    const targetSectionIdx = sections.findIndex(s => s.id === targetSectionId)

    if (sourceSectionIdx === -1 || targetSectionIdx === -1) return

    const sourceBullets = [...sections[sourceSectionIdx].bullets]
    const draggedBulletIdx = sourceBullets.findIndex(b => b.id === draggedBullet.bulletId)

    if (draggedBulletIdx === -1) return

    const [removed] = sourceBullets.splice(draggedBulletIdx, 1)

    if (draggedBullet.sectionId === targetSectionId) {
      const targetBulletIdx = sourceBullets.findIndex(b => b.id === targetBulletId)
      sourceBullets.splice(targetBulletIdx, 0, removed)
      sections[sourceSectionIdx].bullets = sourceBullets
    } else {
      sections[sourceSectionIdx].bullets = sourceBullets
      const targetBullets = [...sections[targetSectionIdx].bullets]
      const targetBulletIdx = targetBullets.findIndex(b => b.id === targetBulletId)
      targetBullets.splice(targetBulletIdx, 0, removed)
      sections[targetSectionIdx].bullets = targetBullets
    }

    onChange({ ...data, sections })
  }

  const handleBulletDragEnd = () => {
    setDraggedBullet(null)
    setDraggedCompanyGroup(null)
  }

  const generateSummaryFromExperience = async () => {
    setIsSummaryGenerating(true)
    try {
      const jobDescriptionText = typeof window !== 'undefined' ? localStorage.getItem('currentJDText') || '' : ''
      const rawMissingKeywords = jdKeywords?.missing
      const missingKeywords = Array.isArray(rawMissingKeywords) ? rawMissingKeywords.filter(Boolean) : []
      const rawPriorityKeywords = jdKeywords?.priority
      const priorityKeywords = Array.isArray(rawPriorityKeywords) ? rawPriorityKeywords.filter(Boolean) : []
      const rawHighFrequencyKeywords = jdKeywords?.high_frequency
      const highFrequencyKeywords = Array.isArray(rawHighFrequencyKeywords)
        ? rawHighFrequencyKeywords.map((item) => (typeof item === 'string' ? item : item?.keyword)).filter(Boolean)
        : []
      const rawMatchingKeywords = jdKeywords?.matching
      const matchingKeywords = Array.isArray(rawMatchingKeywords) ? rawMatchingKeywords.filter(Boolean) : []

      const keywordSet = new Set<string>()
      const orderedKeywords: string[] = []
      const addKeywords = (list: string[]) => {
        list.forEach((keyword) => {
          const normalized = keyword?.trim()
          if (!normalized) return
          const lower = normalized.toLowerCase()
          if (keywordSet.has(lower)) return
          keywordSet.add(lower)
          orderedKeywords.push(normalized)
        })
      }

      addKeywords(priorityKeywords)
      addKeywords(missingKeywords)
      addKeywords(highFrequencyKeywords)
      addKeywords(matchingKeywords)

      const sectionsForSummary = (data.sections || []).map((section) => ({
        id: section.id,
        title: section.title,
        bullets: (section.bullets || [])
          .filter((bullet) => bullet?.params?.visible !== false)
          .map((bullet) => ({
            id: bullet.id,
            text: (bullet.text || '').replace(/^[-•*]+\s*/, '').trim()
          }))
      }))

      const response = await fetch(`${config.apiBase}/api/ai/generate_summary_from_experience`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          title: data.title,
          sections: sectionsForSummary,
          job_description: jobDescriptionText,
          missing_keywords: missingKeywords,
          priority_keywords: priorityKeywords,
          high_frequency_keywords: highFrequencyKeywords,
          matching_keywords: matchingKeywords,
          target_keywords: orderedKeywords.slice(0, 40),
          existing_summary: data.summary || ''
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('Generated summary:', result)

      if (result.summary) {
        const updatedResume = { ...data, summary: result.summary }
        onChange(updatedResume)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('resumeDataUpdated', {
            detail: { resumeData: updatedResume }
          }))
        }
      }
    } catch (error) {
      console.error('Summary generation failed:', error)
      alert('Failed to generate summary: ' + (error as Error).message)
    } finally {
      setIsSummaryGenerating(false)
    }
  }

  const generateBulletFromKeywords = async (sectionId: string, keywords: string) => {
    console.log('generateBulletFromKeywords called with:', { sectionId, keywords })
    setIsGeneratingBullet(true)
    try {
      // Find the section to get company context
      const section = data.sections.find(s => s.id === sectionId)
      console.log('Found section:', section)
      if (!section) {
        console.error('Section not found:', sectionId)
        return
      }

      // Extract company title and job title from the section
      let companyTitle = ''
      let jobTitle = ''

      // Look for company headers in the section
      for (const bullet of section.bullets) {
        if (bullet.text?.startsWith('**') && bullet.text?.includes('**', 2)) {
          const companyText = bullet.text.replace(/\*\*/g, '').trim()
          const parts = companyText.split(' / ')
          if (parts.length >= 2) {
            companyTitle = parts[0]
            jobTitle = parts[1]
            break
          }
        }
      }

      console.log('Company context:', { companyTitle, jobTitle })

      const requestBody = {
        keywords: keywords,
        company_title: companyTitle,
        job_title: jobTitle
      }
      console.log('Sending request:', requestBody)

      // Add timeout and limit context size
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 45000) // 45 second timeout

      try {
        const response = await fetch(`${config.apiBase}/api/ai/generate_bullet_from_keywords`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        console.log('Response status:', response.status)

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error')
          console.error('API error response:', errorText)
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
        }

        const result = await response.json()
        console.log('API result:', result)

        if (result.success && (result.bullet_text || (result.bullet_options && result.bullet_options.length > 0))) {
          const bulletText = result.bullet_text || result.bullet_options[0]
          const keywordsUsed = result.keywords_used || []
          console.log('Adding bullet:', bulletText, 'with keywords:', keywordsUsed)
          // Add the new bullet to the section with keywords metadata
          const sections = data.sections.map(s => {
            if (s.id === sectionId) {
              const newBullets = [...s.bullets, {
                id: Date.now().toString(),
                text: `• ${bulletText}`,
                params: {
                  generatedKeywords: keywordsUsed // Store keywords used for highlighting
                }
              }]
              console.log('New bullets for section:', newBullets)
              return {
                ...s,
                bullets: newBullets
              }
            }
            return s
          })
          console.log('Updating data with new sections:', sections)
          onChange({ ...data, sections })
          console.log('Bullet added successfully!')
        } else {
          console.error('API returned failure:', result)
          alert('Failed to generate bullet point: ' + (result.error || 'Unknown error'))
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timed out after 45 seconds. Please try again.')
        }
        throw fetchError
      }
    } catch (error: any) {
      console.error('Bullet generation failed:', error)
      const errorMessage = error?.message || 'Unknown error occurred'
      if (errorMessage.includes('timeout') || errorMessage.includes('timed out') || errorMessage.includes('AbortError')) {
        alert('Request timed out. The AI service may be slow right now. Please try again in a moment.')
      } else if (errorMessage.includes('500') || errorMessage.includes('503')) {
        alert('AI service is temporarily unavailable. Please try again in a moment.')
      } else {
        alert('Bullet generation failed: ' + errorMessage)
      }
    } finally {
      setIsGeneratingBullet(false)
    }
  }


  const handleGrammarSuggestion = (sectionId: string, bulletId: string, newText: string) => {
    if (sectionId === 'summary') {
      onChange({ ...data, summary: newText })
    } else {
      const sections = data.sections.map(s =>
        s.id === sectionId
          ? {
            ...s,
            bullets: s.bullets.map(b =>
              b.id === bulletId ? { ...b, text: newText } : b
            )
          }
          : s
      )
      onChange({ ...data, sections })
    }
  }

  return (
    <div className="flex bg-gray-50 min-h-screen editor-layout">
      {/* Left Sidebar - Hidden when used in ModernEditorLayout */}
      {!hideSidebar && (
        <div className="hidden lg:block sticky top-0 h-screen overflow-y-auto">
          <LeftSidebar
            resumeData={data}
            onResumeUpdate={onChange}
            roomId={roomId}
            onCreateRoom={onCreateRoom}
            onJoinRoom={onJoinRoom}
            onLeaveRoom={onLeaveRoom}
            isConnected={isConnected}
            activeUsers={activeUsers}
            onViewChange={onViewChange}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1" ref={editorRef}>
        {/* Mobile Sidebar Toggle */}
        <div className="lg:hidden fixed top-4 left-4 z-40">
          <button
            onClick={() => {/* TODO: Add mobile sidebar toggle */ }}
            className="bg-white shadow-lg rounded-lg p-3 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* AI Loading Indicator */}
        {isAILoading && (
          <div className="fixed inset-0 z-[9998] bg-black/50 flex items-center justify-center">
            <div className="bg-white rounded-xl px-8 py-6 shadow-2xl flex items-center gap-4 animate-fade-in">
              <div className="loading-spinner w-6 h-6 border-primary-500"></div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-700">AI is improving your text...</span>
                <div className="loading-dots mt-1">
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Resume Editor Canvas */}
        <div className="h-full overflow-y-auto bg-gray-50 custom-scrollbar">
          {/* Editor Toolbar */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3">
            <div className="flex items-center justify-between">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Resumes</span>
                <span>/</span>
                <span className="text-gray-900 font-medium">{data.name || 'Untitled Resume'}</span>
                <span>/</span>
                <span className="text-gray-600">Editor</span>
              </div>

              {/* Center: View Toggle */}
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg">
                  Sections
                </button>
                <button className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg">
                  Full Page Preview
                </button>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">
                  Saved · just now
                </span>
              </div>
            </div>
          </div>

          {/* Resume Canvas */}
          <div className="max-w-4xl mx-auto py-6 px-4">
            {/* Candidate Name */}
            <div className="mb-4">
              <h1 
                contentEditable
                suppressContentEditableWarning
                data-editable-type="field"
                data-field="name"
                onBlur={(e) => updateField('name', e.currentTarget.textContent || '')}
                className="text-2xl font-bold text-gray-900 text-center outline-none hover:bg-blue-50 focus:bg-blue-50 rounded transition-colors cursor-text px-2 py-1"
              >
                {data.name || 'Your Name'}
              </h1>
            </div>

            {/* All Sections - Sortable */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleSectionDragEnd}
            >
              <SortableContext
                items={sectionOrder}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {sectionOrder.map((sectionId) => {
                    // Title Section
                    if (sectionId === 'title') {
                      return (
                        <SortableSectionCard
                          key="title"
                          id="title"
                          title="Title Section"
                          icon="📋"
                          isEnabled={true}
                          fieldCount={1 + customTitleFields.length}
                          isCollapsed={!isTitleSectionOpen}
                          onToggleCollapse={() => setIsTitleSectionOpen(!isTitleSectionOpen)}
                        >
                          <div className="space-y-2">
                            {/* Default Title with Checkbox */}
                            <div className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg group">
                              <input
                                type="checkbox"
                                checked={(data as any).fieldsVisible?.title !== false}
                                onChange={(e) => {
                                  const fieldsVisible = { ...(data as any).fieldsVisible, title: e.target.checked }
                                  onChange({ ...data, fieldsVisible })
                                }}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer flex-shrink-0"
                              />
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                data-editable-type="field"
                                data-field="title"
                                onBlur={(e) => updateField('title', e.currentTarget.textContent || '')}
                                className={`flex-1 text-sm outline-none hover:bg-blue-50 focus:bg-blue-50 px-2 py-1 rounded transition-colors cursor-text ${(data as any).fieldsVisible?.title === false ? 'text-gray-400 line-through' : 'text-gray-700'
                                  }`}
                              >
                                {data.title || 'Click to edit title'}
                              </div>
                            </div>

                            {/* Custom Title Fields */}
                            {customTitleFields.map((customField) => (
                              <div key={customField.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg group">
                                <input
                                  type="checkbox"
                                  checked={(data as any).fieldsVisible?.[customField.field] !== false}
                                  onChange={(e) => {
                                    const fieldsVisible = { ...(data as any).fieldsVisible, [customField.field]: e.target.checked }
                                    onChange({ ...data, fieldsVisible })
                                  }}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer flex-shrink-0"
                                />
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  data-editable-type="field"
                                  data-field={customField.field}
                                  onBlur={(e) => {
                                    const value = e.currentTarget.textContent || '';
                                    onChange({ ...data, [customField.field]: value });
                                  }}
                                  className={`flex-1 text-sm outline-none hover:bg-blue-50 focus:bg-blue-50 px-2 py-1 rounded transition-colors cursor-text ${(data as any).fieldsVisible?.[customField.field] === false ? 'text-gray-400 line-through' : 'text-gray-700'
                                    }`}
                                >
                                  {(data as any)[customField.field] || 'Click to edit custom title'}
                                </div>
                                <button
                                  onClick={() => removeCustomTitleField(customField.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity flex-shrink-0"
                                  title="Remove this field"
                                >
                                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            ))}

                            {/* Add Title Field Button */}
                            <button
                              onClick={addCustomTitleField}
                              className="w-full mt-2 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                            >
                              + Add Title Field
                            </button>
                          </div>
                        </SortableSectionCard>
                      )
                    }

                    // Contact Section
                    if (sectionId === 'contact') {
                      return (
                        <SortableSectionCard
                          key="contact"
                          id="contact"
                          title="Contact Information"
                          icon="📞"
                          isEnabled={true}
                          fieldCount={contactFieldOrder.length + customContactFields.length}
                          isCollapsed={!isContactSectionOpen}
                          onToggleCollapse={() => setIsContactSectionOpen(!isContactSectionOpen)}
                        >
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleContactFieldDragEnd}
                          >
                            <SortableContext
                              items={contactFieldOrder}
                            >
                              <div className="grid grid-cols-2 gap-2">
                                {contactFieldOrder
                                  .filter((fieldKey, index, self) => self.indexOf(fieldKey) === index)
                                  .map((fieldKey) => {
                                    const fieldIcons: Record<string, string> = {
                                      email: '📧',
                                      phone: '📱',
                                      location: '📍',
                                      linkedin: '💼',
                                      website: '🌐',
                                      github: '💻',
                                      twitter: '🐦',
                                    }
                                    const fieldLabels: Record<string, string> = {
                                      email: 'Email',
                                      phone: 'Phone',
                                      location: 'Location',
                                      linkedin: 'LinkedIn',
                                      website: 'Website',
                                      github: 'GitHub',
                                      twitter: 'Twitter',
                                    }
                                    const icon = fieldIcons[fieldKey] || '📧'
                                    const label = fieldLabels[fieldKey] || fieldKey
                                    const value = (data as any)[fieldKey] || ''

                                    return (
                                      <ModernContactField
                                        key={`contact-${fieldKey}`}
                                        icon={icon}
                                        label={label}
                                        value={value}
                                        fieldKey={fieldKey}
                                        data={data}
                                        onChange={onChange}
                                      />
                                    )
                                  })}

                                {/* Custom Contact Fields */}
                                {customContactFields.map((customField) => (
                                  <ModernContactField
                                    key={`custom-${customField.id}`}
                                    icon="📧"
                                    label={customField.label}
                                    value={(data as any)[customField.field] || ''}
                                    fieldKey={customField.field}
                                    data={data}
                                    onChange={onChange}
                                    onRemove={() => removeCustomContactField(customField.id)}
                                  />
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>

                          {/* Add Contact Field Button */}
                          <button
                            onClick={addCustomContactField}
                            className="w-full mt-3 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                          >
                            + Add Contact Field
                          </button>
                        </SortableSectionCard>
                      )
                    }

                    // Summary Section
                    if (sectionId === 'summary') {
                      return (
                        <SortableSectionCard
                          key="summary"
                          id="summary"
                          title="Professional Summary"
                          icon="📝"
                          isEnabled={(data as any).fieldsVisible?.summary !== false}
                          onToggleVisibility={() => {
                            const currentFieldsVisible = (data as any).fieldsVisible || {}
                            const newFieldsVisible = {
                              ...currentFieldsVisible,
                              summary: currentFieldsVisible.summary === false ? undefined : false
                            }
                            onChange({ ...data, fieldsVisible: newFieldsVisible })
                          }}
                        >
                          <div className="prose max-w-none">
                            <div
                              contentEditable
                              suppressContentEditableWarning
                              data-editable-type="field"
                              data-field="summary"
                              onBlur={(e) => updateField('summary', e.currentTarget.textContent || '')}
                              className="text-sm text-gray-700 leading-relaxed min-h-[100px] px-3 py-2 rounded-lg outline-none hover:bg-blue-50 focus:bg-blue-50 transition-colors cursor-text border border-gray-200"
                            >
                              {data.summary || 'Write a compelling professional summary that highlights your key skills and experience...'}
                            </div>
                            <button
                              onClick={generateSummaryFromExperience}
                              disabled={isSummaryGenerating || !data.sections.length}
                              className="mt-3 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-xs font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                              title="AI will analyze your work experience and create an ATS-optimized summary"
                            >
                              {isSummaryGenerating ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                  Generating...
                                </>
                              ) : (
                                <>
                                  🤖 Generate Summary
                                </>
                              )}
                            </button>
                          </div>
                        </SortableSectionCard>
                      )
                    }

                    // Dynamic Sections
                    const section = data.sections.find(s => s.id === sectionId)
                    if (section) {
                      const isSectionOpen = openSections.has(section.id);
                      const bulletCount = (section.bullets || []).length;
                      const sectionIcons: Record<string, string> = {
                        'Work Experience': '💼',
                        'Education': '🎓',
                        'Skills': '🛠️',
                        'Projects': '🚀',
                        'Certifications': '🏆',
                        'Languages': '🌐',
                        'Awards': '⭐',
                      }
                      const icon = sectionIcons[section.title] || '📄'

                      const isSectionCollapsed = !openSections.has(section.id)
                      return (
                        <SortableSectionCard
                          key={section.id}
                          id={section.id}
                          title={section.title}
                          icon={icon}
                          isEnabled={section.params?.visible !== false}
                          fieldCount={bulletCount}
                          isCollapsed={isSectionCollapsed}
                          onToggleCollapse={() => {
                            setOpenSections(prev => {
                              const updated = new Set(prev)
                              if (updated.has(section.id)) {
                                updated.delete(section.id)
                              } else {
                                updated.add(section.id)
                              }
                              return updated
                            })
                          }}
                          onToggleVisibility={() => {
                            const updatedSections = data.sections.map(s =>
                              s.id === section.id
                                ? {
                                  ...s,
                                  params: {
                                    ...s.params,
                                    visible: s.params?.visible === false ? undefined : false
                                  }
                                }
                                : s
                            )
                            onChange({ ...data, sections: updatedSections })
                          }}
                          onRemove={() => removeSection(section.id)}
                        >
                          <div className="space-y-4">
                            {/* Comments Section */}
                            {showComments === section.id && roomId && onAddComment && onResolveComment && onDeleteComment && (
                              <div className="mb-4">
                                <Comments
                                  roomId={roomId}
                                  targetType="section"
                                  targetId={section.id}
                                  onAddComment={onAddComment}
                                  onResolveComment={onResolveComment}
                                  onDeleteComment={onDeleteComment}
                                />
                              </div>
                            )}

                            {/* Modern Experience Layout - All Sections */}
                            <div className="space-y-6">
                              {/* Add New Item Button - At Top */}
                              {getSectionType(section.title) !== 'skill' && (
                                <div className="flex flex-col items-center mb-6 gap-3">
                                  <button
                                    onClick={() => {
                                      if (section.title.toLowerCase().includes('experience') || section.title.toLowerCase().includes('work')) {
                                        // Add new company for work experience
                                        const newItemBullet = {
                                          id: `company-${Date.now()}`,
                                          text: '**New Company / Location / New Role / Date Range**',
                                          params: {}
                                        }

                                        const sections = data.sections.map(s =>
                                          s.id === section.id
                                            ? {
                                              ...s,
                                              bullets: [newItemBullet, ...s.bullets]
                                            }
                                            : s
                                        )
                                        onChange({ ...data, sections })
                                      } else {
                                        // Add simple bullet point for other sections
                                        const newBullet = {
                                          id: `bullet-${Date.now()}`,
                                          text: '• ',
                                          params: {}
                                        }

                                        const sections = data.sections.map(s =>
                                          s.id === section.id
                                            ? {
                                              ...s,
                                              bullets: [newBullet, ...s.bullets]
                                            }
                                            : s
                                        )
                                        onChange({ ...data, sections })
                                      }
                                    }}
                                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                                  >
                                    <span>+</span> Add {section.title.toLowerCase().includes('experience') || section.title.toLowerCase().includes('work') ? 'Company' : 'Bullet Point'}
                                  </button>

                                </div>
                              )}

                              {/* Skills Section - Add Skill Button */}
                              {getSectionType(section.title) === 'skill' && (
                                <div className="mb-4">
                                  <button
                                    onClick={() => {
                                      const newSkill = {
                                        id: `skill-${Date.now()}`,
                                        text: 'New Skill',
                                        params: { visible: true }
                                      }
                                      const sections = data.sections.map(s =>
                                        s.id === section.id
                                          ? {
                                            ...s,
                                            bullets: [...s.bullets, newSkill]
                                          }
                                          : s
                                      )
                                      onChange({ ...data, sections })
                                    }}
                                    className="px-3 py-1.5 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                                  >
                                    <span>+</span> Add Skill
                                  </button>

                                </div>
                              )}

                              {/* Work Experience - Company-based layout */}
                              {section.title.toLowerCase().includes('experience') || section.title.toLowerCase().includes('work') ? (
                                getOrderedCompanyGroups(section.bullets).filter((group) => {
                                  const headerBullet = group[0]
                                  return isCompanyHeaderBullet(headerBullet)
                                }).map((group, groupIdx) => {
                                  const headerBullet = group[0]

                                  const headerText = headerBullet.text.replace(/\*\*/g, '').trim()
                                  const parts = headerText.split(' / ')
                                  // Support both old format (3 parts) and new format (4 parts)
                                  // Old: Company Name / Job Title / Date Range
                                  // New: Company Name / Location / Title / Date Range
                                  const companyName = parts[0]?.trim() || 'Unknown Company'
                                  const location = parts.length >= 4 ? parts[1]?.trim() : ''
                                  const jobTitle = parts.length >= 4 ? parts[2]?.trim() : (parts[1]?.trim() || 'Unknown Role')
                                  const dateRange = parts.length >= 4 ? parts[3]?.trim() : (parts[2]?.trim() || 'Unknown Date')

                                  const companyBullets: Bullet[] = group.slice(1)
                                  const uncheckedBulletCount = companyBullets.filter(bullet => bullet.params?.visible === false).length
                                  const companyGroupId = `company-${headerBullet.id}`
                                  const isCompanyCollapsed = !openCompanyGroups.has(companyGroupId)

                                  return (
                                    <div
                                      key={companyGroupId}
                                      className={`bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${uncheckedBulletCount > 0 ? 'border-blue-300 bg-blue-50/40' : 'border-gray-200'} ${headerBullet.params?.visible === false ? 'opacity-60 grayscale' : ''}`}
                                    >
                                      <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3 flex-1">
                                          <button
                                            onClick={() => {
                                              setOpenCompanyGroups(prev => {
                                                const updated = new Set(prev)
                                                if (updated.has(companyGroupId)) {
                                                  updated.delete(companyGroupId)
                                                } else {
                                                  updated.add(companyGroupId)
                                                }
                                                return updated
                                              })
                                            }}
                                            className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                                            title={isCompanyCollapsed ? 'Expand company' : 'Collapse company'}
                                          >
                                            <svg
                                              className="w-4 h-4 text-gray-600 transition-transform"
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                              style={{ transform: isCompanyCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                                            >
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                          </button>
                                          <input
                                            type="checkbox"
                                            checked={headerBullet.params?.visible !== false}
                                            onChange={(e) => {
                                              e.stopPropagation()
                                              const newChecked = Boolean(e.target.checked)
                                              const updatedData = {
                                                ...data,
                                                sections: data.sections.map(s => {
                                                  if (s.id !== section.id) return s

                                                  const updatedBullets = s.bullets.map(b =>
                                                    b.id === headerBullet.id
                                                      ? {
                                                        ...b,
                                                        params: {
                                                          ...(b.params || {}),
                                                          visible: newChecked ? true : false
                                                        }
                                                      }
                                                      : b
                                                  )

                                                  return { ...s, bullets: flattenGroups(getOrderedCompanyGroups(updatedBullets)) }
                                                })
                                              }
                                              onChange(updatedData)
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer flex-shrink-0"
                                            title="Toggle this work experience entry visibility in preview"
                                          />
                                          <div className="w-3 h-3 bg-black rounded-full flex-shrink-0"></div>
                                          <div className="flex-1">
                                            {/* Line 1: Company Name / Location */}
                                            <div className="flex items-center gap-2 mb-1">
                                              <div
                                                contentEditable
                                                suppressContentEditableWarning
                                                data-editable-type="company-name"
                                                data-section-id={section.id}
                                                data-bullet-id={headerBullet.id}
                                                onBlur={(e) => {
                                                  const locationText = location || 'Location'
                                                  const newText = `**${e.currentTarget.textContent || 'Company Name'} / ${locationText} / ${jobTitle} / ${dateRange}**`
                                                  updateBullet(section.id, headerBullet.id, newText)
                                                }}
                                                className={`text-lg font-bold outline-none hover:bg-blue-50 focus:bg-blue-50 px-2 py-1 rounded transition-colors cursor-text ${headerBullet.params?.visible === false ? 'text-gray-400 line-through' : 'text-gray-900'
                                                  }`}
                                              >
                                                {companyName}
                                              </div>
                                              {location && (
                                                <span className="text-gray-500">/</span>
                                              )}
                                              <div
                                                contentEditable
                                                suppressContentEditableWarning
                                                data-editable-type="location"
                                                data-section-id={section.id}
                                                data-bullet-id={headerBullet.id}
                                                onBlur={(e) => {
                                                  const newText = `**${companyName} / ${e.currentTarget.textContent || 'Location'} / ${jobTitle} / ${dateRange}**`
                                                  updateBullet(section.id, headerBullet.id, newText)
                                                }}
                                                className={`text-sm text-gray-600 outline-none hover:bg-blue-50 focus:bg-blue-50 px-2 py-1 rounded transition-colors cursor-text ${headerBullet.params?.visible === false ? 'text-gray-400 line-through' : ''
                                                  }`}
                                              >
                                                {location || 'Location'}
                                              </div>
                                            </div>
                                            {/* Line 2: Title (left) and Date Range (right) */}
                                            <div className="flex items-center justify-between">
                                              <div
                                                contentEditable
                                                suppressContentEditableWarning
                                                data-editable-type="job-title"
                                                data-section-id={section.id}
                                                data-bullet-id={headerBullet.id}
                                                onBlur={(e) => {
                                                  const locationText = location || 'Location'
                                                  const newText = `**${companyName} / ${locationText} / ${e.currentTarget.textContent || 'Job Title'} / ${dateRange}**`
                                                  updateBullet(section.id, headerBullet.id, newText)
                                                }}
                                                className={`text-sm font-medium outline-none hover:bg-blue-50 focus:bg-blue-50 px-2 py-1 rounded transition-colors cursor-text ${headerBullet.params?.visible === false ? 'text-gray-400 line-through' : 'text-gray-700'
                                                  }`}
                                              >
                                                {jobTitle}
                                              </div>
                                              <div
                                                contentEditable
                                                suppressContentEditableWarning
                                                data-editable-type="date-range"
                                                data-section-id={section.id}
                                                data-bullet-id={headerBullet.id}
                                                onBlur={(e) => {
                                                  const locationText = location || 'Location'
                                                  const newText = `**${companyName} / ${locationText} / ${jobTitle} / ${e.currentTarget.textContent || 'Date Range'}**`
                                                  updateBullet(section.id, headerBullet.id, newText)
                                                }}
                                                className="text-sm text-gray-500 outline-none hover:bg-blue-50 focus:bg-blue-50 px-2 py-1 rounded transition-colors cursor-text"
                                              >
                                                {dateRange}
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2">

                                          <button
                                            onClick={() => {
                                              setAiWorkExperienceContext({
                                                companyName,
                                                location: location || '',
                                                jobTitle,
                                                dateRange,
                                                sectionId: section.id,
                                                bulletId: headerBullet.id,
                                                mode: 'new'
                                              })
                                              setShowAIWorkExperience(true)
                                            }}
                                            className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-semibold rounded-lg hover:from-orange-600 hover:to-red-600 transition-all shadow-md hover:shadow-lg flex items-center gap-1"
                                            title="🤖 AI Assistant - Generate work experience content"
                                          >
                                            <span>🤖</span> AI Assistant
                                          </button>

                                          <button
                                            onClick={() => {
                                              const companyBulletIds = companyBullets.map(b => b.id)
                                              const updatedBullets = section.bullets.filter(b =>
                                                b.id !== headerBullet.id && !companyBulletIds.includes(b.id)
                                              )
                                              const sections = data.sections.map(s =>
                                                s.id === section.id ? { ...s, bullets: updatedBullets } : s
                                              )
                                              onChange({ ...data, sections })
                                            }}
                                            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-800 rounded-lg font-semibold flex items-center justify-center text-xs transition-colors shadow-sm hover:shadow-md"
                                            title="Delete company panel"
                                          >
                                            <span>×</span> Delete Company
                                          </button>
                                        </div>
                                      </div>

                                      {!isCompanyCollapsed && (
                                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                          <div className="space-y-1.5">
                                            {companyBullets.filter(companyBullet => {
                                              const normalizedText = companyBullet.text?.trim() || ''
                                              const isHeaderLike = normalizedText.startsWith('**') || normalizedText.split(' / ').length >= 2
                                              const isBulletLike = normalizedText.startsWith('•') || normalizedText.startsWith('-')
                                              return isBulletLike || !isHeaderLike
                                            }).map(companyBullet => {

                                              const generatedKeywords = companyBullet.params?.generatedKeywords as string[] | undefined;
                                              const bulletMatch = checkBulletMatches(companyBullet.text, section.title, generatedKeywords)
                                              const hasMatch = bulletMatch.matches
                                              const hasNoMatch = jdKeywords && !hasMatch && companyBullet.text.trim().length > 0
                                              const isDisabled = companyBullet.params?.visible === false
                                              const disabledHasMissing = isDisabled && jdKeywords && jdKeywords.missing.length > 0 &&
                                                jdKeywords.missing.some(kw => {
                                                  const regex = new RegExp(`\\b${kw.toLowerCase().replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i')
                                                  return regex.test(companyBullet.text.toLowerCase())
                                                })

                                              return (
                                                <div
                                                  key={companyBullet.id}
                                                  className={`group flex items-start gap-2 px-2 py-1 rounded border border-transparent ${companyBullet.params?.visible === false ? 'opacity-70' : ''
                                                    }`}
                                                >
                                                  <input
                                                    type="checkbox"
                                                    checked={companyBullet.params?.visible !== false}
                                                    onChange={(e) => {
                                                      e.stopPropagation()
                                                      const newChecked = Boolean(e.target.checked)
                                                      const updatedData = {
                                                        ...data,
                                                        sections: data.sections.map(s => {
                                                          if (s.id !== section.id) return s

                                                          const updatedBullets = s.bullets.map(b =>
                                                            b.id === companyBullet.id
                                                              ? {
                                                                ...b,
                                                                params: {
                                                                  ...(b.params || {}),
                                                                  visible: newChecked ? true : false
                                                                }
                                                              }
                                                              : b
                                                          )

                                                          const companyBulletIds = companyBullets.map(b => b.id)
                                                          const indexes = companyBulletIds
                                                            .map(id => updatedBullets.findIndex(b => b.id === id))
                                                            .filter(index => index !== -1)

                                                          if (indexes.length > 0) {
                                                            const currentRange = indexes.map(index => updatedBullets[index])
                                                            const orderedRange = [
                                                              ...currentRange.filter(b => b.params?.visible !== false),
                                                              ...currentRange.filter(b => b.params?.visible === false)
                                                            ]

                                                            const reordered = [...updatedBullets]
                                                            const sortedIndicesDesc = [...indexes].sort((a, b) => b - a)
                                                            sortedIndicesDesc.forEach(index => {
                                                              reordered.splice(index, 1)
                                                            })
                                                            reordered.splice(Math.min(...indexes), 0, ...orderedRange)

                                                            return { ...s, bullets: flattenGroups(getOrderedCompanyGroups(reordered)) }
                                                          }

                                                          return { ...s, bullets: flattenGroups(getOrderedCompanyGroups(updatedBullets)) }
                                                        })
                                                      }
                                                      onChange(updatedData)
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer mt-2 flex-shrink-0"
                                                    title={hasMatch ? `Matches JD keywords: ${bulletMatch.matchedKeywords.join(', ')}` : 'Toggle bullet visibility in preview'}
                                                  />
                                                  <div className="flex-1 min-w-0">
                                                    <div className="relative flex-1 group">
                                                      {hasMatch && bulletMatch.matchedKeywords.length > 0 && (
                                                        <div
                                                          className={`text-sm leading-relaxed pointer-events-none absolute inset-0 z-0 group-focus-within:opacity-0 group-hover:opacity-0 transition-opacity ${companyBullet.params?.visible === false ? 'text-gray-400 line-through' : 'text-gray-800'
                                                            }`}
                                                          data-highlight-overlay="true"
                                                        >
                                                          {highlightKeywordsInText((companyBullet.text || '').replace(/^•\s*/, ''), bulletMatch.matchedKeywords, bulletMatch.keywordCounts)}
                                                        </div>
                                                      )}
                                                      <div
                                                        contentEditable
                                                        suppressContentEditableWarning
                                                        data-editable-type="bullet"
                                                        data-section-id={section.id}
                                                        data-bullet-id={companyBullet.id}
                                                        data-is-work-exp="true"
                                                        onFocus={(e) => {
                                                          // Hide overlay when focused
                                                          const overlay = e.currentTarget.parentElement?.querySelector('[data-highlight-overlay="true"]') as HTMLElement;
                                                          if (overlay) {
                                                            overlay.style.opacity = '0';
                                                            overlay.style.pointerEvents = 'none';
                                                          }
                                                        }}
                                                        onBlur={(e) => {
                                                          // Show overlay when not focused (if it exists)
                                                          const overlay = e.currentTarget.parentElement?.querySelector('[data-highlight-overlay="true"]') as HTMLElement;
                                                          if (overlay && hasMatch && bulletMatch.matchedKeywords.length > 0) {
                                                            overlay.style.opacity = '1';
                                                          }
                                                          updateBullet(section.id, companyBullet.id, e.currentTarget.textContent || '')
                                                          if (typeof window !== 'undefined') {
                                                            window.dispatchEvent(new CustomEvent('resumeDataUpdated', {
                                                              detail: {
                                                                resumeData: {
                                                                  ...data,
                                                                  sections: data.sections.map(s =>
                                                                    s.id === section.id
                                                                      ? {
                                                                        ...s,
                                                                        bullets: s.bullets.map(b =>
                                                                          b.id === companyBullet.id ? { ...b, text: e.currentTarget.textContent || '' } : b
                                                                        )
                                                                      }
                                                                      : s
                                                                  )
                                                                }
                                                              }
                                                            }))
                                                          }
                                                        }}
                                                        onMouseDown={(e) => {
                                                          e.stopPropagation()
                                                          e.currentTarget.focus()
                                                        }}
                                                        onClick={(e) => {
                                                          e.stopPropagation()
                                                          e.currentTarget.focus()
                                                          const range = document.createRange()
                                                          const sel = window.getSelection()
                                                          range.selectNodeContents(e.currentTarget)
                                                          range.collapse(false)
                                                          sel?.removeAllRanges()
                                                          sel?.addRange(range)
                                                        }}
                                                        className={`text-sm leading-relaxed outline-none hover:bg-blue-50 focus:bg-blue-50 rounded transition-colors cursor-text relative z-10 ${companyBullet.params?.visible === false ? 'text-gray-400 line-through' : 'text-gray-700'
                                                          }`}
                                                      >
                                                        {companyBullet.text.replace(/^•\s*/, '')}
                                                      </div>
                                                    </div>
                                                  </div>

                                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                      onClick={() => {
                                                        if (jdKeywords && jdKeywords.missing.length > 0) {
                                                          const cleanedText = (companyBullet.text || '').replace(/^[-•*]+\s*/, '').trim()
                                                          setAiImproveContext({
                                                            sectionId: section.id,
                                                            bulletId: companyBullet.id,
                                                            currentText: companyBullet.text,
                                                            mode: cleanedText.length > 0 ? 'existing' : 'new'
                                                          })
                                                          setShowAIImproveModal(true)
                                                        } else if (onAIImprove) {
                                                          ; (async () => {
                                                            try {
                                                              setIsAILoading(true)
                                                              const improvedText = await onAIImprove(companyBullet.text)
                                                              updateBullet(section.id, companyBullet.id, improvedText)
                                                            } catch (error) {
                                                              console.error('AI improvement failed:', error)
                                                            } finally {
                                                              setIsAILoading(false)
                                                            }
                                                          })()
                                                        }
                                                      }}
                                                      disabled={isAILoading}
                                                      className="px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-semibold rounded hover:from-blue-600 hover:to-purple-600 transition-all shadow-sm hover:shadow-md flex items-center gap-1 disabled:opacity-50"
                                                      title="✨ AI Improve - Enhance with missing JD keywords"
                                                    >
                                                      <span>{isAILoading ? '⏳' : '✨'}</span>
                                                    </button>

                                                    <button
                                                      onClick={() => removeBullet(section.id, companyBullet.id)}
                                                      className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-800 rounded-lg font-semibold flex items-center justify-center text-xs transition-colors shadow-sm hover:shadow-md"
                                                      title="Remove bullet point"
                                                    >
                                                      <span>×</span>
                                                    </button>
                                                  </div>
                                                </div>
                                              )
                                            })}

                                            <div className="flex justify-center pt-2">
                                              <button
                                                onClick={() => {
                                                  const companyBulletIds = companyBullets.map(b => b.id)
                                                  const lastBulletId = companyBulletIds[companyBulletIds.length - 1]
                                                  const lastIndex = section.bullets.findIndex(b => b.id === lastBulletId)
                                                  const newBullet = { id: Date.now().toString(), text: '• ', params: {} }
                                                  const sections = data.sections.map(s =>
                                                    s.id === section.id
                                                      ? {
                                                        ...s,
                                                        bullets: [
                                                          ...s.bullets.slice(0, lastIndex + 1),
                                                          newBullet,
                                                          ...s.bullets.slice(lastIndex + 1)
                                                        ]
                                                      }
                                                      : s
                                                  )
                                                  onChange({ ...data, sections })
                                                }}
                                                className="px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg font-semibold flex items-center gap-1 transition-all text-xs"
                                                title="Add bullet point to this company"
                                              >
                                                <span>+</span> Add Bullet
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })
                              ) : getSectionType(section.title) === 'skill' ? (
                                /* Skills Section - Checkbox Chips Layout */
                                <div className="flex flex-wrap gap-2">
                                  {section.bullets
                                    .filter(bullet => !bullet.text?.startsWith('**'))
                                    .filter((bullet) => {
                                      const skillName = bullet.text.replace(/^•\s*/, '').trim()
                                      return skillName
                                    })
                                    .map((bullet) => {
                                      const skillName = bullet.text.replace(/^•\s*/, '').trim()

                                      return (
                                        <label
                                          key={bullet.id}
                                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-all border-2 ${bullet.params?.visible !== false
                                            ? 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200'
                                            : 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                                            }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={bullet.params?.visible !== false}
                                            onChange={(e) => {
                                              e.stopPropagation()
                                              const newChecked = Boolean(e.target.checked)
                                              const updatedData = {
                                                ...data,
                                                sections: data.sections.map(s =>
                                                  s.id === section.id
                                                    ? {
                                                      ...s,
                                                      bullets: s.bullets.map(b =>
                                                        b.id === bullet.id
                                                          ? {
                                                            ...b,
                                                            params: {
                                                              ...(b.params || {}),
                                                              visible: newChecked ? true : false
                                                            }
                                                          }
                                                          : b
                                                      )
                                                    }
                                                    : s
                                                )
                                              }
                                              onChange(updatedData)
                                            }}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                          <span
                                            contentEditable
                                            suppressContentEditableWarning
                                            data-editable-type="bullet"
                                            data-section-id={section.id}
                                            data-bullet-id={bullet.id}
                                            onBlur={(e) => {
                                              const newText = e.currentTarget.textContent?.trim() || ''
                                              if (newText) {
                                                updateBullet(section.id, bullet.id, newText)
                                              }
                                            }}
                                            className="outline-none cursor-text"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            {skillName}
                                          </span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              removeBullet(section.id, bullet.id)
                                            }}
                                            className="ml-1 text-gray-400 hover:text-red-600 transition-colors"
                                            title="Remove skill"
                                          >
                                            ×
                                          </button>
                                        </label>
                                      )
                                    })}
                                </div>
                              ) : (
                                /* Simple Bullet Points for other non-work experience sections */
                                (section.bullets || []).map((bullet, idx) => {
                                  // Show bullets that start with • or don't start with ** (simple bullet points)
                                  if (bullet.text?.startsWith('**')) return null

                                  // Exclude certifications from keyword matching
                                  const isCertificationSection = section.title.toLowerCase().includes('certif') ||
                                    section.title.toLowerCase().includes('license') ||
                                    section.title.toLowerCase().includes('credential');

                                  const bulletMatch = isCertificationSection
                                    ? { matches: false, matchedKeywords: [], keywordCounts: {} }
                                    : (() => {
                                      const generatedKeywords = bullet.params?.generatedKeywords as string[] | undefined;
                                      return checkBulletMatches(bullet.text, section.title, generatedKeywords);
                                    })();
                                  const hasMatch = bulletMatch.matches;
                                  const hasNoMatch = !isCertificationSection && jdKeywords && !hasMatch && bullet.text.trim().length > 0;

                                  // Check if disabled bullet has missing keywords
                                  const isDisabled = bullet.params?.visible === false;
                                  return (
                                    <div
                                      key={bullet.id}
                                      className={`group flex items-start gap-2 px-2 py-1 rounded border border-transparent ${bullet.params?.visible === false ? 'opacity-70' : ''
                                        }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={bullet.params?.visible !== false}
                                        onChange={(e) => {
                                          e.stopPropagation()
                                          const newChecked = e.target.checked
                                          const sections = data.sections.map(s =>
                                            s.id === section.id
                                              ? {
                                                ...s,
                                                bullets: s.bullets.map(b =>
                                                  b.id === bullet.id
                                                    ? { ...b, params: { ...b.params, visible: newChecked } }
                                                    : b
                                                )
                                              }
                                              : s
                                          )
                                          onChange({ ...data, sections })
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer mt-2 flex-shrink-0"
                                        title={hasMatch ? `Matches JD keywords: ${bulletMatch.matchedKeywords.join(', ')}` : "Toggle bullet visibility in preview"}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="relative flex-1 group">
                                          {hasMatch && bulletMatch.matchedKeywords.length > 0 && (
                                            <div
                                              className={`text-sm leading-relaxed pointer-events-none absolute inset-0 z-0 group-focus-within:opacity-0 group-hover:opacity-0 transition-opacity ${bullet.params?.visible === false ? 'text-gray-400 line-through' : 'text-gray-800'
                                                }`}
                                              data-highlight-overlay="true"
                                            >
                                              {highlightKeywordsInText((bullet.text || '').replace(/^•\s*/, ''), bulletMatch.matchedKeywords, bulletMatch.keywordCounts)}
                                            </div>
                                          )}
                                          <div
                                            contentEditable
                                            suppressContentEditableWarning
                                            data-editable-type="bullet"
                                            data-section-id={section.id}
                                            data-bullet-id={bullet.id}
                                            onFocus={(e) => {
                                              // Hide overlay when focused
                                              const overlay = e.currentTarget.parentElement?.querySelector('[data-highlight-overlay="true"]') as HTMLElement;
                                              if (overlay) {
                                                overlay.style.opacity = '0';
                                                overlay.style.pointerEvents = 'none';
                                              }
                                              // Ensure contentEditable has plain text
                                              if (e.currentTarget.innerHTML !== e.currentTarget.textContent) {
                                                e.currentTarget.textContent = e.currentTarget.textContent || '';
                                              }
                                            }}
                                            onBlur={(e) => {
                                              // Show overlay when not focused (if it exists)
                                              const overlay = e.currentTarget.parentElement?.querySelector('[data-highlight-overlay="true"]') as HTMLElement;
                                              if (overlay && hasMatch && bulletMatch.matchedKeywords.length > 0) {
                                                overlay.style.opacity = '1';
                                              }
                                              updateBullet(section.id, bullet.id, e.currentTarget.textContent || '')
                                              if (typeof window !== 'undefined') {
                                                window.dispatchEvent(new CustomEvent('resumeDataUpdated', {
                                                  detail: {
                                                    resumeData: {
                                                      ...data, sections: data.sections.map(s =>
                                                        s.id === section.id ? {
                                                          ...s, bullets: s.bullets.map(b =>
                                                            b.id === bullet.id ? { ...b, text: e.currentTarget.textContent || '' } : b
                                                          )
                                                        } : s
                                                      )
                                                    }
                                                  }
                                                }));
                                              }
                                            }}
                                            onMouseDown={(e) => {
                                              e.stopPropagation()
                                              e.currentTarget.focus()
                                            }}
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              e.currentTarget.focus()
                                              const range = document.createRange()
                                              const sel = window.getSelection()
                                              range.selectNodeContents(e.currentTarget)
                                              range.collapse(false)
                                              sel?.removeAllRanges()
                                              sel?.addRange(range)
                                            }}
                                            suppressHydrationWarning
                                            className={`text-sm leading-relaxed outline-none hover:bg-blue-50 focus:bg-blue-50 rounded transition-colors cursor-text relative z-10 ${bullet.params?.visible === false ? 'text-gray-400 line-through' : 'text-gray-700'
                                              }`}
                                          >
                                            {bullet.text.replace(/^•\s*/, '')}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Action Buttons on the Right */}
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {/* AI Improve Button */}
                                        <button
                                          onClick={() => {
                                            if (jdKeywords && jdKeywords.missing.length > 0) {
                                              const cleanedText = (bullet.text || '').replace(/^[-•*]+\s*/, '').trim()
                                              setAiImproveContext({
                                                sectionId: section.id,
                                                bulletId: bullet.id,
                                                currentText: bullet.text,
                                                mode: cleanedText.length > 0 ? 'existing' : 'new'
                                              })
                                              setShowAIImproveModal(true)
                                            } else if (onAIImprove) {
                                              ; (async () => {
                                                try {
                                                  setIsAILoading(true)
                                                  const improvedText = await onAIImprove(bullet.text)
                                                  updateBullet(section.id, bullet.id, improvedText)
                                                } catch (error) {
                                                  console.error('AI improvement failed:', error)
                                                } finally {
                                                  setIsAILoading(false)
                                                }
                                              })()
                                            }
                                          }}
                                          disabled={isAILoading}
                                          className="px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-semibold rounded hover:from-blue-600 hover:to-purple-600 transition-all shadow-sm hover:shadow-md flex items-center gap-1 disabled:opacity-50"
                                          title="✨ AI Improve - Enhance with missing JD keywords"
                                        >
                                          <span>{isAILoading ? '⏳' : '✨'}</span>
                                        </button>

                                        {/* Remove Button */}
                                        <button
                                          onClick={() => removeBullet(section.id, bullet.id)}
                                          className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-800 rounded-lg font-semibold flex items-center justify-center text-xs transition-colors shadow-sm hover:shadow-md"
                                          title="Remove bullet point"
                                        >
                                          <span>×</span>
                                        </button>
                                      </div>
                                    </div>
                                  )
                                })
                              )}
                            </div>
                          </div>
                        </SortableSectionCard>
                      )
                    }

                    return null
                  })}
                </div>
              </SortableContext>
            </DndContext>

            {/* AI Improve Modal with Missing Keywords */}
            {showAIImproveModal && aiImproveContext && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4" onClick={() => {
                setShowAIImproveModal(false);
                setAiImproveContext(null);
                setSelectedMissingKeywords(new Set());
                setGeneratedBulletOptions([]);
              }}>
                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600">
                    <h2 className="text-2xl font-bold text-white">✨ AI Improve with Missing Keywords</h2>
                    <button
                      onClick={() => {
                        setShowAIImproveModal(false);
                        setAiImproveContext(null);
                        setSelectedMissingKeywords(new Set());
                        setGeneratedBulletOptions([]);
                      }}
                      className="text-white hover:text-gray-200 text-2xl font-bold"
                    >
                      ×
                    </button>
                  </div>

                  <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    <div className="mb-4">
                      <p className="text-sm text-gray-700 mb-3">Current bullet:</p>
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-gray-800">{aiImproveContext.currentText}</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm font-semibold text-gray-900 mb-3">Select missing keywords to include (choose 2-8):</p>
                      <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto p-3 bg-blue-50 rounded-lg border border-blue-200">
                        {jdKeywords?.missing.filter(kw => kw.length > 1).slice(0, 30).map((keyword, idx) => {
                          const isSelected = selectedMissingKeywords.has(keyword)
                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                const newSelected = new Set(selectedMissingKeywords)
                                if (isSelected) {
                                  newSelected.delete(keyword)
                                } else if (newSelected.size < 8) {
                                  newSelected.add(keyword)
                                } else {
                                  alert('Please select maximum 8 keywords')
                                }
                                setSelectedMissingKeywords(newSelected)
                              }}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isSelected
                                ? 'bg-blue-600 text-white border-2 border-blue-700'
                                : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                                }`}
                            >
                              {isSelected && '✓ '}{keyword}
                            </button>
                          )
                        })}
                      </div>
                      {selectedMissingKeywords.size > 0 && (
                        <p className="text-xs text-gray-600 mt-2">
                          {selectedMissingKeywords.size} keyword{selectedMissingKeywords.size > 1 ? 's' : ''} selected {selectedMissingKeywords.size < 2 ? '(minimum 2 required)' : selectedMissingKeywords.size >= 8 ? '(maximum reached)' : ''}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={async () => {
                        if (!aiImproveContext) return
                        if (selectedMissingKeywords.size < 2) {
                          alert('Please select at least 2 keywords (minimum 2, maximum 8)')
                          return
                        }
                        if (selectedMissingKeywords.size > 8) {
                          alert('Please select maximum 8 keywords')
                          return
                        }

                        setIsGeneratingBullets(true)
                        try {
                          const keywordsArray = Array.from(selectedMissingKeywords)
                          const jobDescriptionText = typeof window !== 'undefined'
                            ? localStorage.getItem('currentJDText') || ''
                            : ''

                          const targetSection = data.sections.find((s: any) =>
                            normalizeId(s.id) === normalizeId(aiImproveContext.sectionId)
                          )

                          const sectionContext = targetSection
                            ? (targetSection.bullets || [])
                              .map((b: any) => (b.text || '').replace(/^[-•*]+\s*/, '').trim())
                              .filter(Boolean)
                              .join('\n')
                            : ''

                          const resumeContextParts = [
                            data.summary || '',
                            sectionContext
                          ].filter(Boolean)
                          // Limit context size to prevent slow API calls
                          const resumeContext = resumeContextParts.join('\n').substring(0, 500)

                          // Create AbortController for timeout
                          const controller = new AbortController()
                          const timeoutId = setTimeout(() => controller.abort(), 45000) // 45 second timeout

                          try {
                            const response = await fetch(`${config.apiBase}/api/ai/generate_bullet_from_keywords`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                keywords: keywordsArray,
                                current_bullet: aiImproveContext.currentText,
                                mode: aiImproveContext.mode === 'new' ? 'create' : 'improve',
                                job_description: jobDescriptionText.substring(0, 1000), // Limit JD size
                                resume_context: resumeContext,
                                company_title: targetSection?.title || data.name,
                                job_title: data.title,
                                count: aiImproveContext.mode === 'new' ? 3 : 1
                              }),
                              signal: controller.signal
                            })

                            clearTimeout(timeoutId)

                            if (!response.ok) {
                              const errorText = await response.text().catch(() => 'Unknown error')
                              throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
                            }

                            const result = await response.json()
                            console.log('AI bullet response:', result)

                            if (!result.success) {
                              throw new Error(result.error || 'AI request failed')
                            }

                            const parseBulletOptions = (raw: unknown): string[] => {
                              if (!raw) return []
                              if (Array.isArray(raw)) {
                                return raw
                                  .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
                                  .filter(Boolean)
                              }
                              if (typeof raw === 'string') {
                                const trimmed = raw.trim()
                                if (!trimmed) return []
                                try {
                                  const parsed = JSON.parse(trimmed)
                                  if (Array.isArray(parsed)) {
                                    return parsed
                                      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
                                      .filter(Boolean)
                                  }
                                } catch {
                                  // ignore JSON parse errors, fall back to splitting lines
                                }
                                return trimmed
                                  .split('\n')
                                  .map((line) => line.trim().replace(/^[-•*]+\s*/, '').trim())
                                  .filter(Boolean)
                              }
                              return []
                            }

                            if (result.mode === 'improve') {
                              const improvedRaw = (result.improved_bullet || result.bullet_text || '').trim()
                              if (!improvedRaw) {
                                throw new Error('AI did not return an improved bullet')
                              }
                              const sanitized = improvedRaw.replace(/^[-•*]+\s*/, '').trim()
                              const originalTrimmed = aiImproveContext.currentText.trim()
                              const needsBullet =
                                originalTrimmed.startsWith('•') ||
                                originalTrimmed.startsWith('-') ||
                                originalTrimmed.startsWith('*') ||
                                originalTrimmed === ''
                              const newText = needsBullet ? `• ${sanitized}` : sanitized
                              console.log('AI Improve: Applying improved text:', {
                                sectionId: aiImproveContext.sectionId,
                                bulletId: aiImproveContext.bulletId,
                                newText: newText.substring(0, 100),
                                originalText: aiImproveContext.currentText?.substring(0, 100),
                                needsBullet
                              })
                              updateBullet(aiImproveContext.sectionId, aiImproveContext.bulletId, newText)
                              setShowAIImproveModal(false)
                              setAiImproveContext(null)
                              setSelectedMissingKeywords(new Set())
                              setGeneratedBulletOptions([])
                              setSelectedBullets(new Set())
                            } else {
                              const optionSources: Array<unknown> = [
                                result.bullet_options,
                                result.bullet_points,
                                result.bullets,
                                result.options,
                                result.generated_bullets,
                                result.bullet_text
                              ]
                              let options: string[] = []

                              for (const source of optionSources) {
                                options = parseBulletOptions(source)
                                if (options.length) break
                              }

                              if (!options.length) {
                                throw new Error('AI response missing bullet options')
                              }

                              setGeneratedBulletOptions(options)
                              setSelectedBullets(new Set([0]))
                            }
                          } catch (fetchError: any) {
                            clearTimeout(timeoutId)
                            if (fetchError.name === 'AbortError') {
                              throw new Error('Request timed out after 45 seconds. Please try again with fewer keywords or shorter context.')
                            }
                            throw fetchError
                          }
                        } catch (error: any) {
                          console.error('Failed to generate AI bullet:', error)
                          const errorMessage = error?.message || 'Unknown error occurred'
                          if (errorMessage.includes('timeout') || errorMessage.includes('timed out') || errorMessage.includes('AbortError')) {
                            alert('Request timed out. The AI service may be slow right now. Please try again in a moment or reduce the number of keywords.')
                          } else if (errorMessage.includes('500') || errorMessage.includes('503')) {
                            alert('AI service is temporarily unavailable. Please try again in a moment.')
                          } else {
                            alert(`Failed to generate bullet: ${errorMessage}`)
                          }
                        } finally {
                          setIsGeneratingBullets(false)
                        }
                      }}
                      className={`w-full py-3 rounded-xl font-semibold text-white shadow-lg transition-all relative overflow-hidden ${isGeneratingBullets
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                        }`}
                      disabled={isGeneratingBullets}
                    >
                      {isGeneratingBullets ? (
                        <div className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Generating... (this may take 10-30 seconds)</span>
                        </div>
                      ) : (
                        aiImproveContext.mode === 'new'
                          ? 'Generate bullet ideas'
                          : 'Enhance bullet with keywords'
                      )}
                    </button>

                    {generatedBulletOptions.length > 0 && (
                      <div className="mt-6 space-y-4">
                        <p className="text-sm font-semibold text-gray-900">
                          Choose the bullet point you want to insert:
                        </p>
                        <div className="space-y-3">
                          {generatedBulletOptions.map((option, idx) => {
                            const isSelected = selectedBullets.has(idx)

                            // Find which keywords are used in this bullet
                            const usedKeywords = Array.from(selectedMissingKeywords).filter(keyword => {
                              const keywordLower = keyword.toLowerCase()
                              const optionLower = option.toLowerCase()
                              // Check for whole word match (case-insensitive)
                              const regex = new RegExp(`\\b${keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
                              return regex.test(optionLower)
                            })

                            // Highlight keywords in the bullet text
                            const highlightKeywords = (text: string, keywords: string[]): React.ReactNode[] => {
                              if (keywords.length === 0) return [text]

                              const parts: React.ReactNode[] = []
                              let lastIndex = 0
                              const textLower = text.toLowerCase()

                              // Find all keyword matches with their positions
                              const matches: Array<{ start: number; end: number; keyword: string }> = []
                              keywords.forEach(keyword => {
                                const keywordLower = keyword.toLowerCase()
                                const regex = new RegExp(`\\b${keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
                                let match
                                while ((match = regex.exec(text)) !== null) {
                                  matches.push({
                                    start: match.index,
                                    end: match.index + match[0].length,
                                    keyword: match[0]
                                  })
                                }
                              })

                              // Sort matches by start position
                              matches.sort((a, b) => a.start - b.start)

                              // Remove overlapping matches (keep first)
                              const nonOverlapping: Array<{ start: number; end: number; keyword: string }> = []
                              matches.forEach(match => {
                                const overlaps = nonOverlapping.some(existing =>
                                  match.start < existing.end && match.end > existing.start
                                )
                                if (!overlaps) {
                                  nonOverlapping.push(match)
                                }
                              })

                              // Build the highlighted text
                              nonOverlapping.forEach((match, matchIdx) => {
                                // Add text before match
                                if (match.start > lastIndex) {
                                  parts.push(text.substring(lastIndex, match.start))
                                }
                                // Add highlighted keyword
                                parts.push(
                                  <span
                                    key={`highlight-${matchIdx}`}
                                    className="bg-yellow-200 text-yellow-900 font-semibold px-1 rounded"
                                  >
                                    {text.substring(match.start, match.end)}
                                  </span>
                                )
                                lastIndex = match.end
                              })

                              // Add remaining text
                              if (lastIndex < text.length) {
                                parts.push(text.substring(lastIndex))
                              }

                              return parts.length > 0 ? parts : [text]
                            }

                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  const nextSelection = new Set<number>()
                                  nextSelection.add(idx)
                                  setSelectedBullets(nextSelection)
                                }}
                                className={`w-full text-left p-4 rounded-lg border transition-all ${isSelected
                                  ? 'border-blue-500 bg-blue-50 shadow-md'
                                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                  }`}
                              >
                                <div className="flex items-start gap-3">
                                  <span
                                    className={`mt-1 inline-flex h-4 w-4 rounded-full border-2 ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                                      }`}
                                  />
                                  <div className="flex-1">
                                    <p className="text-sm text-gray-800 leading-relaxed">
                                      {highlightKeywords(option, usedKeywords)}
                                    </p>
                                    {usedKeywords.length > 0 && (
                                      <div className="mt-2 flex flex-wrap gap-1">
                                        <span className="text-xs text-gray-500">Used keywords:</span>
                                        {usedKeywords.map((keyword, kwIdx) => (
                                          <span
                                            key={kwIdx}
                                            className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium"
                                          >
                                            {keyword}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </button>
                            )
                          })}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              if (!aiImproveContext) return
                              if (selectedBullets.size === 0) {
                                alert('Please select a bullet to insert')
                                return
                              }
                              const selectedIndex = Array.from(selectedBullets)[0]
                              const chosen = generatedBulletOptions[selectedIndex]
                              if (!chosen) {
                                alert('Selected bullet is unavailable')
                                return
                              }
                              const sanitizedChoice = chosen.replace(/^[-•*]+\s*/, '').trim()
                              const finalText = `• ${sanitizedChoice}`.trim()
                              console.log('AI Improve: Applying final text:', {
                                sectionId: aiImproveContext.sectionId,
                                bulletId: aiImproveContext.bulletId,
                                finalText: finalText.substring(0, 100),
                                originalText: aiImproveContext.currentText?.substring(0, 100)
                              })
                              updateBullet(aiImproveContext.sectionId, aiImproveContext.bulletId, finalText)
                              setShowAIImproveModal(false)
                              setAiImproveContext(null)
                              setSelectedMissingKeywords(new Set())
                              setGeneratedBulletOptions([])
                              setSelectedBullets(new Set())
                            }}
                            className="flex-1 py-3 rounded-xl font-semibold text-white shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all"
                          >
                            Use selected bullet
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setGeneratedBulletOptions([])
                              setSelectedBullets(new Set())
                            }}
                            className="flex-1 py-3 rounded-xl font-semibold text-blue-600 border border-blue-200 hover:bg-blue-50 transition-all"
                          >
                            Generate again
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Add Section Buttons */}
            <div className="mt-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-500 hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer">
                <button
                  onClick={addSection}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  + Add New Section
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* AI Work Experience */}
        {showAIWorkExperience && aiWorkExperienceContext && (
          <AIWorkExperience
            companyName={aiWorkExperienceContext.companyName}
            jobTitle={aiWorkExperienceContext.jobTitle}
            dateRange={aiWorkExperienceContext.dateRange}
            sectionId={aiWorkExperienceContext.sectionId}
            bulletId={aiWorkExperienceContext.bulletId}
            onUpdate={(workData) => {
              // Update the company header in the current resume data
              const sections = data.sections.map((s: any) =>
                s.id === aiWorkExperienceContext.sectionId
                  ? {
                    ...s,
                    bullets: s.bullets.map((b: any) =>
                      b.id === aiWorkExperienceContext.bulletId
                        ? {
                          ...b,
                          text: `**${workData.companyName} / ${workData.jobTitle} / ${workData.dateRange}**`
                        }
                        : b
                    )
                  }
                  : s
              )

              // Add new bullet points after the company header
              if (workData.bullets && workData.bullets.length > 0) {
                const newBullets = workData.bullets.map((bulletText: string, index: number) => ({
                  id: `bullet-${Date.now()}-${index}`,
                  text: `• ${bulletText}`,
                  params: {}
                }))

                const updatedSections = sections.map((s: any) => {
                  if (s.id === aiWorkExperienceContext.sectionId) {
                    const headerBulletIndex = s.bullets.findIndex((b: any) => b.id === aiWorkExperienceContext.bulletId)
                    // If header not found, append to end instead of inserting at beginning
                    if (headerBulletIndex === -1) {
                      return {
                        ...s,
                        bullets: [...s.bullets, ...newBullets]
                      }
                    }
                    const insertIndex = headerBulletIndex + 1
                    return {
                      ...s,
                      bullets: [
                        ...s.bullets.slice(0, insertIndex),
                        ...newBullets,
                        ...s.bullets.slice(insertIndex)
                      ]
                    }
                  }
                  return s
                })

                onChange({ ...data, sections: updatedSections })
              } else {
                onChange({ ...data, sections })
              }

              setShowAIWorkExperience(false)
              setAiWorkExperienceContext(null)
            }}
            onClose={() => {
              setShowAIWorkExperience(false)
              setAiWorkExperienceContext(null)
            }}
          />
        )}

        {/* AI Section Assistant */}
        {showAISectionAssistant && aiSectionAssistantContext && (
          <AISectionAssistant
            isOpen={showAISectionAssistant}
            onClose={() => {
              setShowAISectionAssistant(false)
              setAiSectionAssistantContext(null)
            }}
            onUpdate={handleSectionAssistantUpdate}
            context={aiSectionAssistantContext}
          />
        )}
      </div>
    </div>
  )
}

// Sortable Section Card Component
function SortableSectionCard({
  id,
  title,
  icon,
  isEnabled,
  fieldCount,
  children,
  isCollapsed,
  onToggleCollapse,
  onToggleVisibility,
  onRemove,
}: {
  id: string
  title: string
  icon: string
  isEnabled: boolean
  fieldCount?: number
  children: React.ReactNode
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  onToggleVisibility?: () => void
  onRemove?: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl border transition-all ${isDragging
        ? 'border-blue-400 shadow-lg z-50'
        : 'border-gray-200 shadow-sm hover:shadow-md'
        }`}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
            title="Drag to reorder"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </div>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
              title={isCollapsed ? 'Expand section' : 'Collapse section'}
            >
              <svg
                className="w-4 h-4 text-gray-600 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => {
              e.stopPropagation()
              onToggleVisibility?.()
            }}
            className="w-4 h-4 text-blue-600 rounded cursor-pointer flex-shrink-0"
            title={isEnabled ? "Hide section in preview" : "Show section in preview"}
          />
          <span className="text-lg flex-shrink-0">{icon}</span>
          <h3 className="text-base font-semibold text-gray-900 truncate">{title}</h3>
          {fieldCount !== undefined && (
            <span className="text-xs text-gray-500 flex-shrink-0">({fieldCount} {fieldCount === 1 ? 'item' : 'items'})</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                if (confirm(`Are you sure you want to delete the "${title}" section?`)) {
                  // Immediately call remove - no other operations
                  onRemove()
                }
              }}
              type="button"
              className="p-1 hover:bg-red-50 rounded-lg transition-colors group"
              title="Delete section"
            >
              <svg className="w-4 h-4 text-gray-400 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Section Content */}
      {!isCollapsed && <div className="p-3">{children}</div>}
    </div>
  )
}

// Modern Section Card Component (non-sortable fallback)
function ModernSectionCard({
  id,
  title,
  icon,
  isEnabled,
  fieldCount,
  children,
}: {
  id: string
  title: string
  icon: string
  isEnabled: boolean
  fieldCount?: number
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      {/* Section Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={() => { }}
            className="w-4 h-4 text-blue-600 rounded cursor-pointer flex-shrink-0"
          />
          <span className="text-lg flex-shrink-0">{icon}</span>
          <h3 className="text-base font-semibold text-gray-900 truncate">{title}</h3>
          {fieldCount !== undefined && (
            <span className="text-xs text-gray-500 flex-shrink-0">({fieldCount} {fieldCount === 1 ? 'item' : 'items'})</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Section Content */}
      <div className="p-3">{children}</div>
    </div>
  )
}

// Modern Contact Field Component
function ModernContactField({
  icon,
  label,
  value,
  fieldKey,
  data,
  onChange,
  onRemove,
}: {
  icon: string
  label: string
  value: string
  fieldKey: string
  data: ResumeData
  onChange: (data: ResumeData) => void
  onRemove?: () => void
}) {
  const isVisible = (data as any).fieldsVisible?.[fieldKey] !== false
  return (
    <div className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg group border border-gray-100">
      <input
        type="checkbox"
        checked={isVisible}
        onChange={(e) => {
          const fieldsVisible = { ...(data as any).fieldsVisible, [fieldKey]: e.target.checked }
          onChange({ ...data, fieldsVisible })
        }}
        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer flex-shrink-0"
      />
      <span className="text-sm flex-shrink-0">{icon}</span>
      <div
        contentEditable
        suppressContentEditableWarning
        data-editable-type="field"
        data-field={fieldKey}
        onBlur={(e) => {
          const newValue = e.currentTarget.textContent || ''
          onChange({ ...data, [fieldKey]: newValue })
        }}
        className={`flex-1 text-xs outline-none hover:bg-blue-50 focus:bg-blue-50 px-2 py-1 rounded transition-colors cursor-text ${!isVisible ? 'text-gray-400 line-through' : 'text-gray-700'
          }`}
        title={label}
      >
        {value || label}
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity flex-shrink-0"
          title="Remove field"
        >
          <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  )
}

