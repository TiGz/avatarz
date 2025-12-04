# feat: Add Generation Options and Prompt Preview to Wizard

## Overview

Add new options to the Generate step of the avatar wizard (standard mode only, not custom category) including background handling, age modification, optional customisation text, and a full prompt preview modal with copy-to-clipboard.

## Problem Statement

Users currently have limited control over avatar generation beyond selecting a style. They cannot:
- Control whether the original photo background is preserved or replaced
- Request age modifications (younger/older appearance)
- Add small customisations on top of the selected style without using full custom mode
- Preview the exact prompt being sent to Gemini before generation

## Proposed Solution

### New Options (Standard Mode Only)

| Option | Type | Default | Values |
|--------|------|---------|--------|
| Background | Segmented control | Remove/replace | Remove/replace, Keep background |
| Age | Segmented control | Normal | Normal, Younger, Older |
| Customisation | Toggle + Input | Disabled | Text input (150 char max) |

### Full Prompt Preview Modal

Reuse existing `PromptModal` pattern from StyleStep:
- Trigger button below options, above Generate button
- Shows complete constructed prompt
- Copy to clipboard with toast feedback
- Client-side prompt construction (style prompts already available via category load)

## Technical Approach

### 1. State Management

**File**: [src/types/index.ts](src/types/index.ts)

Extend `WizardState` interface:

```typescript
export interface WizardState {
  // ... existing fields
  keepBackground: boolean          // false = remove/replace (default)
  ageModification: 'normal' | 'younger' | 'older'
  customTextEnabled: boolean       // false by default
  customText: string               // max 150 chars
}
```

**File**: [src/hooks/useWizard.ts](src/hooks/useWizard.ts)

Update `createInitialState()`:

```typescript
const createInitialState = (): WizardState => ({
  // ... existing fields
  keepBackground: false,
  ageModification: 'normal',
  customTextEnabled: false,
  customText: '',
})
```

### 2. Prompt Construction

**File**: [supabase/functions/generate-avatar/index.ts](supabase/functions/generate-avatar/index.ts)

#### Prompt Templates

| Option | Prompt Text |
|--------|-------------|
| Background: Remove (default) | `"Replace the background with something neutral or style-appropriate that complements the overall aesthetic."` |
| Background: Keep | `"Keep the original background scene but transform it to match the art style."` |
| Age: Normal | *(no additional text)* |
| Age: Younger | `"Make the person appear younger with youthful features."` |
| Age: Older | `"Make the person appear older with mature features."` |
| Custom text | User input appended directly |

#### Construction Order

```
${stylePrompt} ${agePrompt} ${backgroundPrompt} ${customText} ${cropPrompt} ${namePrompt} Keep the original face recognizable and maintain their identity. High quality output.
```

#### Request Interface Update

```typescript
interface GenerateAvatarRequest {
  // ... existing fields
  keepBackground?: boolean           // optional, default: false
  ageModification?: 'normal' | 'younger' | 'older'  // optional, default: 'normal'
  customisationText?: string         // optional, max 150 chars
}
```

### 3. UI Components

**File**: [src/components/wizard/steps/GenerateStep.tsx](src/components/wizard/steps/GenerateStep.tsx)

#### Layout (Standard Mode Only)

```
┌─────────────────────────────────────────┐
│ Photo Preview + Summary Card            │
├─────────────────────────────────────────┤
│ Background:  [Remove/replace] [Keep]    │  ← ToggleGroup
│ Age:         [Normal] [Younger] [Older] │  ← ToggleGroup
│ ☐ Add customisation                     │  ← Checkbox
│   ┌─────────────────────────────────┐   │
│   │ e.g., wearing red sunglasses    │   │  ← Input (if enabled)
│   └─────────────────────────────────┘   │
│                                   45/150│
├─────────────────────────────────────────┤
│ [Preview Full Prompt]                   │  ← Outline button
│ [✨ Generate Avatar]                    │  ← Primary button
│ ☐ Make this avatar public               │
└─────────────────────────────────────────┘
```

#### Required shadcn Components

```bash
npx shadcn@latest add toggle-group checkbox
```

#### Component Implementation

