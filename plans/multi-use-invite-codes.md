# feat: Multi-Use Invite Codes

## Overview

Enable admin users to create invite codes that can be redeemed by N people (1-50) instead of the current one-time-use system.

## Problem Statement

Currently, invite codes are single-use (`is_redeemed` boolean). To invite 10 people, an admin must create 10 separate codes. This is inefficient for events, campaigns, and team onboarding.

## Proposed Solution

Replace the `is_redeemed` boolean with two integer columns: `max_uses` and `times_used`. No separate tables needed.

## Technical Approach

### Database Migration

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_multi_use_invite_codes.sql

-- Add new columns
ALTER TABLE public.invite_codes
  ADD COLUMN max_uses INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN times_used INTEGER NOT NULL DEFAULT 0;

-- Add constraints
ALTER TABLE public.invite_codes
  ADD CONSTRAINT valid_max_uses CHECK (max_uses BETWEEN 1 AND 50),
  ADD CONSTRAINT valid_times_used CHECK (times_used >= 0 AND times_used <= max_uses);

-- Backfill: existing redeemed codes should show as 1/1 used
UPDATE public.invite_codes
SET times_used = 1
WHERE is_redeemed = true;

-- Drop old columns (after confirming migration works)
ALTER TABLE public.invite_codes
  DROP COLUMN is_redeemed,
  DROP COLUMN redeemed_by,
  DROP COLUMN redeemed_at,
  DROP COLUMN redeemed_email;

-- Drop the old constraint that referenced is_redeemed
ALTER TABLE public.invite_codes
  DROP CONSTRAINT IF EXISTS valid_redemption;
```

### Updated `claim_invite_code()` Function

```sql
CREATE OR REPLACE FUNCTION public.claim_invite_code(invite_code TEXT, user_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_code RECORD;
BEGIN
  user_email := LOWER(TRIM(user_email));

  -- Lock and fetch code
  SELECT id, created_by, tier_granted, max_uses, times_used, expires_at
  INTO v_code
  FROM public.invite_codes
  WHERE code = UPPER(invite_code)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid invite code');
  END IF;

  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < NOW() THEN
    RETURN json_build_object('success', false, 'error', 'Invite code has expired');
  END IF;

  IF v_code.times_used >= v_code.max_uses THEN
    RETURN json_build_object('success', false, 'error', 'All invite slots have been used');
  END IF;

  -- Check if email already registered
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
    RETURN json_build_object('success', false, 'error', 'Email already registered');
  END IF;

  -- Increment counter (atomic with FOR UPDATE lock)
  UPDATE public.invite_codes
  SET times_used = times_used + 1
  WHERE id = v_code.id;

  RETURN json_build_object(
    'success', true,
    'invite_id', v_code.id,
    'created_by', v_code.created_by,
    'tier_granted', v_code.tier_granted
  );
END;
$$;
```

### Updated `get_my_invite_codes()` Function

```sql
CREATE OR REPLACE FUNCTION public.get_my_invite_codes()
RETURNS TABLE (
  invite_id UUID,
  invite_code TEXT,
  invite_max_uses INTEGER,
  invite_times_used INTEGER,
  invite_tier_granted TEXT,
  invite_expires_at TIMESTAMPTZ,
  invite_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ic.id,
    ic.code,
    ic.max_uses,
    ic.times_used,
    ic.tier_granted,
    ic.expires_at,
    ic.created_at
  FROM public.invite_codes ic
  WHERE ic.created_by = auth.uid()
  ORDER BY ic.created_at DESC;
END;
$$;
```

### Edge Function Updates

#### `generate-invite-code/index.ts`

```typescript
// Add maxUses to request body (default 1)
const maxUses = Math.min(50, Math.max(1, parseInt(body.maxUses) || 1))

// Include in INSERT
const { data: inviteCode } = await supabaseAdmin
  .from('invite_codes')
  .insert({
    code,
    created_by: userId,
    expires_at: expirationDate.toISOString(),
    tier_granted: tierGranted,
    max_uses: maxUses,  // NEW
  })
  .select()
  .single()
```

#### `redeem-invite/index.ts`

```typescript
// GET handler - check availability
const { data: code } = await supabaseAdmin
  .from('invite_codes')
  .select('times_used, max_uses, expires_at')
  .eq('code', codeParam.toUpperCase())
  .single()

const isValid = code &&
  code.times_used < code.max_uses &&
  (!code.expires_at || new Date(code.expires_at) > new Date())

return new Response(JSON.stringify({
  valid: isValid,
  remaining: isValid ? code.max_uses - code.times_used : 0
}))
```

### Frontend Updates

#### `InviteManager.tsx`

```tsx
// Add state
const [maxUses, setMaxUses] = useState(1)

// Add input
<Input
  type="number"
  min={1}
  max={50}
  value={maxUses}
  onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
/>

// Pass to API
await supabase.functions.invoke('generate-invite-code', {
  body: { maxUses }
})

// Display
<span>{code.invite_times_used}/{code.invite_max_uses} used</span>
```

## Acceptance Criteria

- [ ] Admin can set max uses (1-50) when creating code
- [ ] Default is 1 (backward compatible)
- [ ] Code works until times_used reaches max_uses
- [ ] Admin sees "X/N used" status
- [ ] Existing codes continue working

## Files to Modify

- [ ] `supabase/migrations/YYYYMMDDHHMMSS_add_multi_use_invite_codes.sql` (new)
- [ ] [supabase/functions/generate-invite-code/index.ts](supabase/functions/generate-invite-code/index.ts)
- [ ] [supabase/functions/redeem-invite/index.ts](supabase/functions/redeem-invite/index.ts)
- [ ] [src/components/invite/InviteManager.tsx](src/components/invite/InviteManager.tsx)

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Concurrent redemptions at N-1 | FOR UPDATE lock ensures only one succeeds |
| Code expired | Error regardless of remaining slots |
| Code exhausted | Error: "All invite slots have been used" |
| Invalid max_uses | Database CHECK constraint rejects |

## What We're NOT Building

- Separate redemptions table (YAGNI)
- Audit trail of who redeemed (check profiles if needed)
- Status lifecycle (pending/completed/failed)
- Duplicate email per code tracking (check auth.users instead)
