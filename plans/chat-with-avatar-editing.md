# feat: Edit Existing Avatars with AI

**Date:** 2025-12-08
**Status:** Draft
**Complexity:** Low-Medium (~150 LOC)

## Summary

Allow users to edit any avatar (with saved thought signatures) by typing a text prompt. Gallery avatars open in a view/edit screen where users can refine with prompts like "make background blue" or "add sunglasses".

## Problem Statement

Users can't modify generated avatars without starting over. Gemini's thought signatures enable multi-turn editing, but we don't use them.

## User Flow

```
┌─────────────────┐         ┌─────────────────┐
│  Gallery Page   │         │  DownloadStep   │
│  (AvatarModal)  │         │ (after generate)│
└────────┬────────┘         └────────┬────────┘
         │                           │
         │  "Edit with AI"           │  "Edit with AI"
         │  button                   │  button
         │                           │
         └───────────┬───────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │   Edit Page           │
         │   /edit/:id           │
         ├───────────────────────┤
         │  • Shows current image│
         │  • Text input for     │
         │    edit prompt        │
         │  • "Generate" button  │
         │  • Loading state      │
         │  • Result: new avatar │
         │    (can continue      │
         │     editing)          │
         │  • "View original"    │
         │    link if edited     │
         └───────────────────────┘
```

**Entry Points:**
1. **From Gallery**: AvatarModal → "Edit with AI" → `/edit/:id`
2. **From DownloadStep**: After generation → "Edit with AI" → `/edit/:id`

## Implementation

### Phase 1: Database (7 lines SQL)

```sql
-- Migration: add_avatar_editing.sql
ALTER TABLE public.generations
ADD COLUMN thought_signatures JSONB,
ADD COLUMN parent_generation_id UUID REFERENCES public.generations(id) ON DELETE SET NULL,
ADD COLUMN full_prompt TEXT,
ADD COLUMN system_prompt TEXT;
```

**That's it.** No edit_depth, no recursive functions, no extra indexes.

- `thought_signatures` - Gemini's encrypted context for multi-turn editing
- `parent_generation_id` - Links edits to their parent generation
- `full_prompt` - The complete prompt sent to Gemini (for debugging/regeneration)
- `system_prompt` - The system instructions used (face preservation, etc.)

### Phase 2: Backend (~40 lines added to generate-avatar)

Extend `generate-avatar` to accept optional edit parameters:

```typescript
// In generate-avatar POST handler, add to request interface:
interface GenerateRequest {
  // ... existing fields ...

  // Edit mode (optional)
  editGenerationId?: string   // Parent generation to edit
  editPrompt?: string         // User's edit instruction
}

// In handler, before Gemini call:
let conversationHistory = null
if (editGenerationId && editPrompt) {
  const parent = await fetchGenerationWithSignatures(editGenerationId)
  if (!parent.thought_signatures) {
    return new Response(JSON.stringify({
      error: 'This avatar cannot be edited (no signatures)'
    }), { status: 400 })
  }
  conversationHistory = buildEditHistory(parent, editPrompt)
}

// Pass to Gemini (conversation history includes thought signatures)
const geminiResponse = await callGemini(conversationHistory || standardPrompt)

// Extract and store new thought signatures from response
const thoughtSignatures = extractThoughtSignatures(geminiResponse)

// On insert, store everything for debugging/editing
await supabase.from('generations').insert({
  // ... existing fields ...
  thought_signatures: thoughtSignatures,
  parent_generation_id: editGenerationId || null,
  full_prompt: finalPrompt,        // The complete prompt sent to Gemini
  system_prompt: systemPrompt,     // Face preservation instructions, etc.
})
```

### Phase 3: Frontend (~120 lines)

#### 3a. New Edit Page: `/edit/:id`

Dedicated page for editing an avatar:

```typescript
// src/pages/EditPage.tsx
export function EditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [generation, setGeneration] = useState<Generation | null>(null)
  const [editPrompt, setEditPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { quota } = useQuota()

  // Fetch generation on mount
  useEffect(() => {
    fetchGeneration(id).then(setGeneration)
  }, [id])

  const handleEdit = async () => {
    if (!editPrompt.trim()) return

    setIsGenerating(true)
    setError(null)

    try {
      const result = await generateAvatar({
        editGenerationId: generation.id,
        editPrompt,
      })
      // Update to show new generation, can continue editing
      setGeneration(result)
      setEditPrompt('')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  if (!generation) return <Loading />

  // Can't edit if no thought signatures (legacy generation)
  if (!generation.thought_signatures) {
    return (
      <div>
        <p>This avatar cannot be edited (created before edit support).</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    )
  }

  return (
    <div className="edit-page">
      {/* Current image */}
      <div className="image-preview">
        <img src={generation.url} alt="Avatar to edit" />
      </div>

      {/* Edit input */}
      <div className="edit-controls">
        <Textarea
          value={editPrompt}
          onChange={e => setEditPrompt(e.target.value)}
          placeholder="Describe how to change this avatar..."
          disabled={isGenerating}
        />

        <Button
          onClick={handleEdit}
          disabled={isGenerating || !editPrompt.trim()}
        >
          {isGenerating ? 'Generating...' : 'Generate Edit'}
        </Button>

        {error && <p className="error">{error}</p>}

        {/* Quota display */}
        <QuotaDisplay quota={quota} />
      </div>

      {/* Link to parent if this is an edit */}
      {generation.parent_generation_id && (
        <Link to={`/edit/${generation.parent_generation_id}`}>
          View original
        </Link>
      )}

      {/* Actions */}
      <div className="actions">
        <Button variant="outline" onClick={() => navigate('/gallery')}>
          Back to Gallery
        </Button>
        <DownloadButton generation={generation} />
      </div>
    </div>
  )
}
```