```tsx
// Options section (only show if !isCustomCategory)
{!isCustomCategory && (
  <div className="space-y-4">
    {/* Background */}
    <div className="space-y-2">
      <label className="text-sm font-medium text-white/80">Background</label>
      <ToggleGroup
        type="single"
        value={state.keepBackground ? 'keep' : 'remove'}
        onValueChange={(v) => updateState({ keepBackground: v === 'keep' })}
        className="justify-start"
      >
        <ToggleGroupItem value="remove">Remove/replace</ToggleGroupItem>
        <ToggleGroupItem value="keep">Keep original</ToggleGroupItem>
      </ToggleGroup>
    </div>

    {/* Age */}
    <div className="space-y-2">
      <label className="text-sm font-medium text-white/80">Age</label>
      <ToggleGroup
        type="single"
        value={state.ageModification}
        onValueChange={(v) => updateState({ ageModification: v as 'normal' | 'younger' | 'older' })}
        className="justify-start"
      >
        <ToggleGroupItem value="normal">Normal</ToggleGroupItem>
        <ToggleGroupItem value="younger">Younger</ToggleGroupItem>
        <ToggleGroupItem value="older">Older</ToggleGroupItem>
      </ToggleGroup>
    </div>

    {/* Customisation */}
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Checkbox
          id="customise"
          checked={state.customTextEnabled}
          onCheckedChange={(checked) => updateState({ customTextEnabled: !!checked })}
        />
        <label htmlFor="customise" className="text-sm font-medium text-white/80">
          Add customisation
        </label>
      </div>
      {state.customTextEnabled && (
        <div>
          <Input
            placeholder="e.g., wearing red sunglasses and a leather jacket"
            value={state.customText}
            onChange={(e) => updateState({ customText: e.target.value })}
            maxLength={150}
            className="bg-white/5"
          />
          <p className="text-xs text-white/50 text-right mt-1">
            {state.customText.length}/150
          </p>
        </div>
      )}
    </div>
  </div>
)}
```

### 4. Prompt Preview Modal

**File**: Create [src/components/wizard/GeneratePromptPreview.tsx](src/components/wizard/GeneratePromptPreview.tsx)

```tsx
interface GeneratePromptPreviewProps {
  isOpen: boolean
  onClose: () => void
  state: WizardState
  stylePrompt: string  // From useStylesForCategory
}
```

**Client-side prompt construction** (mirrors edge function logic):

```tsx
function buildPrompt(state: WizardState, stylePrompt: string): string {
  const parts: string[] = []

  // Style
  parts.push(stylePrompt)

  // Age modification
  if (state.ageModification === 'younger') {
    parts.push('Make the person appear younger with youthful features.')
  } else if (state.ageModification === 'older') {
    parts.push('Make the person appear older with mature features.')
  }

  // Background
  if (state.keepBackground) {
    parts.push('Preserve the original photo background.')
  }

  // Custom text
  if (state.customTextEnabled && state.customText.trim()) {
    parts.push(state.customText.trim())
  }

  // Crop (from existing CROP_TYPES logic)
  // ... add crop prompt

  // Name (from existing PLACEMENT_MAP logic)
  // ... add name prompt

  // System suffix
  parts.push('Keep the original face recognizable and maintain their identity. High quality output.')

  return parts.join(' ')
}
```

### 5. Edge Function Updates

**File**: [supabase/functions/generate-avatar/index.ts](supabase/functions/generate-avatar/index.ts)

#### Add Constants

```typescript
const AGE_PROMPTS: Record<string, string> = {
  normal: '',
  younger: 'Make the person appear younger with youthful features.',
  older: 'Make the person appear older with mature features.',
}

const BACKGROUND_PROMPTS = {
  remove: 'Replace the background with something neutral or style-appropriate that complements the overall aesthetic.',
  keep: 'Keep the original background scene but transform it to match the art style.',
}
```

#### Update Request Interface (line ~125)

```typescript
interface GenerateAvatarRequest {
  // ... existing
  keepBackground?: boolean
  ageModification?: 'normal' | 'younger' | 'older'
  customisationText?: string
}
```

#### Update Validation (line ~178)

```typescript
// Validate new optional fields
if (keepBackground !== undefined && typeof keepBackground !== 'boolean') {
  return { valid: false, error: 'keepBackground must be a boolean' }
}

if (ageModification && !['normal', 'younger', 'older'].includes(ageModification)) {
  return { valid: false, error: 'Invalid age modification' }
}

if (customisationText) {
  if (customisationText.length > 150) {
    return { valid: false, error: 'Customisation text too long (max 150 characters)' }
  }
  // Reuse existing regex
  const validPattern = /^[a-zA-Z0-9\s\-.,!?'"():;]+$/
  if (!validPattern.test(customisationText)) {
    return { valid: false, error: 'Customisation text contains invalid characters' }
  }
}
```

#### Update Prompt Construction (line ~487)

```typescript
// Build prompt parts
const parts: string[] = []

parts.push(stylePrompt)

// Age modification
const agePrompt = AGE_PROMPTS[ageModification || 'normal']
if (agePrompt) parts.push(agePrompt)

// Background (always add - remove gets explicit replacement instruction)
const bgPrompt = keepBackground ? BACKGROUND_PROMPTS.keep : BACKGROUND_PROMPTS.remove
parts.push(bgPrompt)

// Custom text
if (customisationText?.trim()) {
  parts.push(customisationText.trim())
}

parts.push(cropPrompt)
if (namePrompt) parts.push(namePrompt)
parts.push('Keep the original face recognizable and maintain their identity. High quality output.')

const prompt = parts.join(' ')
```

