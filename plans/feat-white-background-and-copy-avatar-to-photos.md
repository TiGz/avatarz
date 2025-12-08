# feat: White Background Option & Copy Avatar to Photos

## Features

### 1. White Background Option

Add a third background option to LegacyOptionsStep:
- **Remove Background** (default) - AI-generated style-appropriate background
- **White Background** (new) - Plain solid white (#FFFFFF)
- **Keep Original** - Preserve input photo background

Replace the current "Keep original background" checkbox with a 3-option radio group or segmented control.

### 2. Copy Avatar to Photos

Add "Copy to Photos" button in AvatarModal that copies a generated avatar to the user's photo library so it can be used as input for future generations.

---

## Implementation

### White Background

**[useWizard.ts](src/hooks/useWizard.ts)**
```typescript
// Change from:
keepBackground: boolean

// To:
backgroundType: 'remove' | 'white' | 'keep'
```

**[LegacyOptionsStep.tsx](src/components/wizard/steps/LegacyOptionsStep.tsx)**

Replace checkbox with radio group:
```tsx
<RadioGroup value={backgroundType} onValueChange={setBackgroundType}>
  <RadioGroupItem value="remove" label="Remove Background" />
  <RadioGroupItem value="white" label="White Background" />
  <RadioGroupItem value="keep" label="Keep Original" />
</RadioGroup>
```

**[generate-avatar/index.ts](supabase/functions/generate-avatar/index.ts)**

Add white background prompt (near existing `BACKGROUND_PROMPTS`):
```typescript
const BACKGROUND_PROMPTS: Record<string, string> = {
  remove: 'Replace the background with a suitable background...',
  white: 'Place the subject on a plain solid white background (#FFFFFF). The background must be pure white with no gradients or shadows.',
  keep: 'Keep the original background from the input photo...',
}
```

### Copy Avatar to Photos

**[usePhotos.ts](src/hooks/usePhotos.ts)**

Add copy function (download-upload pattern - cross-bucket `.copy()` isn't supported):
```typescript
const copyAvatarToPhotos = async (generation: Generation): Promise<Photo> => {
  if (!user) throw new Error('Not authenticated')

  // Download from avatars bucket
  const { data: blob, error: downloadError } = await supabase.storage
    .from('avatars')
    .download(generation.storage_path)

  if (downloadError || !blob) throw new Error('Failed to download avatar')

  // Upload to input-photos bucket
  const newPath = `${user.id}/${Date.now()}_avatar_copy.png`
  const { error: uploadError } = await supabase.storage
    .from('input-photos')
    .upload(newPath, blob, { contentType: 'image/png' })

  if (uploadError) throw new Error('Failed to upload to photo library')

  // Create photos record
  const { data: photo, error: dbError } = await supabase
    .from('photos')
    .insert({
      user_id: user.id,
      storage_path: newPath,
      filename: `avatar_copy_${Date.now()}.png`,
      mime_type: 'image/png',
      file_size: blob.size,
    })
    .select()
    .single()

  if (dbError) throw dbError

  // Generate thumbnail (async, non-blocking)
  generateThumbnail(photo.id).catch(console.error)

  return photo
}
```

**[AvatarModal.tsx](src/components/gallery/AvatarModal.tsx)**

Add button (only for user's own avatars):
```tsx
const { user } = useAuth()
const canCopy = generation?.user_id === user?.id

{canCopy && (
  <Button onClick={handleCopyToPhotos} disabled={isCopying}>
    {isCopying ? <Loader2 className="animate-spin" /> : <Copy />}
    {isCopying ? 'Copying...' : 'Copy to Photos'}
  </Button>
)}
```

---

## Files to Modify

| File | Change |
|------|--------|
| [src/hooks/useWizard.ts](src/hooks/useWizard.ts) | `keepBackground` → `backgroundType` |
| [src/components/wizard/steps/LegacyOptionsStep.tsx](src/components/wizard/steps/LegacyOptionsStep.tsx) | Checkbox → radio group |
| [src/hooks/usePhotos.ts](src/hooks/usePhotos.ts) | Add `copyAvatarToPhotos` |
| [src/components/gallery/AvatarModal.tsx](src/components/gallery/AvatarModal.tsx) | Add copy button |
| [supabase/functions/generate-avatar/index.ts](supabase/functions/generate-avatar/index.ts) | Add `BACKGROUND_PROMPTS.white` |

No database migrations needed.

---

## Acceptance Criteria

### White Background
- [ ] Three background options shown in LegacyOptionsStep
- [ ] Default is "Remove Background"
- [ ] "White Background" produces avatars with solid white background

### Copy to Photos
- [ ] "Copy to Photos" button appears in AvatarModal for user's own avatars
- [ ] Button shows loading state during copy
- [ ] Success toast: "Avatar copied to photo library"
- [ ] Copied avatar appears in Photo Library and can be used in wizard
