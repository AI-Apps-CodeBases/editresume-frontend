import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'

import { CONTACT_FIELDS } from '@/features/resume/constants'
import type { CustomField, ResumeData } from '@/features/resume/types'

interface SortableContactFieldProps {
  fieldKey: string
  data: ResumeData
  onChange: (data: ResumeData) => void
  customContactFields: CustomField[]
  removeCustomContactField: (fieldId: string) => void
}

export const SortableContactFieldItem = ({
  fieldKey,
  data,
  onChange,
  customContactFields,
  removeCustomContactField
}: SortableContactFieldProps) => {
  const baseField = CONTACT_FIELDS[fieldKey] ?? {
    label: fieldKey,
    icon: '📎',
    field: fieldKey
  }

  const customField = customContactFields.find((field) => field.field === fieldKey)
  const fieldConfig = customField ? { label: customField.label, icon: '📎', field: customField.field } : baseField

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: fieldKey })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  const fieldsVisible = { ...(data as any).fieldsVisible }

  const handleVisibilityChange = (checked: boolean) => {
    const updatedFields = { ...fieldsVisible, [fieldConfig.field]: checked }
    onChange({ ...data, fieldsVisible: updatedFields })
  }

  const handleContentBlur = (value: string) => {
    if (fieldConfig.field === 'email') {
      onChange({ ...data, email: value })
    } else if (fieldConfig.field === 'phone') {
      onChange({ ...data, phone: value })
    } else if (fieldConfig.field === 'location') {
      onChange({ ...data, location: value })
    } else {
      onChange({ ...data, [fieldConfig.field]: value } as any)
    }
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={(data as any).fieldsVisible?.[fieldConfig.field] !== false}
        onChange={(e) => handleVisibilityChange(e.target.checked)}
        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
        title={`Toggle ${fieldConfig.field} visibility in preview`}
      />
      <div
        {...attributes}
        {...listeners}
        className="cursor-move hover:bg-blue-50 px-2 py-1 rounded transition-colors flex items-center gap-1 drag-handle"
        title="Drag to reorder"
      >
        <span className="text-gray-400">⠿</span>
      </div>
      <div
        contentEditable
        suppressContentEditableWarning
        data-editable-type="field"
        data-field={fieldConfig.field}
        onBlur={(e) => handleContentBlur(e.currentTarget.textContent || '')}
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
  )
}


