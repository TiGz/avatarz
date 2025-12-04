# feat: Rework Style Page with Examples and Prompt Modal

## Overview

Enhance the Choose Style page in the wizard to:
1. Display example avatars for each style from publicly available thumbnails
2. Add a modal popup to view the full generation prompt with copy-to-clipboard functionality

## Problem Statement / Motivation

Currently, users select a style based only on an emoji and label. They have no visual preview of what the style produces or understanding of the underlying prompt. This makes style selection feel like a guessing game, especially for first-time users.

## Proposed Solution

### A. Example Thumbnails for Selected Style

Show 3 larger example avatars for the **currently selected style only**, displayed in a dedicated preview section. This uses screen real estate more effectively and only fetches examples when needed.

**UI Treatment:**
- Dedicated "Examples" section below the style grid (or beside it on larger screens)
- 3 larger thumbnails (120-160px) in a horizontal row
- Show "No examples yet" message when 0 examples exist
- Examples update when user selects a different style
- Loading skeleton while fetching examples for new selection

**Data Flow:**
```
User selects style → usePublicAvatarsByStyle(selectedStyleId, 3) → Display larger thumbnails in preview section
```

### B. Prompt Modal with Clipboard

Add an info icon button to each style card that opens a modal showing the full prompt.

**UI Treatment:**
- Small info icon (Lucide `Info`) in top-right corner of each style card
- Modal displays:
  - Style name as title
  - Full prompt text in scrollable content area
  - Copy button with checkmark feedback + toast notification
  - Close button (X) and ESC key support

## Technical Approach

### Database Changes

**1. New RPC Function: `get_random_public_avatars_by_style`**

Create a new function that accepts style ID parameter:

```sql
-- supabase/migrations/XXXXXXXX_add_style_filtered_public_avatars.sql

CREATE OR REPLACE FUNCTION get_random_public_avatars_by_style(
  p_count INTEGER DEFAULT 3,
  p_style_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  avatar_id UUID,
  avatar_thumbnail_path TEXT,
  avatar_style TEXT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    id AS avatar_id,
    thumbnail_storage_path AS avatar_thumbnail_path,
    style AS avatar_style
  FROM generations
  WHERE is_public = true
    AND thumbnail_storage_path IS NOT NULL
    AND (p_style_id IS NULL OR style = p_style_id)
  ORDER BY RANDOM()
  LIMIT p_count;
END;
$$;

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_generations_public_style
ON generations(is_public, style)
WHERE is_public = true;
```

**2. Update `useStylesForCategory` Query**

Add `prompt` field to SELECT:

```typescript
// src/hooks/useStylesForCategory.ts:42
.select('id, category_id, label, emoji, sort_order, prompt')
```

Update `StyleOption` type in `src/types/index.ts`:

```typescript
export interface StyleOption {
  id: string
  category_id: string
  label: string
  emoji: string
  sort_order: number
  prompt: string  // ADD THIS
}
```

### New Components

**1. `usePublicAvatarsByStyle` Hook**

```typescript
// src/hooks/usePublicAvatarsByStyle.ts

interface StyleExample {
  id: string
  thumbnailUrl: string
}

export function usePublicAvatarsByStyle(styleId: string | null) {
  const [examples, setExamples] = useState<StyleExample[]>([])
  const [loading, setLoading] = useState(false)
  // Fetch from edge function with style_id parameter
  // Generate signed URLs for thumbnails
  // Return { examples, loading }
}
```

**2. `PromptModal` Component**

```typescript
// src/components/wizard/PromptModal.tsx

interface PromptModalProps {
  isOpen: boolean
  onClose: () => void
  styleName: string
  prompt: string
}

export function PromptModal({ isOpen, onClose, styleName, prompt }: PromptModalProps) {
  // Fixed overlay + content card (following AvatarModal pattern)
  // AnimatePresence for enter/exit animations
  // Copy button with useState for feedback
  // toast.success() on copy
}
```

**3. Update `StyleStep.tsx`**

- Add state for selected style's prompt modal: `const [promptModalStyle, setPromptModalStyle] = useState<StyleOption | null>(null)`
- Render example thumbnails under each style card
- Add info icon button to open prompt modal
- Render `<PromptModal />` controlled by state

### File Changes Summary

| File | Change |
|------|--------|
| `supabase/migrations/XXXXXXXX_add_style_filtered_public_avatars.sql` | New RPC function + index |
| `supabase/functions/public-avatars/index.ts` | Add `style_id` query param support |
| `src/types/index.ts` | Add `prompt` to `StyleOption` |
| `src/hooks/useStylesForCategory.ts` | Add `prompt` to SELECT query |
| `src/hooks/usePublicAvatarsByStyle.ts` | **NEW** - Fetch examples by style |
| `src/components/wizard/PromptModal.tsx` | **NEW** - Prompt display modal |
| `src/components/wizard/steps/StyleStep.tsx` | Add examples + info button + modal |

## Acceptance Criteria

### Functional Requirements

