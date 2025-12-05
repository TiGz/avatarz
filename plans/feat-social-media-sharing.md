# feat: Add Social Media Sharing to Avatar Generation

## Overview

Add social media sharing to the final generation page (DownloadStep) and gallery avatar detail page (AvatarModal). Share public thumbnails directly - no watermarking, no complex image processing.

## Problem Statement

Users want to share avatars on social media. Current options require downloading first (friction).

## Proposed Solution

### Key Design Decisions

1. **Share thumbnails directly** - No watermarking, no canvas processing
2. **Public thumbnail URLs** - Make `avatar-thumbnails` bucket public for `is_public` avatars
3. **Mobile: Web Share API** - Share thumbnail URL (or file if supported)
4. **Desktop: Copy link** - Simple copy to clipboard

### What's NOT included (intentionally)

- No watermarking (removed for simplicity)
- No social media buttons (users paste link where they want)
- No canvas image processing
- No useWatermark hook

## Technical Approach

### Database Changes

**Make avatar-thumbnails publicly accessible for public avatars:**

```sql
-- Migration: allow public read on avatar-thumbnails for public generations
CREATE POLICY "Public thumbnails are viewable by anyone"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'avatar-thumbnails'
  AND EXISTS (
    SELECT 1 FROM generations
    WHERE generations.thumbnail_path = objects.name
    AND generations.is_public = true
  )
);
```

### New Files

```
src/
├── hooks/
│   └── useShare.ts              # Simple share utility
├── components/
│   └── ShareButton.tsx          # Share button component
```

### Files to Modify

- `src/components/wizard/steps/DownloadStep.tsx` - Add Share button
- `src/components/gallery/AvatarModal.tsx` - Add Share button

### Implementation

#### useShare.ts

```typescript
import { useState, useCallback } from 'react'
import { toast } from 'sonner'

export function useShare() {
  const [isSharing, setIsSharing] = useState(false)

  const share = useCallback(async (url: string, title?: string) => {
    setIsSharing(true)
    try {
      // Try Web Share API first (mobile)
      if (navigator.share) {
        await navigator.share({
          title: title || 'My Avatar',
          text: 'Check out my avatar!',
          url,
        })
        return true
      }

      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url)
      toast.success('Link copied!')
      return true
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return false // User cancelled
      }
      toast.error('Failed to share')
      return false
    } finally {
      setIsSharing(false)
    }
  }, [])

  return { share, isSharing }
}
```

#### ShareButton.tsx

```typescript
import { Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useShare } from '@/hooks/useShare'
import { supabase } from '@/lib/supabase'

interface ShareButtonProps {
  thumbnailPath: string
  isPublic: boolean
  title?: string
  variant?: 'outline' | 'default'
  className?: string
}

export function ShareButton({
  thumbnailPath,
  isPublic,
  title,
  variant = 'outline',
  className,
}: ShareButtonProps) {
  const { share, isSharing } = useShare()

  if (!isPublic) {
    return null // Don't show share for private avatars
  }

  const handleShare = async () => {
    // Get public URL for thumbnail
    const { data } = supabase.storage
      .from('avatar-thumbnails')
      .getPublicUrl(thumbnailPath)

    await share(data.publicUrl, title)
  }

  return (
    <Button
      onClick={handleShare}
      disabled={isSharing}
      variant={variant}
      className={className}
    >
      <Share2 className="mr-2 h-4 w-4" />
      {isSharing ? 'Sharing...' : 'Share'}
    </Button>
  )
}
```

### Integration

#### DownloadStep.tsx

```typescript
import { ShareButton } from '@/components/ShareButton'

// Add after Download PNG button:
<ShareButton
  thumbnailPath={state.thumbnailPath}
  isPublic={state.isPublic ?? true}
  title={`My ${state.style?.label || 'Avatar'}`}
  variant="outline"
  className="bg-transparent border-white/20 text-white hover:bg-white/10"
/>
```

#### AvatarModal.tsx

```typescript
import { ShareButton } from '@/components/ShareButton'

// Add after Download button:
<ShareButton
  thumbnailPath={generation.thumbnail_path}
  isPublic={generation.is_public}
  title={`My ${generation.style_label || 'Avatar'}`}
  variant="outline"
  className="w-full"
/>
```

## Acceptance Criteria

- [ ] Share button appears for public avatars only
- [ ] Mobile: Opens native share sheet with thumbnail URL
- [ ] Desktop: Copies thumbnail URL to clipboard
- [ ] Toast confirms "Link copied!" on desktop
- [ ] Public thumbnails accessible via direct URL

## Implementation Tasks

1. [ ] Create Supabase migration for public thumbnail access
2. [ ] Create `src/hooks/useShare.ts`
3. [ ] Create `src/components/ShareButton.tsx`
4. [ ] Integrate into DownloadStep.tsx
5. [ ] Integrate into AvatarModal.tsx
6. [ ] Run `supabase db push`

## References

- [MDN: Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API)
- [Supabase: Storage Policies](https://supabase.com/docs/guides/storage/security/access-control)
