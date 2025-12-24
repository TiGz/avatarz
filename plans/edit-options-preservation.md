# Plan: Edit Options Preservation

**Problem**: When editing a 2K 16:9 image, the Edit page defaults to 1:1 and 1K instead of preserving the original generation's settings.

**Goal**: Automatically select the same aspect ratio and image size as the original image when entering edit mode.

---

## 1. Current State Analysis

### 1.1 Generation Flow (Working Correctly)

The edge function already stores metadata correctly:

```typescript
// supabase/functions/generate-avatar/index.ts (lines 1287-1297)
const metadata: Record<string, unknown> = {
  aspect_ratio: requestedRatio,
  image_size: geminiImageSize,
}
if (bannerConfig) {
  metadata.banner_format = requestedRatio
  metadata.original_ratio = bannerConfig.geminiRatio
  metadata.width = bannerConfig.width
  metadata.height = bannerConfig.height
}
```

### 1.2 Edit Page (The Problem)

EditPage.tsx hardcodes defaults instead of reading from generation metadata:

```typescript
// src/pages/EditPage.tsx (lines 47-49)
const aspectRatio = (searchParams.get('aspectRatio') as AspectRatio) || '1:1'  // PROBLEM
const imageSize = (searchParams.get('imageSize') as ImageSize) || '1K'         // PROBLEM
```

The generation IS fetched (line 63-71) and contains `metadata.aspect_ratio` and `metadata.image_size`, but these values are never used.

### 1.3 Type Definitions

Current types already support the metadata fields:

```typescript
// src/types/index.ts (lines 176-185)
metadata?: {
  aspect_ratio?: string
  image_size?: string
  banner_format?: string
  original_ratio?: string
  // ...
} | null
```

---

## 2. Data Flow Diagram

```
CURRENT (BROKEN):
┌─────────────────────────────────────────────────────────────┐
│  Gallery/DownloadStep                                       │
│  └── navigate('/edit/{id}')  ─── NO metadata in URL        │
│                    │                                        │
│                    ▼                                        │
│  EditPage                                                   │
│  ├── fetchGeneration() ─── gets metadata from DB           │
│  ├── aspectRatio = URL || '1:1'  ❌ IGNORES metadata       │
│  └── imageSize = URL || '1K'     ❌ IGNORES metadata       │
│                    │                                        │
│                    ▼                                        │
│  User sees WRONG defaults (always 1:1, 1K)                 │
└─────────────────────────────────────────────────────────────┘

PROPOSED (FIXED):
┌─────────────────────────────────────────────────────────────┐
│  Gallery/DownloadStep                                       │
│  └── navigate('/edit/{id}')                                │
│                    │                                        │
│                    ▼                                        │
│  EditPage                                                   │
│  ├── fetchGeneration() ─── gets metadata from DB           │
│  │                                                          │
│  ├── [NEW] useEffect syncs metadata → URL params           │
│  │   ├── if (!URL.aspectRatio) set from metadata           │
│  │   └── if (!URL.imageSize) set from metadata             │
│  │                                                          │
│  ├── aspectRatio = URL params  ✓ NOW correct               │
│  └── imageSize = URL params    ✓ NOW correct               │
│                    │                                        │
│                    ▼                                        │
│  User sees CORRECT defaults from original generation       │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Implementation Plan

### Step 1: Update Type Definition (src/types/index.ts)

Extend the AspectRatio type in EditPage to include banner formats for consistency:

```typescript
// Current EditPage type (line 25)
type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4'

