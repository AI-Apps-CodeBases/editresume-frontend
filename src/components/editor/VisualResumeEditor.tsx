'use client'
import React, { useState, useRef, useEffect } from 'react'
import config from '@/lib/config';
import InlineGrammarChecker from './InlineGrammarChecker'
import LeftSidebar from './LeftSidebar'
import AIWorkExperience from './AIWorkExperience'
import AISectionAssistant from './AISectionAssistant'
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
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Bullet {
  id: string
  text: string
  params?: Record<string, any>
}

interface Section {
  id: string
  title: string
  bullets: Bullet[]
  params?: Record<string, any>
}

interface ResumeData {
  name: string
  title: string
  email: string
  phone: string
  location: string
  summary: string
  sections: Section[]
  fieldsVisible?: Record<string, boolean>
  linkedin?: string
  website?: string
  github?: string
  portfolio?: string
  twitter?: string
}

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
  onViewChange
}: Props) {
  const [jdKeywords, setJdKeywords] = useState<{
    matching: string[];
    missing: string[];
    high_frequency: Array<{keyword: string, frequency: number, importance: string}>;
    priority: string[];
  } | null>(null);
  const [showAIImproveModal, setShowAIImproveModal] = useState(false);
  const [aiImproveContext, setAiImproveContext] = useState<{sectionId: string, bulletId: string, currentText: string} | null>(null);
  const [selectedMissingKeywords, setSelectedMissingKeywords] = useState<Set<string>>(new Set());
  const [generatedBulletOptions, setGeneratedBulletOptions] = useState<string[]>([]);
  const [isGeneratingBullets, setIsGeneratingBullets] = useState(false);
  const [selectedBullets, setSelectedBullets] = useState<Set<number>>(new Set());
  
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
  
  // Update localStorage when openSections changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('openSections', JSON.stringify(Array.from(openSections)));
    }
  }, [openSections]);
  
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
  const [customTitleFields, setCustomTitleFields] = useState<Array<{id: string, label: string, field: string}>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('customTitleFields');
      if (saved) return JSON.parse(saved);
    }
    return [];
  });
  
  // Custom contact fields
  const [customContactFields, setCustomContactFields] = useState<Array<{id: string, label: string, field: string}>>(() => {
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
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
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
  
  
  // Sortable contact field item component
  const SortableContactField = ({ fieldKey }: { fieldKey: string }) => {
    const field = contactFields[fieldKey as keyof typeof contactFields];
    const customField = customContactFields.find(f => f.field === fieldKey);
    
    // Use custom field if available, otherwise use predefined field
    const fieldConfig = customField 
      ? { label: customField.label, icon: '📎', field: customField.field }
      : field;
    
    if (!fieldConfig) return null;
    
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: fieldKey });
    
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };
    
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center gap-2"
      >
        <input
          type="checkbox"
          checked={(data as any).fieldsVisible?.[fieldConfig.field] !== false}
          onChange={(e) => {
            const fieldsVisible = { ...(data as any).fieldsVisible, [fieldConfig.field]: e.target.checked };
            onChange({ ...data, fieldsVisible });
          }}
          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
          title={`Toggle ${fieldConfig.field} visibility in preview`}
        />
        <div
          {...attributes}
          {...listeners}
          className="cursor-move hover:bg-blue-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
          title="Drag to reorder"
        >
          <span className="text-gray-400">⠿</span>
        </div>
        <div
          contentEditable
          suppressContentEditableWarning
          data-editable-type="field"
          data-field={fieldConfig.field}
          onBlur={(e) => {
            const value = e.currentTarget.textContent || '';
            if (fieldConfig.field === 'email') {
              onChange({ ...data, email: value });
            } else if (fieldConfig.field === 'phone') {
              onChange({ ...data, phone: value });
            } else if (fieldConfig.field === 'location') {
              onChange({ ...data, location: value });
            } else {
              onChange({ ...data, [fieldConfig.field]: value } as any);
            }
          }}
          className={`outline-none hover:bg-blue-50 focus:bg-blue-50 px-2 py-1 rounded transition-colors cursor-text ${
            (data as any).fieldsVisible?.[fieldConfig.field] === false ? 'text-gray-400 line-through' : ''
          }`}
        >
          {(data as any)[fieldConfig.field] || fieldConfig.label}
        </div>
        {customField && (
          <button
            onClick={() => removeCustomContactField(customField.id)}
            className="px-1 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
            title="Remove this field"
          >
            ✕
          </button>
        )}
      </div>
    );
  };
  
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
  const checkBulletMatches = (bulletText: string, sectionTitle?: string): { matches: boolean; matchedKeywords: string[], keywordCounts: Record<string, number> } => {
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
    
    // Filter out single letter keywords and very short keywords
    const validKeywords = [
      ...jdKeywords.matching.filter(kw => kw && kw.length > 1 && kw.trim().length > 1),
      ...jdKeywords.priority.filter(kw => kw && kw.length > 1 && kw.trim().length > 1)
    ];
    
    validKeywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase().trim();
      // Skip single letters and very short keywords
      if (keywordLower.length <= 1) return;
      
      // Use word boundary matching to avoid partial matches like "r" in "project"
      const regex = new RegExp(`\\b${keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches && matches.length > 0) {
        if (!matched.includes(keyword)) {
          matched.push(keyword);
        }
        keywordCounts[keyword] = matches.length;
      }
    });
    
    return { matches: matched.length > 0, matchedKeywords: matched, keywordCounts };
  };
  
  // Highlight keywords in text with counts
  const highlightKeywordsInText = (text: string, matchedKeywords: string[], keywordCounts: Record<string, number>): React.ReactNode => {
    if (!matchedKeywords.length || !text) return text;
    
    const parts: Array<React.ReactNode> = [];
    let processedText = text;
    let lastIndex = 0;
    
    // Sort keywords by length (longest first) to avoid partial matches
    const sortedKeywords = [...matchedKeywords].sort((a, b) => b.length - a.length);
    const matches: Array<{keyword: string, index: number, length: number, count: number}> = [];
    
    sortedKeywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      const regex = new RegExp(`\\b${keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          keyword,
          index: match.index,
          length: match[0].length,
          count: keywordCounts[keyword] || 1
        });
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
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      // Add highlighted keyword with count
      const keywordText = text.substring(match.index, match.index + match.length);
      parts.push(
        <span key={`kw-${idx}-${match.index}`} className="bg-yellow-200 underline font-semibold" title={`${match.keyword} (${match.count}x)`}>
          {keywordText}
          {match.count > 1 && <sup className="text-xs text-gray-600 ml-0.5">{match.count}</sup>}
        </span>
      );
      lastIndex = match.index + match.length;
    });
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts.length > 0 ? <>{parts}</> : text;
  };
  
  // Add page break styles
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      .resume-container {
        position: relative;
        page-break-inside: avoid;
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

  const updateSection = (sectionId: string, updates: Partial<Section>) => {
    const sections = data.sections.map(s =>
      s.id === sectionId ? { ...s, ...updates } : s
    )
    onChange({ ...data, sections })
  }

  const updateBullet = (sectionId: string, bulletId: string, text: string) => {
    const sections = data.sections.map(s =>
      s.id === sectionId
        ? {
            ...s,
            bullets: s.bullets.map(b =>
              b.id === bulletId ? { ...b, text } : b
            )
          }
        : s
    )
    onChange({ ...data, sections })
  }

  const addBullet = (sectionId: string) => {
    const sections = data.sections.map(s =>
      s.id === sectionId
        ? {
            ...s,
            bullets: [...s.bullets, { id: Date.now().toString(), text: '', params: {} }]
          }
        : s
    )
    onChange({ ...data, sections })
  }

  const insertBulletAfter = (sectionId: string, afterBulletId: string) => {
    const sections = data.sections.map(s => {
      if (s.id === sectionId) {
        const bullets = [...s.bullets]
        const index = bullets.findIndex(b => b.id === afterBulletId)
        if (index !== -1) {
          bullets.splice(index + 1, 0, { id: Date.now().toString(), text: '', params: {} })
        }
        return { ...s, bullets }
      }
      return s
    })
    onChange({ ...data, sections })
  }

  const removeBullet = (sectionId: string, bulletId: string) => {
    const sections = data.sections.map(s =>
      s.id === sectionId
        ? {
            ...s,
            bullets: s.bullets.filter(b => b.id !== bulletId)
          }
        : s
    )
    onChange({ ...data, sections })
  }

  const addSection = () => {
    const newSection: Section = {
      id: Date.now().toString(),
      title: 'New Section',
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
    
    console.log('Created sections:', newSections)
    
    // Replace all existing sections with new ones
    onChange({ ...data, sections: newSections })
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
    jobTitle: string
    dateRange: string
    bullets: string[]
  }) => {
    if (!aiWorkExperienceContext) return

    const { sectionId, bulletId } = aiWorkExperienceContext
    
    // Find the section and update the company header
    const sections = data.sections.map(section => {
      if (section.id === sectionId) {
        const updatedBullets = section.bullets.map(bullet => {
          if (bullet.id === bulletId) {
            // Update the company header with new information
            return {
              ...bullet,
              text: `**${updateData.companyName} / ${updateData.jobTitle} / ${updateData.dateRange}**`
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
          const updatedBullets = section.bullets.map(bullet => {
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
    onChange({ ...data, sections: data.sections.filter(s => s.id !== sectionId) })
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

  const handleSectionDragEnd = () => {
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
      const response = await fetch(`${config.apiBase}/api/ai/generate_summary_from_experience`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          title: data.title,
          sections: data.sections
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      console.log('Generated summary:', result)
      
      if (result.summary) {
        onChange({ ...data, summary: result.summary })
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

      const response = await fetch(`${config.apiBase}/api/ai/generate_bullet_from_keywords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })
      
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API error response:', errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      console.log('API result:', result)
      
      if (result.success && result.bullet_text) {
        console.log('Adding bullet:', result.bullet_text)
        // Add the new bullet to the section
        const sections = data.sections.map(s => {
          if (s.id === sectionId) {
            const newBullets = [...s.bullets, { id: Date.now().toString(), text: `• ${result.bullet_text}`, params: {} }]
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
    } catch (error) {
      console.error('Bullet generation failed:', error)
      alert('Bullet generation failed: ' + (error as Error).message)
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
      {/* Left Sidebar */}
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

      {/* Main Content */}
      <div className="flex-1" ref={editorRef}>
        {/* Mobile Sidebar Toggle */}
        <div className="lg:hidden fixed top-4 left-4 z-40">
          <button
            onClick={() => {/* TODO: Add mobile sidebar toggle */}}
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


      {/* Resume Template */}
      <div className="bg-white shadow-xl rounded-lg overflow-hidden resume-container mx-4 lg:mx-auto" style={{ width: '100%', maxWidth: '850px', margin: '0 auto', minHeight: '1100px' }}>
        <div className="p-6 lg:p-12">
          {/* Name Section */}
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <input
                type="checkbox"
                checked={(data as any).fieldsVisible?.name !== false}
                onChange={(e) => {
                  const fieldsVisible = { ...(data as any).fieldsVisible, name: e.target.checked }
                  onChange({ ...data, fieldsVisible })
                }}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                title="Toggle name visibility in preview"
              />
              <div
                contentEditable
                suppressContentEditableWarning
                data-editable-type="field"
                data-field="name"
                onBlur={(e) => updateField('name', e.currentTarget.textContent || '')}
                className={`text-4xl font-bold mb-2 outline-none hover:bg-blue-50 focus:bg-blue-50 px-2 py-1 rounded transition-colors cursor-text ${
                  (data as any).fieldsVisible?.name === false ? 'text-gray-400 line-through' : 'text-gray-900'
                }`}
              >
                {data.name || 'Click to edit name'}
              </div>
            </div>
          </div>

          {/* Title Section - Collapsible */}
          <div className="mb-4 border border-gray-200 rounded-lg">
            <div 
              className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setIsTitleSectionOpen(!isTitleSectionOpen)}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">📋 Title Section</span>
                <span className="text-xs text-gray-500">({1 + customTitleFields.length} field{customTitleFields.length !== 0 ? 's' : ''})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAllTitleFields(true);
                  }}
                  className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                  title="Enable all title fields"
                >
                  ✓ All
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAllTitleFields(false);
                  }}
                  className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                  title="Disable all title fields"
                >
                  ✗ All
                </button>
                <svg 
                  className={`w-5 h-5 text-gray-500 transition-transform ${isTitleSectionOpen ? 'rotate-180' : ''}`}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {isTitleSectionOpen && (
              <div className="p-4 space-y-3">
                {/* Default Title */}
                <div className="flex items-center justify-center gap-3">
                  <input
                    type="checkbox"
                    checked={(data as any).fieldsVisible?.title !== false}
                    onChange={(e) => {
                      const fieldsVisible = { ...(data as any).fieldsVisible, title: e.target.checked }
                      onChange({ ...data, fieldsVisible })
                    }}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                    title="Toggle title visibility in preview"
                  />
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    data-editable-type="field"
                    data-field="title"
                    onBlur={(e) => updateField('title', e.currentTarget.textContent || '')}
                    className={`flex-1 text-xl outline-none hover:bg-blue-50 focus:bg-blue-50 px-2 py-1 rounded transition-colors cursor-text ${
                      (data as any).fieldsVisible?.title === false ? 'text-gray-400 line-through' : 'text-gray-600'
                    }`}
                  >
                    {data.title || 'Click to edit title'}
                  </div>
                </div>
                
                {/* Custom Title Fields */}
                {customTitleFields.map((customField) => (
                  <div key={customField.id} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={(data as any).fieldsVisible?.[customField.field] !== false}
                      onChange={(e) => {
                        const fieldsVisible = { ...(data as any).fieldsVisible, [customField.field]: e.target.checked }
                        onChange({ ...data, fieldsVisible })
                      }}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
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
                      className={`flex-1 text-xl outline-none hover:bg-blue-50 focus:bg-blue-50 px-2 py-1 rounded transition-colors cursor-text ${
                        (data as any).fieldsVisible?.[customField.field] === false ? 'text-gray-400 line-through' : 'text-gray-600'
                      }`}
                    >
                      {(data as any)[customField.field] || 'Click to edit custom title'}
                    </div>
                    <button
                      onClick={() => removeCustomTitleField(customField.id)}
                      className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                      title="Remove this field"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                
                {/* Add Title Field Button */}
                <button
                  onClick={addCustomTitleField}
                  className="w-full py-2 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <span className="text-xl">+</span>
                  Add Title Field
                </button>
              </div>
            )}
          </div>

          {/* Contact Information Section - Collapsible */}
          <div className="mb-8 pb-6 border-b-2 border-gray-300">
            <div 
              className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors rounded-t-lg"
              onClick={() => setIsContactSectionOpen(!isContactSectionOpen)}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">📞 Contact Information</span>
                <span className="text-xs text-gray-500">({contactFieldOrder.length + customContactFields.length} field{contactFieldOrder.length + customContactFields.length !== 1 ? 's' : ''})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAllContactFields(true);
                  }}
                  className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                  title="Enable all contact fields"
                >
                  ✓ All
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAllContactFields(false);
                  }}
                  className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                  title="Disable all contact fields"
                >
                  ✗ All
                </button>
                <svg 
                  className={`w-5 h-5 text-gray-500 transition-transform ${isContactSectionOpen ? 'rotate-180' : ''}`}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {isContactSectionOpen && (
              <div className="p-4">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleContactFieldDragEnd}
                >
                  <SortableContext
                    items={contactFieldOrder}
                  >
                    <div className="flex justify-center gap-4 text-sm text-gray-600 flex-wrap items-center mb-4">
                      {contactFieldOrder.map((fieldKey, index) => (
                        <React.Fragment key={fieldKey}>
                          {index > 0 && <span className="text-gray-400">•</span>}
                          <SortableContactField fieldKey={fieldKey} />
                        </React.Fragment>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                
                {/* Add Contact Field Button */}
                <button
                  onClick={addCustomContactField}
                  className="w-full mt-4 py-2 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <span className="text-xl">+</span>
                  Add Contact Field
                </button>
              </div>
            )}
          </div>

          {/* Experience Layout Toggle */}

          {/* Professional Summary Section - Collapsible */}
          <div className="mb-6 border border-gray-200 rounded-lg">
            <div 
              className="flex items-center justify-between p-3 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors rounded-t-lg"
              onClick={() => setIsSummarySectionOpen(!isSummarySectionOpen)}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={(data as any).fieldsVisible?.summary !== false}
                  onChange={(e) => {
                    e.stopPropagation();
                    const fieldsVisible = { ...(data as any).fieldsVisible, summary: e.target.checked }
                    onChange({ ...data, fieldsVisible })
                  }}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                  title="Toggle summary visibility in preview"
                  onClick={(e) => e.stopPropagation()}
                />
                <h3 className={`text-sm font-bold ${
                  (data as any).fieldsVisible?.summary === false ? 'text-gray-400 line-through' : 'text-blue-900'
                }`}>📝 Professional Summary</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    generateSummaryFromExperience();
                  }}
                  disabled={isSummaryGenerating || !data.sections.length}
                  className="px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-xs font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-1"
                  title="AI will analyze your work experience and create an ATS-optimized summary"
                >
                  {isSummaryGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      🤖 Generate
                    </>
                  )}
                </button>
                <svg 
                  className={`w-5 h-5 text-gray-500 transition-transform ${isSummarySectionOpen ? 'rotate-180' : ''}`}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {isSummarySectionOpen && (
              <div className="p-4 bg-blue-50">
                <div 
                  contentEditable
                  suppressContentEditableWarning
                  data-editable-type="field"
                  data-field="summary"
                  onBlur={(e) => updateField('summary', e.currentTarget.textContent || '')}
                  className="text-sm text-gray-700 leading-relaxed bg-white border border-blue-100 min-h-[80px] px-3 py-2 rounded outline-none hover:bg-blue-50 focus:bg-blue-50 transition-colors cursor-text"
                >
                  {data.summary || 'Click to edit or generate summary from your work experience above ↑'}
                </div>
              </div>
            )}
          </div>

          {/* Page Layout Indicator - After Summary */}
          <hr className="page-layout-indicator" />

          {/* Sections */}
          <div className="space-y-4">
            {data.sections.map((section) => {
              const isSectionOpen = openSections.has(section.id);
              const bulletCount = section.bullets?.length || 0;
              
              return (
                <div
                  key={section.id}
                  className={`group relative border border-gray-200 rounded-lg transition-all ${
                    draggedSection === section.id ? 'opacity-50' : ''
                  } hover:ring-2 hover:ring-blue-300`}
                >
                  {/* Section Header - Collapsible */}
                  <div 
                    className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors rounded-t-lg"
                    onClick={() => toggleSection(section.id)}
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation();
                      handleSectionDragStart(section.id);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSectionDragOver(e, section.id);
                    }}
                    onDragEnd={(e) => {
                      e.stopPropagation();
                      handleSectionDragEnd();
                    }}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {/* Section Controls - Visible on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <button
                          className="w-6 h-6 bg-blue-500 text-white rounded flex items-center justify-center text-xs hover:bg-blue-600"
                          title="Drag to reorder"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Drag is handled by parent
                          }}
                        >
                          ⠿
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            insertSectionAfter(section.id);
                          }}
                          className="w-6 h-6 bg-green-500 text-white rounded flex items-center justify-center text-xs hover:bg-green-600"
                          title="Insert section below"
                        >
                          +
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSection(section.id);
                          }}
                          className="w-6 h-6 bg-red-500 text-white rounded flex items-center justify-center text-xs hover:bg-red-600"
                          title="Delete section"
                        >
                          ✕
                        </button>
                      </div>
                      
                      <input
                        type="checkbox"
                        checked={section.params?.visible !== false}
                        onChange={(e) => {
                          e.stopPropagation();
                          const sections = data.sections.map(s =>
                            s.id === section.id
                              ? { ...s, params: { ...s.params, visible: e.target.checked } }
                              : s
                          )
                          onChange({ ...data, sections })
                        }}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                        title="Toggle section visibility in preview"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        data-editable-type="section-title"
                        data-section-id={section.id}
                        onBlur={(e) => updateSection(section.id, { title: e.currentTarget.textContent || '' })}
                        onClick={(e) => e.stopPropagation()}
                        className={`text-lg font-bold uppercase tracking-wide outline-none hover:bg-blue-50 focus:bg-blue-50 px-2 py-1 rounded transition-colors cursor-text flex-1 ${
                          section.params?.visible === false ? 'text-gray-400 line-through' : 'text-gray-900'
                        }`}
                      >
                        {section.title}
                      </div>
                      <span className="text-xs text-gray-500">
                        ({bulletCount} item{bulletCount !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {roomId && onAddComment && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowComments(showComments === section.id ? null : section.id);
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
                        >
                          💬
                        </button>
                      )}
                      <svg 
                        className={`w-5 h-5 text-gray-500 transition-transform ${isSectionOpen ? 'rotate-180' : ''}`}
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Section Content - Collapsible */}
                  {isSectionOpen && (
                    <div className="p-4">
                      <div className="border-b-2 border-gray-300 mb-3"></div>

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
                              text: '**New Company / New Role / Date Range**',
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
                        {jdKeywords && jdKeywords.missing.length > 0 && !section.title.toLowerCase().includes('experience') && !section.title.toLowerCase().includes('work') && (
                          <div className="w-full max-w-2xl p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-xs font-semibold text-blue-800 mb-2">💡 Create bullet from missing JD keywords:</p>
                            <div className="flex flex-wrap gap-2">
                              {jdKeywords.missing.slice(0, 8).map((kw, i) => (
                                <button
                                  key={i}
                                  onClick={async () => {
                                    await generateBulletFromKeywords(section.id, kw);
                                  }}
                                  className="px-3 py-1.5 bg-blue-100 text-blue-800 text-xs font-medium rounded hover:bg-blue-200 transition-colors flex items-center gap-1"
                                >
                                  <span>✨</span> {kw}
                                </button>
                              ))}
                    </div>
                          </div>
                        )}
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
                        {jdKeywords && jdKeywords.missing.length > 0 && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-xs font-semibold text-yellow-800 mb-1">💡 Missing Keywords from JD:</p>
                            <div className="flex flex-wrap gap-1">
                              {jdKeywords.missing.slice(0, 5).map((kw, i) => (
                                <button
                                  key={i}
                                  onClick={() => {
                                    const newSkill = {
                                      id: `skill-${Date.now()}-${i}`,
                                      text: kw,
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
                                  className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded hover:bg-yellow-200 transition-colors"
                                >
                                  + {kw}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Work Experience - Company-based layout */}
                    {section.title.toLowerCase().includes('experience') || section.title.toLowerCase().includes('work') ? (
                      section.bullets.map((bullet, idx) => {
                        const isItemHeader = bullet.text?.startsWith('**') && bullet.text?.includes('**', 2)

                        if (!isItemHeader) return null
                        
                        // Extract company/project info from header
                        const headerText = bullet.text.replace(/\*\*/g, '').trim()
                        const parts = headerText.split(' / ')
                        const companyName = parts[0]?.trim() || 'Unknown Company'
                        const jobTitle = parts[1]?.trim() || 'Unknown Role'
                        const dateRange = parts[2]?.trim() || 'Unknown Date'
                      
                        // Find all bullets for this company (until next company or end)
                        const companyBullets: Bullet[] = []
                        for (let i = idx + 1; i < section.bullets.length; i++) {
                          const nextBullet = section.bullets[i]
                          if (nextBullet.text?.startsWith('**') && nextBullet.text?.includes('**', 2)) {
                            break // Next company found
                          }
                          // Only include bullets that start with • and are not empty
                          if (nextBullet.text?.trim() && nextBullet.text?.startsWith('•') && !nextBullet.text?.startsWith('**')) {
                            companyBullets.push(nextBullet)
                          }
                        }
                        
                        return (
                          <div 
                            key={`company-${idx}`}
                            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                          >
                            {/* Company Header with Controls */}
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3 flex-1">
                                <input
                                  type="checkbox"
                                  checked={bullet.params?.visible !== false}
                                  onChange={(e) => {
                                    const sections = data.sections.map(s =>
                                      s.id === section.id
                                        ? {
                                            ...s,
                                            bullets: s.bullets.map(b =>
                                              b.id === bullet.id
                                                ? { ...b, params: { ...b.params, visible: e.target.checked } }
                                                : b
                                            )
                                          }
                                        : s
                                    )
                                    onChange({ ...data, sections })
                                  }}
                                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer flex-shrink-0"
                                  title="Toggle this work experience entry visibility in preview"
                                />
                                <div className="w-3 h-3 bg-black rounded-full flex-shrink-0"></div>
                                <div className="flex-1">
                                  <div 
                                    contentEditable
                                    suppressContentEditableWarning
                                    data-editable-type="company-name"
                                    data-section-id={section.id}
                                    data-bullet-id={bullet.id}
                                    onBlur={(e) => {
                                      const newText = `**${e.currentTarget.textContent || 'Company Name'} / ${jobTitle} / ${dateRange}**`
                                      updateBullet(section.id, bullet.id, newText)
                                    }}
                                    className={`text-lg font-bold outline-none hover:bg-blue-50 focus:bg-blue-50 px-2 py-1 rounded transition-colors cursor-text ${
                                      bullet.params?.visible === false ? 'text-gray-400 line-through' : 'text-gray-900'
                                    }`}
                                  >
                                    {companyName}
                                  </div>
                                  <div 
                                    contentEditable
                                    suppressContentEditableWarning
                                    data-editable-type="job-title"
                                    data-section-id={section.id}
                                    data-bullet-id={bullet.id}
                                    onBlur={(e) => {
                                      const newText = `**${companyName} / ${e.currentTarget.textContent || 'Job Title'} / ${dateRange}**`
                                      updateBullet(section.id, bullet.id, newText)
                                    }}
                                    className={`text-sm outline-none hover:bg-blue-50 focus:bg-blue-50 px-2 py-1 rounded transition-colors cursor-text ${
                                      bullet.params?.visible === false ? 'text-gray-400 line-through' : 'text-gray-600'
                                    }`}
                                  >
                                    {jobTitle}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <div 
                                  contentEditable
                                  suppressContentEditableWarning
                                  data-editable-type="date-range"
                                  data-section-id={section.id}
                                  data-bullet-id={bullet.id}
                                  onBlur={(e) => {
                                    const newText = `**${companyName} / ${jobTitle} / ${e.currentTarget.textContent || 'Date Range'}**`
                                    updateBullet(section.id, bullet.id, newText)
                                  }}
                                  className="text-sm text-gray-500 outline-none hover:bg-blue-50 focus:bg-blue-50 px-2 py-1 rounded transition-colors cursor-text"
                                >
                                  {dateRange}
                                </div>
                                
                                {/* AI Assistant Button */}
                                <button
                                  onClick={() => {
                                    setAiWorkExperienceContext({
                                      companyName,
                                      jobTitle,
                                      dateRange,
                                      sectionId: section.id,
                                      bulletId: bullet.id
                                    })
                                    setShowAIWorkExperience(true)
                                  }}
                                  className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-semibold rounded-lg hover:from-orange-600 hover:to-red-600 transition-all shadow-md hover:shadow-lg flex items-center gap-1"
                                  title="🤖 AI Assistant - Generate work experience content"
                                >
                                  <span>🤖</span> AI Assistant
                                </button>
                                
                                {/* Delete Company Button */}
                                <button
                                  onClick={() => {
                                    // Remove this company panel and its bullet points
                                    const companyBulletIds: string[] = []
                                    
                                    // Find all bullets that belong to this company (until next company or end)
                                    for (let i = idx + 1; i < section.bullets.length; i++) {
                                      const bullet = section.bullets[i]
                                      if (bullet.text?.startsWith('**') && bullet.text?.includes('**', 2)) {
                                        break // Next company found
                                      }
                                      if (bullet.text?.trim() && bullet.text?.startsWith('•')) {
                                        companyBulletIds.push(bullet.id)
                                      }
                                    }
                                    
                                    // Remove the company header and all its bullets
                                    const currentBulletId = bullet.id
                                    const updatedBullets = section.bullets.filter(b => 
                                      b.id !== currentBulletId && !companyBulletIds.includes(b.id)
                                    )
                                    
                                    const sections = data.sections.map(s =>
                                      s.id === section.id
                                        ? { ...s, bullets: updatedBullets }
                                        : s
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

                            {/* Bullet Points Container */}
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                              <div className="space-y-3">
                                {companyBullets.map((companyBullet, bulletIdx) => {
                                  const bulletMatch = checkBulletMatches(companyBullet.text, section.title);
                                  const hasMatch = bulletMatch.matches;
                                  const hasNoMatch = jdKeywords && !hasMatch && companyBullet.text.trim().length > 0;
                                  
                                  // Check if disabled bullet has missing keywords
                                  const isDisabled = companyBullet.params?.visible === false;
                                  const disabledHasMissing = isDisabled && jdKeywords && jdKeywords.missing.length > 0 && 
                                    jdKeywords.missing.some(kw => {
                                      const regex = new RegExp(`\\b${kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                                      return regex.test(companyBullet.text.toLowerCase());
                                    });
                                  
                                  return (
                                    <div 
                                      key={companyBullet.id} 
                                      className={`group flex items-start gap-3 p-2 rounded ${
                                        hasMatch 
                                          ? 'bg-green-50 border border-green-200' 
                                          : hasNoMatch
                                          ? 'bg-orange-50 border border-orange-200'
                                          : disabledHasMissing
                                          ? 'bg-purple-50 border border-purple-300'
                                          : ''
                                      }`}
                                    >
                                    <input
                                      type="checkbox"
                                      checked={companyBullet.params?.visible !== false}
                                      onChange={(e) => {
                                        const sections = data.sections.map(s =>
                                          s.id === section.id
                                            ? {
                                                ...s,
                                                bullets: s.bullets.map(b =>
                                                  b.id === companyBullet.id
                                                    ? { ...b, params: { ...b.params, visible: e.target.checked } }
                                                    : b
                                                )
                                              }
                                            : s
                                        )
                                        onChange({ ...data, sections })
                                      }}
                                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer mt-2 flex-shrink-0"
                                        title={hasMatch ? `Matches JD keywords: ${bulletMatch.matchedKeywords.join(', ')}` : "Toggle bullet visibility in preview"}
                                      />
                                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                        hasMatch ? 'bg-green-500' : hasNoMatch ? 'bg-orange-400' : 'bg-black'
                                      }`}></div>
                                      <div className="flex-1">
                                        {disabledHasMissing && (
                                          <div className="mb-1">
                                            <span className="px-2 py-0.5 bg-purple-200 text-purple-800 text-xs rounded-full font-semibold">
                                              💡 Enable to increase ATS score
                                            </span>
                                          </div>
                                        )}
                                        {hasNoMatch && !disabledHasMissing && (
                                          <div className="mb-1">
                                            <span className="px-2 py-0.5 bg-orange-200 text-orange-800 text-xs rounded-full font-semibold">
                                              ⚠ No JD keywords
                                            </span>
                                          </div>
                                        )}
                                    <div className="relative flex-1">
                                      {hasMatch && bulletMatch.matchedKeywords.length > 0 && (
                                        <div 
                                          className={`text-sm px-2 py-1 rounded pointer-events-none ${
                                            companyBullet.params?.visible === false ? 'text-gray-400 line-through' : 'text-gray-800'
                                          }`}
                                        >
                                          {highlightKeywordsInText(companyBullet.text.replace(/^•\s*/, ''), bulletMatch.matchedKeywords, bulletMatch.keywordCounts)}
                                        </div>
                                      )}
                                    <div
                                      contentEditable
                                      suppressContentEditableWarning
                                      data-editable-type="bullet"
                                      data-section-id={section.id}
                                      data-bullet-id={companyBullet.id}
                                        onBlur={(e) => {
                                          updateBullet(section.id, companyBullet.id, e.currentTarget.textContent || '');
                                          // Trigger ATS recalculation
                                          if (typeof window !== 'undefined') {
                                            window.dispatchEvent(new CustomEvent('resumeDataUpdated', { 
                                              detail: { resumeData: { ...data, sections: data.sections.map(s =>
                                                s.id === section.id ? { ...s, bullets: s.bullets.map(b =>
                                                  b.id === companyBullet.id ? { ...b, text: e.currentTarget.textContent || '' } : b
                                                )} : s
                                              )}}
                                            }));
                                          }
                                        }}
                                        className={`text-sm outline-none hover:bg-white focus:bg-white px-2 py-1 rounded transition-colors cursor-text ${
                                          hasMatch && bulletMatch.matchedKeywords.length > 0 ? 'absolute inset-0 opacity-0' : ''
                                        } ${
                                            companyBullet.params?.visible === false ? 'text-gray-400 line-through' : hasMatch ? 'text-gray-800 font-medium' : 'text-gray-700'
                                        }`}
                                        style={hasMatch && bulletMatch.matchedKeywords.length > 0 ? { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0 } : {}}
                                    >
                                      {companyBullet.text.replace(/^•\s*/, '')}
                                      </div>
                                    </div>
                                    </div>
                                    
                                    {/* Action Buttons on the Right */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {/* AI Improve Button */}
                                      <button
                                        onClick={() => {
                                          if (jdKeywords && jdKeywords.missing.length > 0) {
                                            setAiImproveContext({
                                              sectionId: section.id,
                                              bulletId: companyBullet.id,
                                              currentText: companyBullet.text
                                            });
                                            setShowAIImproveModal(true);
                                          } else if (onAIImprove) {
                                            // Fallback to old behavior if no JD keywords
                                            (async () => {
                                            try {
                                              setIsAILoading(true)
                                              const improvedText = await onAIImprove(companyBullet.text)
                                              updateBullet(section.id, companyBullet.id, improvedText)
                                            } catch (error) {
                                              console.error('AI improvement failed:', error)
                                            } finally {
                                              setIsAILoading(false)
                                            }
                                            })();
                                          }
                                        }}
                                        disabled={isAILoading}
                                        className="px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-semibold rounded hover:from-blue-600 hover:to-purple-600 transition-all shadow-sm hover:shadow-md flex items-center gap-1 disabled:opacity-50"
                                        title="✨ AI Improve - Enhance with missing JD keywords"
                                      >
                                        <span>{isAILoading ? '⏳' : '✨'}</span>
                                      </button>
                                      
                                      {/* Remove Bullet Button */}
                                      <button
                                        onClick={() => removeBullet(section.id, companyBullet.id)}
                                        className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-800 rounded-lg font-semibold flex items-center justify-center text-xs transition-colors shadow-sm hover:shadow-md"
                                        title="Remove bullet point"
                                      >
                                        <span>×</span>
                                      </button>
                                    </div>
                                  </div>
                                  );
                                })}
                                
                                {/* Add Bullet Button */}
                                <div className="flex justify-center pt-2">
                                  <button
                                    onClick={() => {
                                      // Add new bullet after the last company bullet
                                      const companyBulletIds = companyBullets.map(b => b.id)
                                      const lastCompanyBulletIndex = section.bullets.findIndex(b => b.id === companyBulletIds[companyBulletIds.length - 1])
                                      
                                      const newBullet = { id: Date.now().toString(), text: '• ', params: {} }
                                      
                                      const sections = data.sections.map(s =>
                                        s.id === section.id
                                          ? {
                                              ...s,
                                              bullets: [
                                                ...s.bullets.slice(0, lastCompanyBulletIndex + 1),
                                                newBullet,
                                                ...s.bullets.slice(lastCompanyBulletIndex + 1)
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
                          </div>
                        )
                      })
                    ) : getSectionType(section.title) === 'skill' ? (
                      /* Skills Section - Checkbox Chips Layout */
                      <div className="flex flex-wrap gap-2">
                        {section.bullets
                          .filter(bullet => !bullet.text?.startsWith('**'))
                          .map((bullet) => {
                            const skillName = bullet.text.replace(/^•\s*/, '').trim()
                            if (!skillName) return null
                            
                            return (
                              <label
                                key={bullet.id}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-all border-2 ${
                                  bullet.params?.visible !== false
                                    ? 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200'
                                    : 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={bullet.params?.visible !== false}
                                  onChange={(e) => {
                                    const sections = data.sections.map(s =>
                                      s.id === section.id
                                        ? {
                                            ...s,
                                            bullets: s.bullets.map(b =>
                                              b.id === bullet.id
                                                ? { ...b, params: { ...b.params, visible: e.target.checked } }
                                                : b
                                            )
                                          }
                                        : s
                                    )
                                    onChange({ ...data, sections })
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
                      section.bullets.map((bullet, idx) => {
                        // Show bullets that start with • or don't start with ** (simple bullet points)
                        if (bullet.text?.startsWith('**')) return null
                        
                        // Exclude certifications from keyword matching
                        const isCertificationSection = section.title.toLowerCase().includes('certif') || 
                                                       section.title.toLowerCase().includes('license') ||
                                                       section.title.toLowerCase().includes('credential');
                        
                        const bulletMatch = isCertificationSection 
                          ? { matches: false, matchedKeywords: [], keywordCounts: {} }
                          : checkBulletMatches(bullet.text, section.title);
                        const hasMatch = bulletMatch.matches;
                        const hasNoMatch = !isCertificationSection && jdKeywords && !hasMatch && bullet.text.trim().length > 0;
                        
                        // Check if disabled bullet has missing keywords
                        const isDisabled = bullet.params?.visible === false;
                        const disabledHasMissing = isDisabled && jdKeywords && jdKeywords.missing.length > 0 && 
                          jdKeywords.missing.some(kw => {
                            const regex = new RegExp(`\\b${kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                            return regex.test(bullet.text.toLowerCase());
                          });
                        
                        return (
                          <div 
                            key={bullet.id}
                            className={`group rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${
                              hasMatch 
                                ? 'bg-green-50 border-2 border-green-300' 
                                : hasNoMatch
                                ? 'bg-orange-50 border-2 border-orange-200'
                                : disabledHasMissing
                                ? 'bg-purple-50 border-2 border-purple-300'
                                : 'bg-white border border-gray-200'
                            }`}
                          >
                            {/* Simple Bullet Point */}
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={bullet.params?.visible !== false}
                                onChange={(e) => {
                                  const sections = data.sections.map(s =>
                                    s.id === section.id
                                      ? {
                                          ...s,
                                          bullets: s.bullets.map(b =>
                                            b.id === bullet.id
                                              ? { ...b, params: { ...b.params, visible: e.target.checked } }
                                              : b
                                          )
                                        }
                                      : s
                                  )
                                  onChange({ ...data, sections })
                                }}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer mt-2 flex-shrink-0"
                                title={hasMatch ? `Matches JD keywords: ${bulletMatch.matchedKeywords.join(', ')}` : "Toggle bullet visibility in preview"}
                              />
                              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                hasMatch ? 'bg-green-500' : hasNoMatch ? 'bg-orange-400' : 'bg-black'
                              }`}></div>
                              <div className="flex-1">
                                {disabledHasMissing && (
                                  <div className="mb-1">
                                    <span className="px-2 py-0.5 bg-purple-200 text-purple-800 text-xs rounded-full font-semibold">
                                      💡 Enable to increase ATS score
                                    </span>
                                  </div>
                                )}
                                {hasNoMatch && !disabledHasMissing && (
                                  <div className="mb-1">
                                    <span className="px-2 py-0.5 bg-orange-200 text-orange-800 text-xs rounded-full font-semibold">
                                      ⚠ No JD keywords
                                    </span>
                                  </div>
                                )}
                                <div className="relative">
                                  {hasMatch && bulletMatch.matchedKeywords.length > 0 && (
                                    <div 
                                      className={`text-sm px-2 py-1 rounded pointer-events-none ${
                                        bullet.params?.visible === false ? 'text-gray-400 line-through' : 'text-gray-800'
                                      }`}
                                    >
                                      {highlightKeywordsInText(bullet.text.replace(/^•\s*/, ''), bulletMatch.matchedKeywords, bulletMatch.keywordCounts)}
                                    </div>
                                  )}
                                <div 
                                  contentEditable
                                  suppressContentEditableWarning
                                  data-editable-type="bullet"
                                  data-section-id={section.id}
                                  data-bullet-id={bullet.id}
                                    onBlur={(e) => {
                                      updateBullet(section.id, bullet.id, e.currentTarget.textContent || '');
                                      // Trigger ATS recalculation
                                      if (typeof window !== 'undefined') {
                                        window.dispatchEvent(new CustomEvent('resumeDataUpdated', { 
                                          detail: { resumeData: { ...data, sections: data.sections.map(s =>
                                            s.id === section.id ? { ...s, bullets: s.bullets.map(b =>
                                              b.id === bullet.id ? { ...b, text: e.currentTarget.textContent || '' } : b
                                            )} : s
                                          )}}
                                        }));
                                      }
                                    }}
                                  className={`text-sm outline-none hover:bg-blue-50 focus:bg-blue-50 px-2 py-1 rounded transition-colors cursor-text ${
                                      hasMatch && bulletMatch.matchedKeywords.length > 0 ? 'absolute inset-0 opacity-0' : ''
                                    } ${
                                      bullet.params?.visible === false ? 'text-gray-400 line-through' : hasMatch ? 'text-gray-800 font-medium' : 'text-gray-700'
                                  }`}
                                    style={hasMatch && bulletMatch.matchedKeywords.length > 0 ? { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0 } : {}}
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
                                      setAiImproveContext({
                                        sectionId: section.id,
                                        bulletId: bullet.id,
                                        currentText: bullet.text
                                      });
                                      setShowAIImproveModal(true);
                                    } else if (onAIImprove) {
                                      // Fallback to old behavior if no JD keywords
                                      (async () => {
                                      try {
                                        setIsAILoading(true)
                                        const improvedText = await onAIImprove(bullet.text)
                                        updateBullet(section.id, bullet.id, improvedText)
                                      } catch (error) {
                                        console.error('AI improvement failed:', error)
                                      } finally {
                                        setIsAILoading(false)
                                      }
                                      })();
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
                          </div>
                        )
                      })
                    )}
                  </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

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
                      setSelectedBullets(new Set());
                    }}
                    className="text-white hover:text-gray-200 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                  {generatedBulletOptions.length === 0 ? (
                    <>
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
                            const isSelected = selectedMissingKeywords.has(keyword);
                            return (
                              <button
                                key={idx}
                                onClick={() => {
                                  const newSelected = new Set(selectedMissingKeywords);
                                  if (isSelected) {
                                    newSelected.delete(keyword);
                                  } else if (newSelected.size < 8) {
                                    newSelected.add(keyword);
                                  } else {
                                    alert('Please select maximum 8 keywords');
                                  }
                                  setSelectedMissingKeywords(newSelected);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                  isSelected
                                    ? 'bg-blue-600 text-white border-2 border-blue-700'
                                    : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                                }`}
                              >
                                {isSelected && '✓ '}{keyword}
                              </button>
                            );
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
                          if (selectedMissingKeywords.size < 2) {
                            alert('Please select at least 2 keywords (minimum 2, maximum 8)');
                            return;
                          }
                          if (selectedMissingKeywords.size > 8) {
                            alert('Please select maximum 8 keywords');
                            return;
                          }
                          
                          setIsGeneratingBullets(true);
                          try {
                            const keywordsArray = Array.from(selectedMissingKeywords);
                            const response = await fetch(`${config.apiBase}/api/ai/generate_bullets_from_keywords`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                keywords: keywordsArray,
                                job_description: typeof window !== 'undefined' ? localStorage.getItem('currentJDText') || '' : '',
                                company_title: '',
                                job_title: '',
                                section_title: data.sections.find(s => s.id === aiImproveContext.sectionId)?.title || 'Work Experience',
                                context: {
                                  resume_data: {
                                    name: data.name,
                                    title: data.title,
                                    summary: data.summary
                                  }
                                }
                              }),
                            });
                            
                            if (response.ok) {
                              const result = await response.json();
                              if (result.bullets && result.bullets.length > 0) {
                                setGeneratedBulletOptions(result.bullets.slice(0, 3));
                              } else {
                                alert('Failed to generate bullet points');
                              }
                            } else {
                              throw new Error('Failed to generate bullets');
                            }
                          } catch (error) {
                            console.error('Failed to generate bullets:', error);
                            alert('Failed to generate bullet points. Please try again.');
                          } finally {
                            setIsGeneratingBullets(false);
                          }
                        }}
                        disabled={selectedMissingKeywords.size < 2 || selectedMissingKeywords.size > 8 || isGeneratingBullets}
                        className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all shadow-lg"
                      >
                        {isGeneratingBullets ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generating...
                          </span>
                        ) : (
                          `Generate 3 Bullet Options (${selectedMissingKeywords.size} keyword${selectedMissingKeywords.size > 1 ? 's' : ''} selected)`
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-gray-900 mb-3">Select bullet points to add to your work experience (you can select multiple):</p>
                        <div className="space-y-3">
                          {generatedBulletOptions.map((option: string, idx: number) => {
                            // Highlight selected keywords in the bullet text
                            let highlightedText = option.startsWith('•') ? option : `• ${option}`;
                            const selectedKeywordsArray = Array.from(selectedMissingKeywords);
                            selectedKeywordsArray.forEach(keyword => {
                              if (keyword.length > 1) {
                                const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
                                highlightedText = highlightedText.replace(regex, (match) => {
                                  return `<mark class="bg-yellow-300 font-semibold px-1 rounded">${match}</mark>`;
                                });
                              }
                            });
                            
                            const isSelected = selectedBullets.has(idx);
                            
                            return (
                              <div
                                key={idx}
                                className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                                  isSelected 
                                    ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-400' 
                                    : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 hover:border-blue-400'
                                }`}
                                onClick={() => {
                                  const newSelected = new Set(selectedBullets);
                                  if (isSelected) {
                                    newSelected.delete(idx);
                                  } else {
                                    newSelected.add(idx);
                                  }
                                  setSelectedBullets(newSelected);
                                }}
                              >
                                <div className="flex items-start gap-3">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      const newSelected = new Set(selectedBullets);
                                      if (e.target.checked) {
                                        newSelected.add(idx);
                                      } else {
                                        newSelected.delete(idx);
                                      }
                                      setSelectedBullets(newSelected);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer mt-1"
                                  />
                                  <div className="flex-1">
                                    <p className="text-gray-800" dangerouslySetInnerHTML={{ __html: highlightedText }} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={async () => {
                              const selectedIndices = Array.from(selectedBullets);
                              if (selectedIndices.length === 0) {
                                alert('Please select at least one bullet point to add');
                                return;
                              }
                              
                              // Show loading notification
                              const loadingNotification = document.createElement('div');
                              loadingNotification.className = 'fixed top-4 right-4 bg-blue-600 text-white px-6 py-4 rounded-lg shadow-2xl z-[10001] max-w-md';
                              loadingNotification.innerHTML = `
                                <div class="flex items-center gap-3">
                                  <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  <div>
                                    <div class="font-bold text-lg">Adding Bullet Points...</div>
                                    <div class="text-sm mt-1">Please wait</div>
                                  </div>
                                </div>
                              `;
                              document.body.appendChild(loadingNotification);
                              
                              try {
                                // Find the work experience section
                                const section = data.sections.find(s => s.id === aiImproveContext.sectionId);
                                
                                if (!section) {
                                  throw new Error('Could not find section');
                                }
                                
                                // Add selected bullets to the section
                                const newBullets = selectedIndices.map((idx: number, i: number) => {
                                  const option = generatedBulletOptions[idx];
                                  return {
                                    id: `bullet-${Date.now()}-${i}`,
                                    text: option.startsWith('•') ? option : `• ${option}`,
                                    params: {}
                                  };
                                });
                                
                                // Find the position to insert
                                // If it's a work experience bullet, try to find the company header
                                const currentBulletIndex = section.bullets.findIndex(b => b.id === aiImproveContext.bulletId);
                                
                                let updatedBullets: any[];
                                
                                if (currentBulletIndex >= 0) {
                                  // Check if the current bullet is a company header (starts with **)
                                  const currentBullet = section.bullets[currentBulletIndex];
                                  if (currentBullet.text?.startsWith('**')) {
                                    // Insert after the company header
                                    updatedBullets = [
                                      ...section.bullets.slice(0, currentBulletIndex + 1),
                                      ...newBullets,
                                      ...section.bullets.slice(currentBulletIndex + 1)
                                    ];
                                  } else {
                                    // Find the nearest company header before this bullet
                                    let companyHeaderIndex = -1;
                                    for (let i = currentBulletIndex; i >= 0; i--) {
                                      if (section.bullets[i].text?.startsWith('**')) {
                                        companyHeaderIndex = i;
                                        break;
                                      }
                                    }
                                    
                                    if (companyHeaderIndex >= 0) {
                                      // Find the last bullet point under this company header
                                      let lastBulletIndex = companyHeaderIndex;
                                      for (let i = companyHeaderIndex + 1; i < section.bullets.length; i++) {
                                        if (section.bullets[i].text?.startsWith('**')) {
                                          break; // Next company header found
                                        }
                                        if (section.bullets[i].text?.trim() && !section.bullets[i].text?.startsWith('**')) {
                                          lastBulletIndex = i;
                                        }
                                      }
                                      // Insert after the last bullet of this company
                                      updatedBullets = [
                                        ...section.bullets.slice(0, lastBulletIndex + 1),
                                        ...newBullets,
                                        ...section.bullets.slice(lastBulletIndex + 1)
                                      ];
                                    } else {
                                      // No company header found, append to the end
                                      updatedBullets = [...section.bullets, ...newBullets];
                                    }
                                  }
                                } else {
                                  // Bullet not found, append to the end
                                  updatedBullets = [...section.bullets, ...newBullets];
                                }
                                
                                const updatedSections = data.sections.map(s =>
                                  s.id === section.id ? { ...s, bullets: updatedBullets } : s
                                );
                                
                                // Update the resume data
                                const updatedResumeData = { ...data, sections: updatedSections };
                                onChange(updatedResumeData);
                                
                                // Trigger ATS score recalculation by dispatching a custom event
                                if (typeof window !== 'undefined') {
                                  window.dispatchEvent(new CustomEvent('resumeDataUpdated', { 
                                    detail: { resumeData: updatedResumeData }
                                  }));
                                }
                                
                                // Remove loading notification
                                loadingNotification.remove();
                                
                                // Show success notification with ATS score update message
                                const successNotification = document.createElement('div');
                                successNotification.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-4 rounded-lg shadow-2xl z-[10001] max-w-md';
                                successNotification.innerHTML = `
                                  <div class="flex items-center gap-3">
                                    <div class="text-2xl">✅</div>
                                    <div>
                                      <div class="font-bold text-lg">Bullet Points Added!</div>
                                      <div class="text-sm mt-1">${selectedIndices.length} bullet point${selectedIndices.length > 1 ? 's' : ''} added to your work experience</div>
                                      <div class="text-xs mt-1 text-green-100">📊 ATS score is updating...</div>
                                    </div>
                                    <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200 text-xl">×</button>
                                  </div>
                                `;
                                document.body.appendChild(successNotification);
                                setTimeout(() => successNotification.remove(), 5000);
                                
                              } catch (error) {
                                console.error('Failed to add bullet points:', error);
                                loadingNotification.remove();
                                
                                // Show error notification
                                const errorNotification = document.createElement('div');
                                errorNotification.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-4 rounded-lg shadow-2xl z-[10001] max-w-md';
                                errorNotification.innerHTML = `
                                  <div class="flex items-center gap-3">
                                    <div class="text-2xl">❌</div>
                                    <div>
                                      <div class="font-bold text-lg">Failed to Add</div>
                                      <div class="text-sm mt-1">${error instanceof Error ? error.message : 'Unknown error occurred'}</div>
                                    </div>
                                    <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200 text-xl">×</button>
                                  </div>
                                `;
                                document.body.appendChild(errorNotification);
                                setTimeout(() => errorNotification.remove(), 5000);
                                return;
                              }
                              
                              // Close modal and reset state
                              setShowAIImproveModal(false);
                              setAiImproveContext(null);
                              setSelectedMissingKeywords(new Set());
                              setGeneratedBulletOptions([]);
                              setSelectedBullets(new Set());
                            }}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={selectedBullets.size === 0}
                          >
                            Add Selected ({selectedBullets.size})
                          </button>
                          <button
                            onClick={() => {
                              setGeneratedBulletOptions([]);
                              setSelectedMissingKeywords(new Set());
                              setSelectedBullets(new Set());
                            }}
                            className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-semibold transition-colors"
                          >
                            Back
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Add Section Buttons */}
          <div className="mt-6 space-y-3">
          <button
            onClick={addSection}
              className="w-full py-3 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 hover:border-blue-500 font-semibold transition-all flex items-center justify-center gap-2"
          >
            <span className="text-xl">+</span>
            Add New Section
          </button>
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

              const updatedSections = sections.map((s: any) =>
                s.id === aiWorkExperienceContext.sectionId
                  ? {
                      ...s,
                      bullets: [
                        ...s.bullets.slice(0, s.bullets.findIndex((b: any) => b.id === aiWorkExperienceContext.bulletId) + 1),
                        ...newBullets,
                        ...s.bullets.slice(s.bullets.findIndex((b: any) => b.id === aiWorkExperienceContext.bulletId) + 1)
                      ]
                    }
                  : s
              )

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

