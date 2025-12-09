# Fix Gallery Page Slow Loading

## Problem Statement

The Gallery page is making excessive API calls to Supabase Storage, causing slow load times. Investigation identified two main issues:

### Issue 1: usePhotos hook triggers unnecessary fetches

**Location:** [GalleryPage.tsx:37](src/pages/GalleryPage.tsx#L37) → [usePhotos.ts:20-60](src/hooks/usePhotos.ts#L20-L60)

The Gallery page imports `usePhotos` solely for the `copyAvatarToPhotos` function, but the hook's `useEffect` automatically fetches ALL photos and generates a signed URL for each one:

```typescript
// GalleryPage.tsx:37 - only needs one function
const { copyAvatarToPhotos } = usePhotos()

// But usePhotos.ts:62-64 runs on mount:
useEffect(() => {
  fetchPhotos()  // Fetches ALL photos with signed URLs
}, [fetchPhotos])
```

**Impact:** If you have N photos in your library, this causes N signed URL API calls every time you visit the Gallery page, even though photos aren't displayed there.

### Issue 2: Legacy avatar handling creates N+1 queries

**Location:** [useGenerations.ts:55-77](src/hooks/useGenerations.ts#L55-L77)

After the performance optimization commit (423ebc2), code was added to handle "legacy" avatars without thumbnails:

```typescript
const generationsWithUrls = await Promise.all(
  (data || []).map(async (gen) => {
    if (gen.thumbnail_storage_path) {
      // Fast path: public thumbnail URL (no API call)
      return { ...gen, thumbnailUrl: getPublicThumbnailUrl(...) }
    } else {
      // Slow path: individual signed URL API call per item
      const { data: urlData } = await supabase.storage
        .from('avatars')
        .createSignedUrl(gen.output_storage_path, 3600)
      return { ...gen, thumbnailUrl: urlData?.signedUrl, url: urlData?.signedUrl }
    }
  })
)
```

**Impact:** Each avatar without a `thumbnail_storage_path` causes an additional API call. With pagination (12 items/page), worst case is 12 API calls per page load for legacy items.

## Proposed Solutions

### Solution 1: Remove usePhotos from GalleryPage entirely

The `copyAvatarToPhotos` function doesn't need any pre-fetched data - it downloads directly using the storage path:

```typescript
// This downloads using path, not a signed URL
const { data: blob } = await supabase.storage
  .from('avatars')
  .download(generation.output_storage_path)
```

**Fix:** Move `copyAvatarToPhotos` inline to GalleryPage or extract to a standalone utility. The function is self-contained and doesn't depend on photos state.

```typescript
// GalleryPage.tsx - remove usePhotos import entirely
// const { copyAvatarToPhotos } = usePhotos()  // DELETE THIS

// Add inline function or import from utility
const copyAvatarToPhotos = async (generation: Generation) => {
  // ... implementation that doesn't need usePhotos state
}
```

**Result:** Eliminates ALL photo-related API calls from Gallery page load.

### Solution 2: Generate thumbnails for legacy avatars (one-time migration)

Run a migration/script to backfill thumbnails for all avatars that don't have them:

```sql
-- Find legacy avatars without thumbnails
SELECT id, output_storage_path
FROM generations
WHERE thumbnail_storage_path IS NULL;
```

Then use an edge function or script to:
1. Download full-res image
2. Generate 300x300 thumbnail
3. Upload to avatar-thumbnails bucket
4. Update `thumbnail_storage_path` in database

This eliminates the N+1 query problem entirely.

### Solution 3: Batch signed URL requests (if legacy handling needed)

If backfilling isn't feasible, batch the signed URL requests:

```typescript
// Instead of individual createSignedUrl calls
const legacyItems = data.filter(g => !g.thumbnail_storage_path)
if (legacyItems.length > 0) {
  const { data: signedUrls } = await supabase.storage
    .from('avatars')
    .createSignedUrls(
      legacyItems.map(g => g.output_storage_path),
      3600
    )
  // Map URLs back to items...
}
```

**Note:** `createSignedUrls` (plural) batches requests into a single API call.

### Solution 4: Don't fetch photos signed URLs eagerly in usePhotos

The `url` field on photos is only needed when actually using the photo (e.g., for avatar generation). The thumbnailUrl is enough for display.

```typescript
// usePhotos.ts - fetch thumbnails only, get full URL on demand
const photosWithUrls = (data || []).map((photo) => ({
  ...photo,
  url: undefined, // Don't fetch until needed
  thumbnailUrl: getPublicThumbnailUrl(photo.thumbnail_path),
}))
```

Add `ensureFullUrl` pattern like in useGenerations.

## Recommended Implementation Order

1. **Quick win - Fix GalleryPage:** Remove `usePhotos` and inline `copyAvatarToPhotos` (Solution 1)
2. **Quick win - Batch legacy URLs:** Use `createSignedUrls` for legacy avatars (Solution 3)
3. **Long-term - Backfill thumbnails:** Generate thumbnails for legacy avatars (Solution 2)
4. **Optional - Lazy photo URLs:** Apply ensureFullUrl pattern to usePhotos (Solution 4)

## Acceptance Criteria

- [ ] Gallery page loads without fetching photo signed URLs
- [ ] Legacy avatars (without thumbnails) use batched URL requests
- [ ] Console shows reduced API calls on Gallery page load
- [ ] No visual regressions in Gallery or Photo Library pages

## Files to Modify

1. `src/pages/GalleryPage.tsx` - Remove usePhotos, inline copyAvatarToPhotos
2. `src/hooks/useGenerations.ts` - Batch legacy URL requests
3. `src/hooks/usePhotos.ts` - Optional lazy URL loading (later)
