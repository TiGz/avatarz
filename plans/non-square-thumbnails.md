# Non-Square Thumbnail Support

## Problem

Generated images can have various aspect ratios (1:1, 16:9, 9:16, 4:3, 3:4, plus banner formats), but thumbnails are always generated as 300x300 JPEG squares. This causes distortion when displayed with the correct CSS aspect ratio.

## Current State

- **Thumbnail generation**: Fixed 300x300 JPEG in `supabase/functions/generate-avatar/index.ts:466-482`
- **Display**: Gallery uses `getAspectRatioCss()` with `object-contain`, showing letterboxed/distorted square thumbnails

## Solution

Use actual image dimensions from the decoded Gemini response to calculate thumbnail size. No hardcoded ratio mapping needed.

### Dimension Calculation

```typescript
// Calculate thumbnail dimensions from actual image dimensions
// Fits within 300px bounding box while preserving aspect ratio
function calculateThumbnailDimensions(
  originalWidth: number,
  originalHeight: number
): { width: number; height: number } {
  const MAX_SIZE = 300
  const ratio = originalWidth / originalHeight

  if (ratio >= 1) {
    // Landscape or square: constrain width
    return { width: MAX_SIZE, height: Math.round(MAX_SIZE / ratio) }
  }
  // Portrait: constrain height
  return { width: Math.round(MAX_SIZE * ratio), height: MAX_SIZE }
}
```

### Example Outputs

| Original Size | Aspect Ratio | Thumbnail Size |
|--------------|--------------|----------------|
| 1024×1024 | 1:1 | 300×300 |
| 1024×576 | 16:9 | 300×169 |
| 576×1024 | 9:16 | 169×300 |
| 1024×768 | 4:3 | 300×225 |
| 768×1024 | 3:4 | 225×300 |
| 2048×512 | 4:1 (banner) | 300×75 |

## Files to Modify

### `supabase/functions/generate-avatar/index.ts`

**Update `generateThumbnail` function** (lines 466-482):
- Add width/height parameters instead of fixed values
- Keep JPEG format and quality settings

**Update thumbnail generation call** (lines 1086-1109):
- Read dimensions from decoded image: `image.width`, `image.height`
- Calculate thumbnail dimensions from actual values
- Pass calculated dimensions to `generateThumbnail()`

### Minimal Code Change

```typescript
// Before (line ~1086):
const thumbnailBuffer = await generateThumbnail(avatarBuffer, 300, 300, 98)

// After:
const image = await Image.decode(avatarBuffer)
const { width: thumbW, height: thumbH } = calculateThumbnailDimensions(image.width, image.height)
const thumbnailBuffer = await generateThumbnail(avatarBuffer, thumbW, thumbH, 98)
```

## Design Decisions (from review)

| Decision | Rationale |
|----------|-----------|
| **Use actual image dimensions** | No hardcoded ratio map to maintain. Works with any future aspect ratio automatically. |
| **Keep 300px max** | Matches current behavior. 400px risks exceeding 512KB bucket limit. |
| **Keep JPEG format** | WebP requires additional Deno dependencies. JPEG is sufficient. |
| **No legacy migration** | Existing thumbnails work fine with `object-contain`. |

## Edge Cases

### Legacy Generations
- Existing 300x300 thumbnails remain unchanged
- Display uses `object-contain` so they show letterboxed, not stretched

### Thumbnail Generation Failure
- Keep existing error handling (log error, continue without thumbnail)
- Full-resolution image is still stored and accessible

## Out of Scope

- WebP conversion (requires additional dependencies)
- Legacy thumbnail regeneration
- Supabase Image Transformations (requires Pro plan)

## Implementation Steps

1. Add `calculateThumbnailDimensions()` helper function
2. Read image dimensions after decoding Gemini response
3. Pass calculated dimensions to `generateThumbnail()`
4. Deploy: `supabase functions deploy generate-avatar`
5. Test with various aspect ratios

## Testing Checklist

- [ ] Generate 1:1 avatar → 300×300 thumbnail
- [ ] Generate 16:9 avatar → 300×169 thumbnail
- [ ] Generate 9:16 avatar → 169×300 thumbnail
- [ ] Generate banner → appropriate dimensions
- [ ] Verify gallery displays without distortion
- [ ] Verify modal progressive loading works
- [ ] Verify legacy avatars still display correctly