#### 3b. Add "Edit with AI" Button to AvatarModal

```typescript
// In AvatarModal.tsx, add to actions:
{generation.thought_signatures && (
  <Button onClick={() => navigate(`/edit/${generation.id}`)}>
    <Wand2 className="mr-2 h-4 w-4" />
    Edit with AI
  </Button>
)}
```

#### 3c. Add "Edit with AI" Button to DownloadStep

```typescript
// In DownloadStep.tsx, add to actions:
{state.generationId && (
  <Button onClick={() => navigate(`/edit/${state.generationId}`)}>
    <Wand2 className="mr-2 h-4 w-4" />
    Edit with AI
  </Button>
)}
```

## Files to Modify

| File | Change |
|------|--------|
| `supabase/migrations/YYYYMMDD_add_avatar_editing.sql` | New: 4 columns |
| `supabase/functions/generate-avatar/index.ts` | Extend: ~50 lines for edit mode + storing prompts |
| `src/pages/EditPage.tsx` | **New**: ~100 lines dedicated edit page |
| `src/App.tsx` | Add route: `/edit/:id` |
| `src/components/gallery/AvatarModal.tsx` | Add "Edit with AI" button |
| `src/components/wizard/steps/DownloadStep.tsx` | Add "Edit with AI" button |
| `src/types/index.ts` | Add `thought_signatures`, `parent_generation_id`, `full_prompt`, `system_prompt` to Generation |

## What We're NOT Building

Per reviewer feedback, these are explicitly out of scope:

- **Zustand store** - React component state is sufficient
- **ChatPanel component** - Just a textarea + button inline
- **Separate edit-avatar function** - Extend existing function
- **edit_depth column** - Not needed for MVP
- **get_edit_chain() function** - YAGNI
- **Timeline/carousel UI** - "View original" link is enough
- **Gallery filtering for edits** - Edits appear as normal generations
- **Edit badges** - Not needed

## Acceptance Criteria

- [ ] New generations store `thought_signatures` from Gemini response
- [ ] New generations store `full_prompt` and `system_prompt` for debugging
- [ ] AvatarModal has "Edit with AI" button → navigates to `/edit/:id`
- [ ] DownloadStep has "Edit with AI" button → navigates to `/edit/:id`
- [ ] EditPage shows current image and edit prompt input
- [ ] User can type edit prompt and generate new avatar
- [ ] New avatar is linked to parent via `parent_generation_id`
- [ ] "View original" link appears on edited avatars
- [ ] Legacy avatars (no signatures) show disabled/hidden edit button
- [ ] Each edit counts toward daily quota

## Edge Cases

| Case | Handling |
|------|----------|
| Legacy avatar (no signatures) | Hide "Edit with AI" button |
| Quota exhausted | Show quota warning, disable generate |
| Content policy violation | Show error, don't consume quota (existing behavior) |
| API timeout | Show error, allow retry |
| Edit from edit | Works - creates chain A→B→C |

## Thought Signatures Format

From Gemini API response:
```json
{
  "candidates": [{
    "content": {
      "parts": [
        { "text": "...", "thoughtSignature": "<sig_A>" },
        { "inlineData": { "mimeType": "image/png", "data": "..." }, "thoughtSignature": "<sig_B>" }
      ]
    }
  }]
}
```

Store as JSONB:
```json
{
  "parts": [
    { "type": "text", "signature": "<sig_A>" },
    { "type": "image", "signature": "<sig_B>" }
  ]
}
```

When editing, reconstruct conversation with signatures for Gemini to maintain context.

## Success Metrics

- Users try editing within first week
- Average 2+ edits per session when used
- No increase in support requests about "lost" avatars

---

**Total estimated code: ~170 lines**
- Migration: 7 lines
- Backend: 50 lines (includes storing prompts)
- EditPage: 100 lines
- Button additions: ~10 lines (AvatarModal + DownloadStep)
- Types: 5 lines

*Simplified based on DHH, Kieran, and Simplicity reviewer feedback.*