- [ ] Dedicated preview section shows 3 larger example thumbnails for selected style
- [ ] Examples update when user selects a different style
- [ ] "No examples yet" message when selected style has no public examples
- [ ] Info icon button visible on each style card (or in preview section)
- [ ] Clicking info icon opens modal with full prompt text
- [ ] Copy button in modal copies prompt to clipboard
- [ ] Toast notification confirms successful copy
- [ ] Modal closes on X button, ESC key, or click outside
- [ ] Loading skeleton shown while examples fetch for new selection
- [ ] Error handling if clipboard API fails (fallback message)

### Non-Functional Requirements

- [ ] Only fetch examples for currently selected style (not all styles)
- [ ] Thumbnail images use `loading="lazy"` for performance
- [ ] Modal has proper focus trap (ESC and Tab work correctly)
- [ ] Touch targets are 44x44px minimum on mobile
- [ ] Works correctly on both desktop and mobile viewports

### Quality Gates

- [ ] TypeScript compilation passes with no errors
- [ ] All existing tests continue to pass
- [ ] Manual testing on desktop Chrome, Safari, mobile Safari

## Implementation Phases

### Phase 1: Database & Backend (Required First)

1. Create migration file with new RPC function
2. Run `supabase db push` to apply migration
3. Update `public-avatars` Edge Function to accept `style_id` param
4. Deploy Edge Function with `supabase functions deploy public-avatars`
5. Test RPC function works via Supabase dashboard

**Files:**
- `supabase/migrations/XXXXXXXX_add_style_filtered_public_avatars.sql`
- `supabase/functions/public-avatars/index.ts`

### Phase 2: Data Hooks

1. Update `StyleOption` type to include `prompt`
2. Modify `useStylesForCategory` to fetch `prompt` field
3. Create new `usePublicAvatarsByStyle` hook
4. Test hooks return expected data

**Files:**
- `src/types/index.ts`
- `src/hooks/useStylesForCategory.ts`
- `src/hooks/usePublicAvatarsByStyle.ts` (new)

### Phase 3: Modal Component

1. Create `PromptModal` component following `AvatarModal` pattern
2. Implement clipboard copy with feedback
3. Add Framer Motion animations
4. Test modal opens/closes correctly

**Files:**
- `src/components/wizard/PromptModal.tsx` (new)

### Phase 4: StyleStep Integration

1. Add dedicated "Examples" preview section below style grid
2. Fetch examples only for currently selected style
3. Display 3 larger thumbnails (120-160px) with loading skeleton
4. Add info icon button to view prompt (in preview section or on style cards)
5. Wire up modal open/close state
6. Handle loading/empty/error states
7. Test complete flow

**Files:**
- `src/components/wizard/steps/StyleStep.tsx`

### Phase 5: Polish & Edge Cases

1. Add loading skeletons for examples
2. Handle clipboard API failures gracefully
3. Ensure mobile responsiveness
4. Test keyboard navigation
5. Final review and cleanup

## Alternative Approaches Considered

### Alternative 1: Show Examples in Hover Tooltip

**Rejected because:** Mobile users can't hover; would require separate mobile implementation.

### Alternative 2: Use shadcn/ui Dialog Component

**Rejected because:** Would require installing `@radix-ui/react-dialog` when we already have a working modal pattern in `AvatarModal.tsx`. Keeping consistent patterns reduces complexity.

### Alternative 3: Show Prompt Inline (Expandable Section)

**Rejected because:** Long prompts would disrupt grid layout; modal provides better reading experience for longer text.

## Dependencies & Prerequisites

- [x] Public avatars already stored with `is_public` flag
- [x] Thumbnail bucket already exists (`avatar-thumbnails`)
- [x] Sonner toast already configured in app
- [x] Framer Motion already installed
- [ ] **NEEDED:** Migration for new RPC function
- [ ] **NEEDED:** Edge Function update

## Risk Analysis & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| RPC function query too slow on large dataset | Medium | Low | Added index on (is_public, style) |
| Clipboard API fails on some browsers | Low | Low | Fallback toast message with instructions |
| Signed URLs expire during long session | Low | Low | 1-hour expiry is acceptable; refresh on page reload |
| No examples available for new styles | Medium | High | Clear "No examples yet" message; feature degrades gracefully |

## Success Metrics

- Users can preview what each style produces before selecting
- Users can read and copy prompts for inspiration or reference
- No increase in time-to-style-selection (examples don't slow users down)
- Feature works correctly on all tested browsers and devices

## References & Research

### Internal References
- [AvatarModal.tsx](src/components/gallery/AvatarModal.tsx) - Existing modal pattern to follow
- [useStylesForCategory.ts:42](src/hooks/useStylesForCategory.ts#L42) - Query to modify
- [StyleStep.tsx:67-84](src/components/wizard/steps/StyleStep.tsx#L67-L84) - Current style grid
- [public-avatars/index.ts](supabase/functions/public-avatars/index.ts) - Edge Function to modify
- [20251204094149_add_style_categories_and_styles.sql:30-40](supabase/migrations/20251204094149_add_style_categories_and_styles.sql#L30-L40) - Styles table schema

### External References
- [shadcn/ui Dialog docs](https://ui.shadcn.com/docs/components/dialog) - Reference for accessible modal patterns
- [Clipboard API on MDN](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) - Copy implementation
- [Sonner toast docs](https://sonner.emilkowal.ski/) - Toast notifications
