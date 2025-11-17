# Resume Templates

This directory contains the resume template system with full customization support.

## Structure

```
templates/
├── classic/          # Traditional single-column layout
├── modern/          # Clean, contemporary design
├── two-column/      # Efficient two-column layout
├── creative/        # Eye-catching bold design
├── ats-friendly/    # ATS-optimized layout
├── BaseTemplate.tsx # Shared layout logic
├── registry.ts      # Template registry
└── types.ts         # Type definitions and Zod schemas
```

## Usage

### Basic Template Rendering

```typescript
import { templateRegistry } from '@/features/resume/templates'

function ResumePreview({ resumeData, templateId, config, replacements }) {
  const template = templateRegistry.find(t => t.id === templateId)
  const TemplateComponent = template?.Component

  if (!TemplateComponent) {
    return <div>Template not found</div>
  }

  return (
    <TemplateComponent
      data={resumeData}
      config={config}
      replacements={replacements}
    />
  )
}
```

### Using Customization Hooks

```typescript
import { useTemplateCustomization } from '@/features/resume/hooks/useTemplateCustomization'
import { useTemplateSwitch } from '@/features/resume/hooks/useTemplateSwitch'

function ResumeEditor({ resumeData, templateId }) {
  const { config, updateConfig, resetConfig } = useTemplateCustomization(templateId)
  const { switchTemplate } = useTemplateSwitch(templateId, config, resumeData, (id, cfg) => {
    // Handle template change
  })

  return (
    <div>
      {/* Template selection and customization UI */}
    </div>
  )
}
```

### Using UI Components

```typescript
import { TemplateCustomizer } from '@/features/resume/components'

function DesignPanel({ templateId, config, onTemplateChange, onConfigUpdate }) {
  return (
    <TemplateCustomizer
      currentTemplateId={templateId}
      config={config}
      onTemplateChange={onTemplateChange}
      onConfigUpdate={onConfigUpdate}
      onResetConfig={() => {/* reset logic */}}
    />
  )
}
```

## Customization Options

Each template supports:

- **Layout**: Column layouts, section ordering, spacing presets
- **Typography**: Font families, sizes, line height, letter spacing
- **Design**: Color schemes, bullet styles, dividers, header styles
- **Spacing**: Section gaps, item gaps, page margins

## Adding a New Template

1. Create a new directory under `templates/`
2. Add `Template.tsx` (≤300 LOC)
3. Add `config.ts` with default configuration
4. Register in `registry.ts`
5. Export from `index.ts`

