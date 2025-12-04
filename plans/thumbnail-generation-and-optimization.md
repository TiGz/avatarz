# Thumbnail Generation and Optimization

## Overview

Add thumbnail generation for generated avatars to improve gallery performance and reduce bandwidth. Thumbnails are created at generation time and stored alongside originals.

## Problem Statement

Currently all avatars are served at full resolution (~1-3MB PNG files), causing:
- Slow gallery loading, especially on mobile
- Unnecessary bandwidth consumption for grid views
- Poor UX when browsing many avatars

## Proposed Solution

Generate 300x300 JPEG thumbnails for every avatar at generation time:
- Store thumbnails in separate `avatar-thumbnails` bucket
- Store both URLs in the `generations` database row
- Display thumbnails throughout the UI
- Allow viewing/downloading full resolution on demand

### Why This Approach

- **No Pro Plan required** - Uses standard Supabase features
- **Simple architecture** - Generate once at creation, serve forever
- **Fast gallery loads** - 300x300 JPEGs are ~10-50KB vs 1-3MB originals
- **Predictable costs** - Storage-based, no per-transformation fees

## Technical Approach

### Phase 1: Database Schema Update

#### 1.1 Add Thumbnail Column to Generations

**File:** `supabase/migrations/YYYYMMDDHHMMSS_add_avatar_thumbnails.sql`

```sql
-- Add thumbnail storage path to generations
ALTER TABLE generations
ADD COLUMN thumbnail_storage_path TEXT;

-- Create thumbnail bucket (private like avatars)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatar-thumbnails',
  'avatar-thumbnails',
  FALSE,
  524288,  -- 512KB max (thumbnails are small)
  ARRAY['image/jpeg']::text[]
);

-- RLS: Users can view their own thumbnails
CREATE POLICY "Users can view own avatar thumbnails"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatar-thumbnails' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Service role can insert (edge function)
CREATE POLICY "Service role can insert thumbnails"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'avatar-thumbnails');
```

### Phase 2: Update Edge Function

#### 2.1 Modify generate-avatar Function

**File:** `supabase/functions/generate-avatar/index.ts`

After generating the avatar PNG, add thumbnail generation:

```typescript
// After line ~555 (avatar upload to storage)

// Generate 300x300 JPEG thumbnail
const thumbnailData = await generateThumbnail(avatarPngBytes, 300, 300, 85);

// Upload thumbnail
const thumbnailPath = `${userId}/${Date.now()}_${crypto.randomUUID()}_thumb.jpg`;
const { error: thumbError } = await adminClient.storage
  .from('avatar-thumbnails')
  .upload(thumbnailPath, thumbnailData, {
    contentType: 'image/jpeg',
    cacheControl: '31536000' // 1 year cache
  });

// Include thumbnail path in database insert
await adminClient.from('generations').insert({
  // ... existing fields
  thumbnail_storage_path: thumbnailPath
});
```

#### 2.2 Add Thumbnail Generation Function

**In generate-avatar/index.ts or separate module:**

```typescript
async function generateThumbnail(
  pngBytes: Uint8Array,
  width: number,
  height: number,
  quality: number
): Promise<Uint8Array> {
  // Use Deno-compatible image library
  // Options:
  // 1. imagescript (pure JS, Deno-native)
  // 2. canvas via npm: specifier
  // 3. sharp via npm: specifier (may have issues)

  // Using imagescript (recommended for Deno):
  const { Image } = await import('https://deno.land/x/imagescript@1.2.15/mod.ts');

  const image = await Image.decode(pngBytes);
  image.resize(width, height);

  // Encode as JPEG
  const jpegBytes = await image.encodeJPEG(quality);
  return jpegBytes;
}
```

### Phase 3: Update Type Definitions

#### 3.1 Update Generation Interface

**File:** `src/types/index.ts`

```typescript
export interface Generation {
  id: string
  user_id: string
  input_photo_id: string | null
  output_storage_path: string
  thumbnail_storage_path: string | null  // NEW
  style: string
  crop_type: string
  name_text: string | null
  name_placement: string | null
  custom_style: string | null
  custom_placement: string | null
  prompt_tokens: number | null
  completion_tokens: number | null
  total_tokens: number | null
  cost_usd: number | null
  created_at: string
  url?: string
  thumbnailUrl?: string  // NEW
}
```

### Phase 4: Update Hooks

#### 4.1 Update useGenerations Hook

**File:** `src/hooks/useGenerations.ts`

```typescript
// Update fetchGenerations to get thumbnail signed URLs
const fetchGenerations = async () => {
  // ... existing query

  // Get signed URLs for both original and thumbnail
  const generationsWithUrls = await Promise.all(
    generations.map(async (gen) => {
      const [originalUrl, thumbnailUrl] = await Promise.all([
        // Original (existing)
        supabase.storage
          .from('avatars')
          .createSignedUrl(gen.output_storage_path, 3600),
        // Thumbnail (new)
        gen.thumbnail_storage_path
          ? supabase.storage
              .from('avatar-thumbnails')
              .createSignedUrl(gen.thumbnail_storage_path, 3600)
          : Promise.resolve({ data: null })
      ]);

      return {
        ...gen,
        url: originalUrl.data?.signedUrl,
        thumbnailUrl: thumbnailUrl.data?.signedUrl || originalUrl.data?.signedUrl
      };
    })
  );
};
```

### Phase 5: Update UI Components

#### 5.1 Update AvatarCard Component

**File:** `src/components/gallery/AvatarCard.tsx`

