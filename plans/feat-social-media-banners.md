# feat: Add Social Media Banner Aspect Ratios to Custom Flow

## Overview

Add social media banner dimensions as options in the existing aspect ratio selector on the Custom flow. When a banner ratio is selected, auto-set resolution to 2K and apply safe-zone cropping after generation.

## Problem Statement

Users wanting social media banners must go through the wallpaper flow. The Custom flow already has aspect ratio and resolution controls - just missing the banner presets.

## Proposed Solution

Extend the aspect ratio dropdown with banner options:

```
Current options:        New options:
─────────────────       ─────────────────────────────
○ 1:1 (Square)          ○ 1:1 (Square)
○ 16:9 (Landscape)      ○ 16:9 (Landscape)
○ 9:16 (Portrait)       ○ 9:16 (Portrait)
○ 4:3                   ○ 4:3
○ 3:4                   ○ 3:4
                        ─────────────────────────────
                        Social Banners
                        ○ LinkedIn (1584×396)
                        ○ X / Twitter (1500×500)
                        ○ Facebook (851×315)
                        ○ YouTube (2560×1440)
```

**No new UI components needed.** Just extend the existing selector.

## Technical Approach

### Phase 1: Shared Banner Config

**New file:** `src/lib/bannerFormats.ts`

```typescript
export type BannerFormat = 'linkedin' | 'twitter' | 'facebook' | 'youtube'

export const BANNER_FORMATS: Record<BannerFormat, {
  label: string
  width: number
  height: number
  geminiRatio: '4:3' | '3:4' | '16:9' | '1:1'
  safeZone: number
}> = {
  linkedin: { label: 'LinkedIn', width: 1584, height: 396, geminiRatio: '4:3', safeZone: 20 },
  twitter: { label: 'X / Twitter', width: 1500, height: 500, geminiRatio: '3:4', safeZone: 45 },
  facebook: { label: 'Facebook', width: 851, height: 315, geminiRatio: '4:3', safeZone: 50 },
  youtube: { label: 'YouTube', width: 2560, height: 1440, geminiRatio: '16:9', safeZone: 100 },
}

export function isBannerFormat(ratio: string): ratio is BannerFormat {
  return ratio in BANNER_FORMATS
}
```

**Update:** `src/pages/WallpaperPage.tsx` to import from shared module.

### Phase 2: Database

**Migration:** Add flexible metadata column

```sql
ALTER TABLE public.generations
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
```

### Phase 3: Extend Aspect Ratio Type

**File:** [src/types/index.ts](src/types/index.ts)

```typescript
// Extend existing type
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | 'linkedin' | 'twitter' | 'facebook' | 'youtube'
```

### Phase 4: Update Generate Step UI

**File:** [src/components/wizard/steps/GenerateStep.tsx](src/components/wizard/steps/GenerateStep.tsx)

Update the aspect ratio selector to include banner options with a divider:

```tsx
const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1 (Square)' },
  { value: '16:9', label: '16:9 (Landscape)' },
  { value: '9:16', label: '9:16 (Portrait)' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
]

const BANNER_RATIOS = [
  { value: 'linkedin', label: 'LinkedIn (1584×396)' },
  { value: 'twitter', label: 'X / Twitter (1500×500)' },
  { value: 'facebook', label: 'Facebook (851×315)' },
  { value: 'youtube', label: 'YouTube (2560×1440)' },
]

// In the selector:
<Select value={aspectRatio} onValueChange={handleAspectRatioChange}>
  <SelectContent>
    {ASPECT_RATIOS.map(r => (
      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
    ))}
    <SelectSeparator />
    <SelectLabel>Social Banners</SelectLabel>
    {BANNER_RATIOS.map(r => (
      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

**Auto-set 2K when banner selected:**
```typescript
function handleAspectRatioChange(value: AspectRatio) {
  setAspectRatio(value)
  if (isBannerFormat(value)) {
    setImageSize('2K')  // Force 2K for banners
  }
}
```

**Optionally disable resolution selector when banner selected** (or just let it default to 2K).

### Phase 5: Edge Function Updates

**File:** [supabase/functions/generate-avatar/index.ts](supabase/functions/generate-avatar/index.ts)

When `aspectRatio` is a banner format:

1. Look up config from `BANNER_FORMATS`
2. Generate at `geminiRatio` (e.g., `4:3` for LinkedIn) at 2K
3. Crop to exact banner dimensions using ImageScript
4. Store metadata: `{ banner_format: 'linkedin', original_ratio: '4:3' }`
5. Save with suffix: `_linkedin.png`

```typescript
import { BANNER_FORMATS, isBannerFormat } from '../_shared/bannerFormats.ts'

// In generation logic:
if (isBannerFormat(aspectRatio)) {
  const bannerConfig = BANNER_FORMATS[aspectRatio]
  // Generate at geminiRatio, then crop to width×height
  actualAspectRatio = bannerConfig.geminiRatio
  cropAfterGeneration = { width: bannerConfig.width, height: bannerConfig.height, safeZone: bannerConfig.safeZone }
}
```

### Phase 6: Gallery Badge

**File:** [src/components/gallery/AvatarCard.tsx](src/components/gallery/AvatarCard.tsx)

```tsx
{generation.metadata?.banner_format && (
  <Badge className="absolute top-2 left-2">
    {BANNER_FORMATS[generation.metadata.banner_format]?.label}
  </Badge>
)}
```

## Acceptance Criteria

- [ ] Aspect ratio dropdown shows banner options under "Social Banners" divider
- [ ] Selecting banner format auto-sets resolution to 2K
- [ ] Generation uses Gemini-compatible ratio, then crops to exact dimensions
- [ ] Multi-photo works with banner formats (existing functionality)
- [ ] Banner badge shows in gallery
- [ ] WallpaperPage uses shared banner config

## Files to Modify

1. `src/lib/bannerFormats.ts` (new) - Shared config
2. `src/pages/WallpaperPage.tsx` - Import from shared
3. `supabase/migrations/XXX_add_generations_metadata.sql` (new)
4. `src/types/index.ts` - Extend AspectRatio type
5. `src/components/wizard/steps/GenerateStep.tsx` - Add banner options to dropdown
6. `supabase/functions/generate-avatar/index.ts` - Banner cropping logic
7. `src/components/gallery/AvatarCard.tsx` - Badge display

## Estimated Effort

~4-6 hours (mostly edge function cropping logic)

---

**Generated**: 2025-12-08
**Status**: Simplified - extend existing dropdown
