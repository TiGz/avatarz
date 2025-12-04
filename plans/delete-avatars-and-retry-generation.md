# Delete Avatars & Retry Generation

## Overview

Two related features to improve the avatar generation workflow:

1. **Delete Avatars** - Allow users to delete avatars from their gallery with modal confirmation and cascade deletion to storage
2. **Retry Generation** - After successful generation, option to generate again with same settings (all results go to gallery)

## Problem Statement

Currently users cannot:
- Remove unwanted avatars from their gallery
- Quickly generate variations of an avatar they like without re-selecting all options

This creates friction when users want to curate their gallery or experiment with multiple generations of the same style.

## Proposed Solution

### Feature 1: Delete Avatars

Add delete functionality to gallery with proper cascade deletion:
- Delete button on AvatarCard (hover overlay) and in AvatarModal
- Confirmation dialog before deletion
- Cascade delete: storage files first (avatars + thumbnails), then database record
- Follow existing `deletePhoto()` pattern from `usePhotos.ts`

### Feature 2: Retry Generation

Add "Generate Again" button after successful generation:
- Shows on DownloadStep after generation completes
- Uses exact same settings (style, crop, name, photo)
- Counts toward daily quota (consistent with existing behavior)
- New avatar added to gallery alongside original

## Technical Approach

### Database Migration

Add RLS DELETE policy for `generations` table (currently missing):

```sql
-- supabase/migrations/YYYYMMDD_add_generation_delete_policy.sql

-- Users can delete their own generations
CREATE POLICY "Users can delete own generations"
  ON public.generations
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can delete any generation (for moderation)
CREATE POLICY "Admins can delete any generation"
  ON public.generations
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));
```

### Component Changes

#### 1. Add AlertDialog Component

```bash
npx shadcn@latest add alert-dialog
```

Creates: `src/components/ui/alert-dialog.tsx`

#### 2. Update useGenerations Hook

Add `deleteGeneration` function following `deletePhoto` pattern:

```typescript
// src/hooks/useGenerations.ts

const deleteGeneration = async (generationId: string): Promise<boolean> => {
  const generation = generations.find((g) => g.id === generationId)
  if (!generation) return false

  try {
    // 1. Delete full-size avatar from storage
    const { error: avatarError } = await supabase.storage
      .from('avatars')
      .remove([generation.output_storage_path])

    if (avatarError) throw avatarError

    // 2. Delete thumbnail if exists
    if (generation.thumbnail_storage_path) {
      const { error: thumbError } = await supabase.storage
        .from('avatar-thumbnails')
        .remove([generation.thumbnail_storage_path])

      if (thumbError) console.warn('Thumbnail delete failed:', thumbError)
    }

    // 3. Delete database record
    const { error: dbError } = await supabase
      .from('generations')
      .delete()
      .eq('id', generationId)

    if (dbError) throw dbError

    // 4. Update local state
    setGenerations((prev) => prev.filter((g) => g.id !== generationId))
    toast.success('Avatar deleted')
    return true
  } catch (error) {
    console.error('Error deleting generation:', error)
    toast.error('Failed to delete avatar')
    return false
  }
}
```

#### 3. Update AvatarCard

Add delete button to hover overlay:

```typescript
// src/components/gallery/AvatarCard.tsx

// Add to button row alongside Eye and Download icons
<button
  onClick={(e) => {
    e.stopPropagation()
    onDelete?.(generation)
  }}
  className="p-2 rounded-full bg-black/50 hover:bg-red-600 transition-colors"
  title="Delete avatar"
>
  <Trash2 className="w-4 h-4" />
</button>
```

#### 4. Update AvatarModal

Add delete button and confirmation dialog:

```typescript
// src/components/gallery/AvatarModal.tsx

// Add AlertDialog for confirmation
<AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete Avatar?</AlertDialogTitle>
      <AlertDialogDescription>
        This will permanently delete this avatar. This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
      <AlertDialogAction
        onClick={handleDelete}
        disabled={deleting}
        className="bg-destructive text-destructive-foreground"
      >
        {deleting ? 'Deleting...' : 'Delete'}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

#### 5. Update DownloadStep

Add "Generate Again" button:

```typescript
// src/components/wizard/steps/DownloadStep.tsx

<Button
  onClick={handleGenerateAgain}
  disabled={isGenerating || !canGenerate}
  className="flex items-center gap-2"
>
  <RotateCw className="w-4 h-4" />
  Generate Again
</Button>
```

Implementation:
- Navigate back to GenerateStep with `status: 'idle'`
- Trigger `handleGenerate()` immediately
- Show generating state, then new DownloadStep on success

### GalleryPage State Management

```typescript
// src/pages/GalleryPage.tsx

const [deleteTarget, setDeleteTarget] = useState<Generation | null>(null)
const [deleting, setDeleting] = useState(false)