```tsx
// Display thumbnail in card, pass both URLs to modal
<img
  loading="lazy"
  src={generation.thumbnailUrl || generation.url}
  alt={`${generation.style} avatar`}
  className="w-full h-full object-cover"
/>

// On click, open modal with full URL
<AvatarModal
  generation={generation}
  thumbnailUrl={generation.thumbnailUrl}
  fullUrl={generation.url}
/>
```

#### 5.2 Update AvatarModal Component

**File:** `src/components/gallery/AvatarModal.tsx`

```tsx
// Show thumbnail immediately, load full resolution
const [fullLoaded, setFullLoaded] = useState(false);

return (
  <div className="relative">
    {/* Thumbnail as immediate placeholder */}
    <img
      src={thumbnailUrl}
      className={`transition-opacity ${fullLoaded ? 'opacity-0' : 'opacity-100'}`}
    />

    {/* Full resolution loads on top */}
    <img
      src={fullUrl}
      onLoad={() => setFullLoaded(true)}
      className={`absolute inset-0 transition-opacity ${fullLoaded ? 'opacity-100' : 'opacity-0'}`}
    />

    {/* Download button uses full URL */}
    <Button onClick={() => downloadImage(fullUrl)}>
      Download Full Resolution
    </Button>
  </div>
);
```

#### 5.3 Update DownloadStep Component

**File:** `src/components/wizard/steps/DownloadStep.tsx`

- Ensure download button uses full resolution URL
- Display thumbnail for preview, full for download

### Phase 6: Handle Legacy Avatars

#### 6.1 Fallback for Existing Avatars

Avatars generated before this update won't have thumbnails. Handle gracefully:

```typescript
// In useGenerations hook
thumbnailUrl: gen.thumbnail_storage_path
  ? thumbnailSignedUrl
  : gen.url  // Fallback to original for old avatars
```

#### 6.2 Optional: Backfill Migration Script

Create a one-time script to generate thumbnails for existing avatars:

**File:** `scripts/backfill-thumbnails.ts` (run manually)

```typescript
// Fetch all generations without thumbnails
// For each, download original, generate thumbnail, upload, update DB
// Run with: deno run --allow-net --allow-env scripts/backfill-thumbnails.ts
```

## Acceptance Criteria

### Functional Requirements

- [ ] New avatars have 300x300 JPEG thumbnails generated at creation
- [ ] Thumbnails stored in `avatar-thumbnails` bucket
- [ ] `thumbnail_storage_path` column added to generations table
- [ ] Gallery displays thumbnails instead of full images
- [ ] Modal shows full resolution image
- [ ] Download button provides full resolution
- [ ] Legacy avatars (no thumbnail) display original image as fallback

### Non-Functional Requirements

- [ ] Thumbnail generation adds < 1 second to avatar creation time
- [ ] Thumbnails are 10-50KB (vs 1-3MB originals)
- [ ] Gallery page loads significantly faster (measure before/after)
- [ ] No visible quality loss at 300x300 display size

### Quality Gates

- [ ] Edge function deploys successfully
- [ ] Database migration applies cleanly
- [ ] All existing avatars still display (fallback works)
- [ ] New avatar generation flow works end-to-end

## File Changes Summary

| File | Change |
|------|--------|
| `supabase/migrations/YYYYMMDDHHMMSS_add_avatar_thumbnails.sql` | NEW: Schema + bucket |
| `supabase/functions/generate-avatar/index.ts` | MODIFY: Add thumbnail generation |
| `src/types/index.ts` | MODIFY: Add thumbnail fields |
| `src/hooks/useGenerations.ts` | MODIFY: Fetch thumbnail URLs |
| `src/components/gallery/AvatarCard.tsx` | MODIFY: Display thumbnail |
| `src/components/gallery/AvatarModal.tsx` | MODIFY: Progressive loading |
| `src/components/wizard/steps/DownloadStep.tsx` | MODIFY: Ensure full res download |

## Implementation Order

1. **Database migration** - Add column and bucket
2. **Edge function update** - Generate thumbnails on creation
3. **Type definitions** - Add thumbnail fields
4. **useGenerations hook** - Fetch thumbnail URLs
5. **UI components** - Display thumbnails
6. **Testing** - Verify full flow
7. **Optional: Backfill** - Generate thumbnails for existing avatars

## Dependencies

- **imagescript library** - Deno-compatible image processing for edge function
- **Database migration** - Must be applied before edge function deploy

## Risk Analysis

| Risk | Impact | Mitigation |
|------|--------|------------|
| imagescript library issues | HIGH | Test thoroughly in edge function, have fallback to skip thumbnail |
| Thumbnail generation timeout | MEDIUM | Set reasonable timeout, continue without thumbnail if fails |
| Legacy avatar display | LOW | Fallback to original URL handles gracefully |

## Open Questions

1. **Backfill priority**: Should we generate thumbnails for existing avatars? (Can defer)
2. **Thumbnail quality**: 85 JPEG quality sufficient? (Test visually)
3. **Error handling**: If thumbnail fails, should avatar generation fail? (Recommend: no, log warning)

## References

### Internal References
- Current avatar upload: `supabase/functions/generate-avatar/index.ts:541-555`
- Current useGenerations: `src/hooks/useGenerations.ts:28-41`
- AvatarCard component: `src/components/gallery/AvatarCard.tsx`

### External References
- [imagescript Deno library](https://deno.land/x/imagescript)
- [Supabase Storage Buckets](https://supabase.com/docs/guides/storage)
