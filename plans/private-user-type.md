# feat: Add Private User Type

## Overview

Add a "Private" user tier so admins can invite users whose avatars are **always private** and never appear in public showcases.

## Implementation

### 1. Database Migration

**File: `supabase/migrations/YYYYMMDD_add_private_tier.sql`**

```sql
-- Add private tier (same limits as standard, no invites)
INSERT INTO public.user_tiers (id, label, daily_generation_limit, daily_invite_limit, can_create_invites, sort_order)
VALUES ('private', 'Private', 20, 0, false, 4);
```

That's it. No new columns needed - we compute `canMakePublic` from `tier !== 'private'`.

### 2. Edge Functions

**File: `supabase/functions/invite-user/index.ts` (~line 75)**

```typescript
// BEFORE
const validTiers = ['premium', 'standard']

// AFTER
const validTiers = ['premium', 'standard', 'private']
```

**File: `supabase/functions/generate-avatar/index.ts` (~line 1300)**

```typescript
// BEFORE
const isPublic = validatedReq.isPublic !== false

// AFTER - force private for Private tier users
const { data: profile } = await supabaseAdmin
  .from('profiles')
  .select('tier_id')
  .eq('id', user.id)
  .single()

const canMakePublic = profile?.tier_id !== 'private'
const isPublic = canMakePublic ? (validatedReq.isPublic !== false) : false

// Also update shareUrl logic (line 1293)
if (thumbnailFilename && isPublic) {  // Changed from: validatedReq.isPublic !== false
```

**File: `supabase/functions/extend-image/index.ts` (~line 503)**

```typescript
// BEFORE (hardcoded - bug for ALL users)
is_public: true,

// AFTER - respect user choice, force private for Private tier
// Add near top after auth check:
const { data: profile } = await supabaseAdmin
  .from('profiles')
  .select('tier_id')
  .eq('id', user.id)
  .single()

const canMakePublic = profile?.tier_id !== 'private'
const isPublic = canMakePublic ? (validatedReq.isPublic ?? true) : false

// Then at line 503:
is_public: isPublic,

// And update shareUrl logic similarly
```

### 3. Frontend

**File: `src/types/index.ts` (line 208)**

```typescript
// BEFORE
export type UserTier = 'admin' | 'premium' | 'standard'

// AFTER
export type UserTier = 'admin' | 'premium' | 'standard' | 'private'
```

**File: `src/components/admin/InviteUser.tsx` (lines 7-12)**

```typescript
import { Lock } from 'lucide-react'  // Add to imports

const tierConfig = {
  premium: { label: 'Premium', icon: <Star className="h-4 w-4" />, color: 'purple' },
  standard: { label: 'Standard', icon: <User className="h-4 w-4" />, color: 'gray' },
  private: { label: 'Private', icon: <Lock className="h-4 w-4" />, color: 'orange' },  // ADD
} as const
```

**File: `src/components/wizard/steps/GenerateStep.tsx`**

Use existing `useQuota()` hook - it already returns the tier:

```typescript
// At top of component (useQuota is likely already imported)
const { quota } = useQuota()
const canMakePublic = quota?.tier !== 'private'

// Line 419-442 (custom category privacy toggle) - wrap with condition
{canMakePublic && (
  <label className="flex items-center gap-3 cursor-pointer group">
    {/* existing checkbox code */}
  </label>
)}

// Line 572-595 (predefined styles privacy toggle) - same pattern
{canMakePublic && (
  <label className="flex items-center gap-3 cursor-pointer group">
    {/* existing checkbox code */}
  </label>
)}
```

## Deployment

```bash
# All at once - no phased rollout needed
supabase db push
supabase functions deploy invite-user generate-avatar extend-image
npm run build && git push  # triggers GitHub Pages deploy
```

## Testing

1. Create a Private user via Admin > Invite User
2. Log in as Private user
3. Verify no privacy toggle visible on wizard
4. Generate avatar, verify `is_public=false` in database
5. Create wallpaper, verify `is_public=false` in database
6. Check homepage - Private user's avatars should NOT appear

## What We're NOT Doing (YAGNI)

- ~~New `can_make_public` database column~~ - computed from tier_id
- ~~New `can_make_public()` RPC function~~ - inline the check
- ~~New `useUserTier()` hook~~ - useQuota already has tier
- ~~Retroactive privacy on tier change~~ - build if someone asks
- ~~Privacy badges in gallery~~ - users know they selected Private
- ~~Admin tier change UI~~ - SQL is fine for rare operation

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/YYYYMMDD_add_private_tier.sql` | New: INSERT tier |
| `supabase/functions/invite-user/index.ts` | 1 line: add 'private' to validTiers |
| `supabase/functions/generate-avatar/index.ts` | ~8 lines: tier check + privacy enforcement |
| `supabase/functions/extend-image/index.ts` | ~8 lines: same (also fixes hardcoded bug) |
| `src/types/index.ts` | 1 line: add 'private' to UserTier |
| `src/components/admin/InviteUser.tsx` | ~3 lines: add tier option |
| `src/components/wizard/steps/GenerateStep.tsx` | ~4 lines: conditional toggle render |

**Total: ~25 lines changed across 7 files**