// Should match WizardState (line 93 in types/index.ts)
type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | 'linkedin' | 'twitter' | 'facebook' | 'youtube'
```

### Step 2: Add Metadata Sync Effect (src/pages/EditPage.tsx)

Add a new useEffect after the fetchGeneration effect (after line 91):

```typescript
// Sync URL params from generation metadata on load (if not already set)
useEffect(() => {
  if (!generation?.metadata) return

  const currentAspectRatio = searchParams.get('aspectRatio')
  const currentImageSize = searchParams.get('imageSize')

  // Only sync if params are NOT already in URL (preserve user choices)
  const needsSync = !currentAspectRatio || !currentImageSize

  if (needsSync) {
    const params = new URLSearchParams(searchParams)

    if (!currentAspectRatio && generation.metadata.aspect_ratio) {
      params.set('aspectRatio', generation.metadata.aspect_ratio)
    }

    if (!currentImageSize && generation.metadata.image_size) {
      params.set('imageSize', generation.metadata.image_size)
    }

    setSearchParams(params, { replace: true })
  }
}, [generation]) // IMPORTANT: Only depend on generation, not searchParams (avoid loop)
```

**Critical Implementation Notes:**
- Do NOT include `searchParams` in the dependency array (causes infinite loop)
- Use `{ replace: true }` to avoid polluting browser history
- Only sync if URL params are missing (respects user overrides from deep links)

### Step 3: Add Banner Format Options to Dropdown

Update the aspect ratio dropdown to include banner formats (around line 337):

```typescript
<select ...>
  <option value="1:1">1:1 Square</option>
  <option value="16:9">16:9 Landscape</option>
  <option value="9:16">9:16 Portrait</option>
  <option value="4:3">4:3 Standard</option>
  <option value="3:4">3:4 Portrait</option>
  <optgroup label="Social Banners">
    <option value="linkedin">LinkedIn Banner</option>
    <option value="twitter">Twitter/X Banner</option>
    <option value="facebook">Facebook Cover</option>
    <option value="youtube">YouTube Banner</option>
  </optgroup>
</select>
```

### Step 4: Update Visual Preview for Banner Formats

Update the aspect ratio preview box (around line 364) to handle banner dimensions:

```typescript
const getPreviewDimensions = () => {
  const dimensions: Record<string, { width: number; height: number }> = {
    '1:1': { width: 36, height: 36 },
    '16:9': { width: 48, height: 27 },
    '9:16': { width: 27, height: 48 },
    '4:3': { width: 40, height: 30 },
    '3:4': { width: 30, height: 40 },
    'linkedin': { width: 48, height: 12 },
    'twitter': { width: 48, height: 16 },
    'facebook': { width: 48, height: 18 },
    'youtube': { width: 48, height: 27 },
  }
  return dimensions[aspectRatio] || dimensions['1:1']
}
```

---

## 4. Edge Cases & Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| Legacy generation (no metadata) | Falls back to 1:1/1K (current behavior) |
| User navigates with explicit URL params | URL params respected (no override) |
| Banner format in metadata | Banner option pre-selected in dropdown |
| Edit chain (edit → edit → edit) | Each edit preserves the current format |
| Invalid metadata values | Falls back to 1:1/1K |

---

## 5. Files to Modify

| File | Changes |
|------|---------|
| `src/pages/EditPage.tsx` | Add sync effect, extend AspectRatio type, add banner options to dropdown, update preview |
| `src/types/index.ts` | No changes needed (metadata types already correct) |
| `supabase/functions/generate-avatar/index.ts` | Already stores metadata correctly (verified) |

---

## 6. Test Scenarios

### 6.1 Basic Flow
1. Generate a 16:9 2K avatar via wizard
2. Navigate to Gallery → click Edit on that avatar
3. **Expected**: Options show 16:9 and 2K pre-selected

### 6.2 Legacy Data
1. Find a generation created before metadata was stored
2. Navigate to Edit page
3. **Expected**: Falls back to 1:1 and 1K (graceful degradation)

### 6.3 User Override
1. Navigate to `/edit/{id}?aspectRatio=4:3&imageSize=500`
2. **Expected**: Shows 4:3 and 500 (URL params take precedence)

### 6.4 Banner Formats
1. Generate a LinkedIn banner avatar
2. Navigate to Edit page
3. **Expected**: "LinkedIn Banner" pre-selected in dropdown

### 6.5 Edit Chain
1. Generate 16:9 2K avatar
2. Edit it (keep 16:9 2K)
3. Edit the result again
4. **Expected**: Each generation maintains 16:9 2K in metadata

---

## 7. Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Infinite render loop | Medium | Only depend on `[generation]` in effect |
| Race condition (fetch vs sync) | Low | Effect runs after generation state is set |
| Breaking existing deep links | None | URL params always take precedence |
| Legacy data regression | None | Explicit fallback to current defaults |

---

## 8. Implementation Order

1. **Phase 1**: Add the sync effect (fixes the core bug)
2. **Phase 2**: Extend AspectRatio type and add banner options (full parity with wizard)
3. **Phase 3**: Update visual preview for banners
4. **Phase 4**: Deploy and test all scenarios

---

## 9. Rollback Plan

If issues arise:
1. Remove the sync effect (single useEffect block)
2. Revert AspectRatio type changes
3. Behavior returns to current hardcoded defaults

No database changes required, so rollback is purely frontend.