const handleDelete = async () => {
  if (!deleteTarget) return
  setDeleting(true)
  const success = await deleteGeneration(deleteTarget.id)
  setDeleting(false)
  if (success) {
    setDeleteTarget(null)
    if (selectedGeneration?.id === deleteTarget.id) {
      setSelectedGeneration(null)
    }
  }
}
```

## Acceptance Criteria

### Delete Avatars

- [ ] Delete button appears on AvatarCard hover overlay (Trash2 icon)
- [ ] Delete button appears in AvatarModal header
- [ ] Clicking delete opens confirmation dialog
- [ ] Confirmation dialog shows "Delete Avatar?" with cancel/delete buttons
- [ ] Delete removes file from `avatars` storage bucket
- [ ] Delete removes file from `avatar-thumbnails` storage bucket
- [ ] Delete removes record from `generations` table
- [ ] Gallery updates immediately after deletion
- [ ] Success toast shows "Avatar deleted"
- [ ] Error toast shows if deletion fails
- [ ] Modal closes after successful deletion
- [ ] Users can only delete their own avatars (RLS enforced)
- [ ] Admins can delete any avatar

### Retry Generation

- [ ] "Generate Again" button appears on DownloadStep after successful generation
- [ ] Clicking "Generate Again" starts new generation with same settings
- [ ] Retry uses same: style, crop, name, placement, photo
- [ ] Retry counts toward daily quota
- [ ] Button disabled if quota exhausted (with tooltip)
- [ ] Both original and retry appear in gallery
- [ ] User can delete unwanted generations afterward

## Edge Cases & Error Handling

| Scenario | Behavior |
|----------|----------|
| Delete with network error | Show error toast, keep avatar in gallery |
| Storage delete fails, DB succeeds | Log warning, show success (graceful degradation) |
| DB delete fails after storage deleted | Show error, storage files orphaned (acceptable) |
| Retry when quota exhausted | Disable button, show tooltip "Daily limit reached" |
| Retry with deleted source photo | Disable button, show tooltip "Source photo deleted" |
| Delete last avatar in gallery | Show empty state with "Create Your First Avatar" CTA |
| Delete avatar while in modal | Close modal, refresh gallery, show success toast |

## File Changes

| File | Change Type |
|------|-------------|
| `supabase/migrations/YYYYMMDD_add_generation_delete_policy.sql` | New |
| `src/components/ui/alert-dialog.tsx` | New (shadcn) |
| `src/hooks/useGenerations.ts` | Update - add `deleteGeneration()` |
| `src/components/gallery/AvatarCard.tsx` | Update - add delete button |
| `src/components/gallery/AvatarModal.tsx` | Update - add delete button + dialog |
| `src/pages/GalleryPage.tsx` | Update - add delete state management |
| `src/components/wizard/steps/DownloadStep.tsx` | Update - add "Generate Again" button |
| `src/hooks/useWizard.ts` | Update - add retry state handling |

## Implementation Phases

### Phase 1: Delete Feature (Core)
1. Create RLS migration for DELETE policy
2. Add AlertDialog component via shadcn
3. Add `deleteGeneration()` to useGenerations hook
4. Add delete button to AvatarCard
5. Add delete button and dialog to AvatarModal
6. Update GalleryPage with delete state management
7. Test deletion flow end-to-end

### Phase 2: Retry Feature
1. Add "Generate Again" button to DownloadStep
2. Add retry logic to useWizard (maintain state, re-trigger generation)
3. Add quota check before retry
4. Test retry flow end-to-end

### Phase 3: Polish
1. Add loading states during deletion
2. Handle empty gallery state after deleting last avatar
3. Add tooltips for disabled states
4. Test edge cases (network errors, concurrent operations)

## Dependencies & Risks

| Dependency | Risk Level | Mitigation |
|------------|------------|------------|
| RLS DELETE policy missing | High | First priority - create migration |
| AlertDialog not installed | Low | Simple shadcn add command |
| Source photo deletion | Medium | Check photo exists before allowing retry |

## Success Metrics

- Users can delete avatars without errors
- Delete cascade properly removes both storage files and DB record
- Retry generates new avatar with same settings
- No orphaned storage files or database records

## References

### Internal Files
- [usePhotos.ts:118-146](src/hooks/usePhotos.ts#L118-L146) - Delete pattern to follow
- [AvatarCard.tsx](src/components/gallery/AvatarCard.tsx) - Add delete button
- [AvatarModal.tsx](src/components/gallery/AvatarModal.tsx) - Add delete + dialog
- [DownloadStep.tsx](src/components/wizard/steps/DownloadStep.tsx) - Add retry button
- [GeneratePromptPreview.tsx](src/components/wizard/GeneratePromptPreview.tsx) - Modal pattern example

### External References
- [Supabase Storage Remove](https://supabase.com/docs/reference/javascript/storage-from-remove)
- [shadcn AlertDialog](https://ui.shadcn.com/docs/components/alert-dialog)