### 6. Fetching Style Prompts for Preview

**File**: [src/hooks/useStylesForCategory.ts](src/hooks/useStylesForCategory.ts)

The hook already fetches style data including prompts. Ensure the `prompt` field is available in the returned styles:

```typescript
// Current query includes prompt
const { data, error } = await supabase
  .from('styles')
  .select('id, label, emoji, prompt, sort_order')  // prompt is already here
  .eq('category_id', categoryId)
  .eq('is_active', true)
  .order('sort_order')
```

Pass selected style prompt to GenerateStep for preview construction.

## Acceptance Criteria

### Functional Requirements

- [ ] Background toggle appears in standard mode only (not custom category)
- [ ] Background defaults to "Remove/replace"
- [ ] Age toggle appears with 3 options: Normal, Younger, Older
- [ ] Age defaults to "Normal"
- [ ] Customisation checkbox is unchecked by default
- [ ] Checking customisation reveals text input
- [ ] Text input has 150 character limit with visible counter
- [ ] "Preview Full Prompt" button opens modal
- [ ] Modal shows complete prompt with all options applied
- [ ] Modal has copy-to-clipboard with toast confirmation
- [ ] Generate button sends new options to edge function
- [ ] Edge function constructs prompt with new modifiers
- [ ] Options are NOT visible in custom category mode

### Non-Functional Requirements

- [ ] Options take minimal vertical space (single line each)
- [ ] Works on mobile (min 375px width)
- [ ] Keyboard navigable (tab through options)
- [ ] ARIA labels for accessibility

## Files to Change

| File | Changes |
|------|---------|
| [src/types/index.ts](src/types/index.ts) | Add 4 new fields to WizardState |
| [src/hooks/useWizard.ts](src/hooks/useWizard.ts) | Add defaults in createInitialState |
| [src/components/wizard/steps/GenerateStep.tsx](src/components/wizard/steps/GenerateStep.tsx) | Add options UI, preview button, modal state |
| [src/components/wizard/GeneratePromptPreview.tsx](src/components/wizard/GeneratePromptPreview.tsx) | **NEW** - Prompt preview modal |
| [supabase/functions/generate-avatar/index.ts](supabase/functions/generate-avatar/index.ts) | Request interface, validation, prompt construction |

## Implementation Phases

### Phase 1: State & Types
1. Extend WizardState with new fields
2. Update createInitialState with defaults
3. Install shadcn toggle-group and checkbox components

### Phase 2: Backend
4. Add constants for age/background prompts
5. Update request interface and validation
6. Modify prompt construction logic
7. Deploy edge function

### Phase 3: Frontend UI
8. Add options section to GenerateStep (standard mode only)
9. Implement ToggleGroup controls
10. Add customisation checkbox + input
11. Update API call to include new fields

### Phase 4: Prompt Preview
12. Create GeneratePromptPreview component
13. Implement client-side prompt construction
14. Wire up preview button and modal state
15. Add copy functionality with toast

### Phase 5: Polish
16. Mobile responsive testing
17. Keyboard navigation
18. ARIA labels

## Test Plan

- [ ] Verify options hidden in custom category mode
- [ ] Test each background option generates correct prompt
- [ ] Test each age option generates correct prompt
- [ ] Test customisation text appears in prompt
- [ ] Test character limit enforcement
- [ ] Test prompt preview shows accurate prompt
- [ ] Test copy to clipboard works
- [ ] Test on mobile viewport (375px)
- [ ] Test keyboard navigation through options

## References

### Internal

- Existing wizard steps: [src/components/wizard/steps/](src/components/wizard/steps/)
- PromptModal pattern: [src/components/wizard/PromptModal.tsx](src/components/wizard/PromptModal.tsx)
- Style prompts: [src/hooks/useStylesForCategory.ts](src/hooks/useStylesForCategory.ts)
- Edge function prompt construction: [supabase/functions/generate-avatar/index.ts:455-488](supabase/functions/generate-avatar/index.ts#L455-L488)
- WizardState definition: [src/types/index.ts:37-49](src/types/index.ts#L37-L49)

### External

- shadcn/ui Toggle Group: https://ui.shadcn.com/docs/components/toggle-group
- shadcn/ui Checkbox: https://ui.shadcn.com/docs/components/checkbox
- Tailwind CSS v4: https://tailwindcss.com/docs

---

*Generated: 2025-12-04*
