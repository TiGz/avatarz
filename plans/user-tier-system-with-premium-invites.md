# feat: User Tier System with Premium Invites

**Created:** 2025-12-04
**Status:** Draft

## Overview

Extend the user model to support 3 user tiers with tier-specific quotas and invite capabilities:

| Tier | Generations/Day | Daily Invites | Can Create Invites |
|------|-----------------|---------------|-------------------|
| Admin | Unlimited | Unlimited | Yes |
| Premium | 50 | 3 | Yes (Standard users only) |
| Standard | 20 | 0 | No |

Premium users can generate shareable invite links for social media. Each link:
- Is redeemable exactly once
- Expires after 7 days
- Allows recipient to enter their email and receive a magic link
- Creates a new Standard user account

## Problem Statement

Currently the system only distinguishes between admin (`is_admin=true`) and regular users. There's no intermediate tier for power users who should have:
- Higher generation quotas than standard users
- The ability to invite new users (viral growth mechanism)

The existing invite system (`invite-user` edge function) is admin-only and requires the admin to know the user's email upfront. Premium invites should be shareable links that anyone can redeem.

## Database Schema Changes

### ERD

```mermaid
erDiagram
    user_tiers ||--o{ profiles : "has tier"
    profiles ||--o{ invite_codes : "creates"
    profiles ||--o{ invite_codes : "redeems"

    user_tiers {
        text id PK "e.g., 'admin', 'premium', 'standard'"
        text label "Display name"
        int daily_generation_limit "-1 = unlimited"
        int daily_invite_limit "-1 = unlimited, 0 = none"
        boolean can_create_invites
        int sort_order
    }

    profiles {
        uuid id PK FK "auth.users.id"
        text email
        boolean is_admin "Keep for backwards compat"
        text tier_id FK "user_tiers.id, default 'standard'"
        timestamptz created_at
    }

    invite_codes {
        uuid id PK
        text code UK "8-char alphanumeric"
        uuid created_by FK "profiles.id"
        timestamptz created_at
        timestamptz expires_at "created_at + 7 days"
        boolean is_redeemed "default false"
        uuid redeemed_by FK "profiles.id, nullable"
        timestamptz redeemed_at "nullable"
        text redeemed_email "nullable, for audit"
    }
```

### Migration: user_tiers table

```sql
-- Create tier configuration table
CREATE TABLE public.user_tiers (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  daily_generation_limit INTEGER NOT NULL, -- -1 = unlimited
  daily_invite_limit INTEGER NOT NULL,     -- -1 = unlimited, 0 = none
  can_create_invites BOOLEAN DEFAULT false,
  sort_order INTEGER NOT NULL
);

-- Seed tier data
INSERT INTO public.user_tiers (id, label, daily_generation_limit, daily_invite_limit, can_create_invites, sort_order)
VALUES
  ('admin', 'Admin', -1, -1, true, 1),
  ('premium', 'Premium', 50, 3, true, 2),
  ('standard', 'Standard', 20, 0, false, 3);

-- Public read access (tiers are not sensitive)
ALTER TABLE public.user_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read tiers" ON public.user_tiers FOR SELECT USING (true);
```

### Migration: Add tier_id to profiles

```sql
-- Add tier column to profiles
ALTER TABLE public.profiles
ADD COLUMN tier_id TEXT REFERENCES public.user_tiers(id) DEFAULT 'standard';

-- Backfill: existing admins get admin tier, others get standard
UPDATE public.profiles SET tier_id = 'admin' WHERE is_admin = true;
UPDATE public.profiles SET tier_id = 'standard' WHERE tier_id IS NULL;

-- Make tier_id NOT NULL after backfill
ALTER TABLE public.profiles ALTER COLUMN tier_id SET NOT NULL;

-- Index for tier-based queries
CREATE INDEX idx_profiles_tier ON public.profiles(tier_id);
```

### Migration: invite_codes table

```sql
-- Invite codes table
CREATE TABLE public.invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_redeemed BOOLEAN DEFAULT false,
  redeemed_by UUID REFERENCES public.profiles(id),
  redeemed_at TIMESTAMPTZ,
  redeemed_email TEXT,

  -- Ensure consistent redemption state
  CONSTRAINT valid_redemption CHECK (
    (is_redeemed = false AND redeemed_by IS NULL AND redeemed_at IS NULL) OR
    (is_redeemed = true AND redeemed_by IS NOT NULL AND redeemed_at IS NOT NULL AND redeemed_email IS NOT NULL)
  )
);

-- Indexes for fast lookups
CREATE INDEX idx_invite_codes_code ON public.invite_codes(code) WHERE is_redeemed = false;
CREATE INDEX idx_invite_codes_created_by ON public.invite_codes(created_by, created_at DESC);

-- RLS policies
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- Users can view their own invite codes
CREATE POLICY "Users can view own invites"
  ON public.invite_codes FOR SELECT
  USING (created_by = auth.uid());

-- Admins can view all invite codes
CREATE POLICY "Admins can view all invites"
  ON public.invite_codes FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Only Premium/Admin can create invites (enforced via edge function, not RLS)
-- RLS allows insert for any authenticated user; edge function validates tier
CREATE POLICY "Authenticated users can create invites"
  ON public.invite_codes FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- No direct updates (use SECURITY DEFINER functions)
CREATE POLICY "No direct updates"
  ON public.invite_codes FOR UPDATE
  USING (false);

-- No direct deletes
CREATE POLICY "No direct deletes"
  ON public.invite_codes FOR DELETE
  USING (false);
```

## SQL Functions

### get_user_tier() - SECURITY DEFINER

```sql
-- Get user's tier ID (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_tier(user_id UUID)
RETURNS TEXT
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(tier_id, 'standard') FROM public.profiles WHERE id = user_id;
$$;
```

### get_user_quota() - Updated for tier-based limits

```sql
-- Replace existing function with tier-aware version
CREATE OR REPLACE FUNCTION public.get_user_quota()
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  user_tier_id TEXT;
  tier_limit INTEGER;
  generations_today INTEGER;
BEGIN
  -- Get user's tier
  SELECT tier_id INTO user_tier_id
  FROM public.profiles
  WHERE id = current_user_id;

  -- Get tier's daily limit
  SELECT daily_generation_limit INTO tier_limit
  FROM public.user_tiers
  WHERE id = user_tier_id;

  -- Fallback to 20 if tier not found
  tier_limit := COALESCE(tier_limit, 20);

  -- Count today's generations
  SELECT COUNT(*)::INTEGER INTO generations_today
  FROM public.generations
  WHERE user_id = current_user_id
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';

  -- Return quota info
  IF tier_limit = -1 THEN
    RETURN json_build_object(
      'tier', user_tier_id,
      'limit', -1,
      'used', generations_today,
      'remaining', -1,
      'is_admin', user_tier_id = 'admin'
    );
  ELSE
    RETURN json_build_object(
      'tier', user_tier_id,
      'limit', tier_limit,
      'used', generations_today,
      'remaining', GREATEST(0, tier_limit - generations_today),
      'is_admin', user_tier_id = 'admin'
    );
  END IF;
END;
$$;
```

### get_invite_quota() - New function

```sql
-- Get user's daily invite quota
CREATE OR REPLACE FUNCTION public.get_invite_quota()
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  user_tier_id TEXT;
  tier_limit INTEGER;
  can_invite BOOLEAN;
  invites_today INTEGER;
BEGIN
  -- Get user's tier and permissions
  SELECT p.tier_id, t.daily_invite_limit, t.can_create_invites
  INTO user_tier_id, tier_limit, can_invite
  FROM public.profiles p
  JOIN public.user_tiers t ON t.id = p.tier_id
  WHERE p.id = current_user_id;

  -- Check permission
  IF NOT COALESCE(can_invite, false) THEN
    RETURN json_build_object(
      'can_create', false,
      'tier', user_tier_id,
      'reason', 'Tier does not have invite permissions'
    );
  END IF;

  -- Count today's invites
  SELECT COUNT(*)::INTEGER INTO invites_today
  FROM public.invite_codes
  WHERE created_by = current_user_id
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';

  -- Return quota info
  IF tier_limit = -1 THEN
    RETURN json_build_object(
      'can_create', true,
      'tier', user_tier_id,
      'limit', -1,
      'used', invites_today,
      'remaining', -1
    );
  ELSE
    RETURN json_build_object(
      'can_create', invites_today < tier_limit,
      'tier', user_tier_id,
      'limit', tier_limit,
      'used', invites_today,
      'remaining', GREATEST(0, tier_limit - invites_today)
    );
  END IF;
END;
$$;
```

### claim_invite_code() - Atomic redemption

```sql
-- Atomically claim an invite code (prevents race conditions)
CREATE OR REPLACE FUNCTION public.claim_invite_code(
  invite_code TEXT,
  user_email TEXT
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  invite_record RECORD;
BEGIN
  -- Lock the row for update (prevents concurrent redemption)
  SELECT * INTO invite_record
  FROM public.invite_codes
  WHERE code = invite_code
  FOR UPDATE;

  -- Validate invite exists
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invite code not found');
  END IF;

  -- Validate not already redeemed
  IF invite_record.is_redeemed THEN
    RETURN json_build_object('success', false, 'error', 'Invite code already used');
  END IF;

  -- Validate not expired
  IF invite_record.expires_at < NOW() THEN
    RETURN json_build_object('success', false, 'error', 'Invite code expired');
  END IF;

  -- Mark invite as pending (store email, not yet fully redeemed)
  UPDATE public.invite_codes
  SET redeemed_email = user_email
  WHERE code = invite_code;

  RETURN json_build_object(
    'success', true,
    'invite_id', invite_record.id,
    'created_by', invite_record.created_by
  );
END;
$$;
```

### complete_invite_redemption() - Called after user signs up

```sql
-- Complete invite redemption after user successfully signs up
CREATE OR REPLACE FUNCTION public.complete_invite_redemption(
  invite_code TEXT,
  new_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.invite_codes
  SET
    is_redeemed = true,
    redeemed_by = new_user_id,
    redeemed_at = NOW()
  WHERE code = invite_code
    AND is_redeemed = false;
END;
$$;
```

### admin_set_user_tier() - Admin tier management

```sql
-- Admin function to change user tier
CREATE OR REPLACE FUNCTION public.admin_set_user_tier(
  target_user_id UUID,
  new_tier_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  caller_id UUID := auth.uid();
  old_tier TEXT;
BEGIN
  -- Verify caller is admin
  IF NOT public.is_admin(caller_id) THEN
    RETURN json_build_object('success', false, 'error', 'Admin access required');
  END IF;

  -- Verify target tier exists
  IF NOT EXISTS (SELECT 1 FROM public.user_tiers WHERE id = new_tier_id) THEN
    RETURN json_build_object('success', false, 'error', 'Invalid tier');
  END IF;

  -- Get old tier for response
  SELECT tier_id INTO old_tier FROM public.profiles WHERE id = target_user_id;

  -- Update tier
  UPDATE public.profiles
  SET tier_id = new_tier_id
  WHERE id = target_user_id;

  -- If demoting from Premium, invalidate their pending invites
  IF old_tier = 'premium' AND new_tier_id = 'standard' THEN
    DELETE FROM public.invite_codes
    WHERE created_by = target_user_id
      AND is_redeemed = false;
  END IF;

  RETURN json_build_object(
    'success', true,
    'old_tier', old_tier,
    'new_tier', new_tier_id
  );
END;
$$;
```

## Edge Functions

### generate-invite-code (New)

```typescript
// supabase/functions/generate-invite-code/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Generate 8-char URL-safe code (uppercase letters + numbers, no ambiguous chars)
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No I,O,0,1
  const array = new Uint8Array(8)
  crypto.getRandomValues(array)
  return Array.from(array).map(x => chars[x % chars.length]).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create client with user's token for RPC calls
    const supabaseUser = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Check invite quota
    const { data: quotaData, error: quotaError } = await supabaseUser.rpc('get_invite_quota')

    if (quotaError || !quotaData.can_create) {
      const reason = quotaData?.reason || 'Daily invite limit reached'
      return new Response(JSON.stringify({
        error: reason,
        quota: quotaData
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get user ID
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Generate unique code (with retry)
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey)
    let code: string
    let attempts = 0

    while (attempts < 5) {
      code = generateCode()
      const { data: existing } = await supabaseAdmin
        .from('invite_codes')
        .select('id')
        .eq('code', code)
        .single()

      if (!existing) break
      attempts++
    }

    // Create invite with 7-day expiry
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { data: invite, error: insertError } = await supabaseAdmin
      .from('invite_codes')
      .insert({
        code: code!,
        created_by: user.id,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    // Construct shareable URL
    const origin = req.headers.get('origin') || 'https://your-site.com'
    const inviteUrl = `${origin}/#/invite/${invite.code}`

    return new Response(JSON.stringify({
      code: invite.code,
      url: inviteUrl,
      expires_at: invite.expires_at,
      quota: {
        used: quotaData.used + 1,
        limit: quotaData.limit,
        remaining: quotaData.remaining - 1
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
```

### redeem-invite (New)

```typescript
// supabase/functions/redeem-invite/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // GET: Validate invite code (public, no auth)
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')

    if (!code) {
      return new Response(JSON.stringify({ error: 'Code required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: invite } = await supabaseAdmin
      .from('invite_codes')
      .select('code, expires_at, is_redeemed')
      .eq('code', code.toUpperCase())
      .single()

    if (!invite) {
      return new Response(JSON.stringify({ valid: false, error: 'Invite code not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (invite.is_redeemed) {
      return new Response(JSON.stringify({ valid: false, error: 'Invite already used' }), {
        status: 410,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (new Date(invite.expires_at) < new Date()) {
      return new Response(JSON.stringify({ valid: false, error: 'Invite expired' }), {
        status: 410,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ valid: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // POST: Redeem invite code
  if (req.method === 'POST') {
    try {
      const { code, email } = await req.json()

      if (!code || !email) {
        return new Response(JSON.stringify({ error: 'Code and email required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return new Response(JSON.stringify({ error: 'Invalid email format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )

      // Check if email already exists in auth.users
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
      const emailExists = existingUsers?.users?.some(
        u => u.email?.toLowerCase() === email.toLowerCase()
      )

      if (emailExists) {
        return new Response(JSON.stringify({
          error: 'Email already registered. Please log in instead.'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Atomically claim the invite code
      const { data: claimResult, error: claimError } = await supabaseAdmin
        .rpc('claim_invite_code', {
          invite_code: code.toUpperCase(),
          user_email: email.toLowerCase()
        })

      if (claimError || !claimResult.success) {
        return new Response(JSON.stringify({
          error: claimResult?.error || 'Failed to claim invite'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Add email to allowlist
      await supabaseAdmin
        .from('allowlist')
        .upsert({ email: email.toLowerCase() }, { onConflict: 'email' })

      // Send magic link with invite code in metadata
      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        email,
        {
          data: {
            invite_code: code.toUpperCase(),
            invited_by: claimResult.created_by
          }
        }
      )

      if (inviteError) {
        // Rollback: unset the redeemed_email since magic link failed
        await supabaseAdmin
          .from('invite_codes')
          .update({ redeemed_email: null })
          .eq('code', code.toUpperCase())

        throw inviteError
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Check your email for a magic link to complete signup'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
```

### Update handle_new_user trigger

```sql
-- Update the existing trigger to complete invite redemption
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_email TEXT;
  invite_code TEXT;
BEGIN
  -- Get admin email from config
  SELECT value INTO admin_email FROM public.config WHERE key = 'admin_email';

  -- Get invite code from user metadata (if invited via Premium user)
  invite_code := NEW.raw_user_meta_data->>'invite_code';

  -- Create profile
  INSERT INTO public.profiles (id, email, is_admin, tier_id)
  VALUES (
    NEW.id,
    LOWER(NEW.email),
    LOWER(NEW.email) = LOWER(admin_email),
    CASE
      WHEN LOWER(NEW.email) = LOWER(admin_email) THEN 'admin'
      ELSE 'standard'
    END
  );

  -- Complete invite redemption if this user was invited
  IF invite_code IS NOT NULL THEN
    PERFORM public.complete_invite_redemption(invite_code, NEW.id);
  END IF;

  RETURN NEW;
END;
$$;
```

## Frontend Changes

### New Hooks

#### useInviteQuota.ts

```typescript
// src/hooks/useInviteQuota.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface InviteQuota {
  can_create: boolean
  tier: string
  limit: number
  used: number
  remaining: number
  reason?: string
}

export function useInviteQuota() {
  const [quota, setQuota] = useState<InviteQuota | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_invite_quota')

    if (error) {
      setError(error.message)
    } else {
      setQuota(data)
      setError(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { quota, loading, error, refresh }
}
```

#### useCreateInvite.ts

```typescript
// src/hooks/useCreateInvite.ts
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface InviteResult {
  code: string
  url: string
  expires_at: string
  quota: { used: number; limit: number; remaining: number }
}

export function useCreateInvite() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createInvite = async (): Promise<InviteResult | null> => {
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-invite-code`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create invite')
      }

      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { createInvite, loading, error }
}
```

### New Components

#### InviteManager.tsx (Premium user dashboard)

```typescript
// src/components/invite/InviteManager.tsx
// Shows invite quota, create button, and list of created invites
```

#### InviteRedemptionPage.tsx (Public page)

```typescript
// src/pages/InviteRedemptionPage.tsx
// Route: /#/invite/:code
// Validates code, shows email input form, calls redeem-invite edge function
```

#### UserTierBadge.tsx (Display tier)

```typescript
// src/components/UserTierBadge.tsx
// Small badge showing user's current tier
```

### Admin UI Updates

#### AdminPage.tsx - Add tier management

- Add "Tier" column to user stats table
- Add dropdown to change user tier (calls admin_set_user_tier RPC)
- Show invite analytics (total invites, redemption rate)

### Router Updates

```typescript
// Add new route for invite redemption
{ path: '/invite/:code', element: <InviteRedemptionPage /> }
```

## Acceptance Criteria

### Functional Requirements

- [ ] Database has user_tiers table with admin/premium/standard rows
- [ ] Profiles table has tier_id column linked to user_tiers
- [ ] get_user_quota() returns tier-based limits (20/50/unlimited)
- [ ] get_invite_quota() returns Premium users' daily invite allowance
- [ ] Premium users can create up to 3 invite links per day
- [ ] Invite links are 8-character codes (e.g., ABC12345)
- [ ] Invite URLs work: /#/invite/ABC12345
- [ ] Invite codes expire after 7 days
- [ ] Each invite code can only be redeemed once
- [ ] Redeemed email is added to allowlist and sent magic link
- [ ] New user created from invite gets Standard tier
- [ ] Admin can promote users to Premium via admin dashboard
- [ ] Admin can demote Premium users to Standard (invalidates pending invites)

### Security Requirements

- [ ] Invite code generation uses crypto.getRandomValues()
- [ ] claim_invite_code() uses SELECT FOR UPDATE to prevent race conditions
- [ ] RLS policies prevent direct modification of invite_codes
- [ ] Only Premium/Admin tiers can create invites (enforced server-side)
- [ ] Email validation before redemption
- [ ] Duplicate email check against existing users

### Quality Gates

- [ ] All migrations apply cleanly with `supabase db push`
- [ ] Edge functions deploy successfully
- [ ] TypeScript types updated for new structures
- [ ] Existing tests pass (quota, auth flows)

## Implementation Phases

### Phase 1: Database Schema
1. Create migration for user_tiers table with seed data
2. Create migration to add tier_id to profiles
3. Create migration for invite_codes table
4. Update get_user_quota() function for tier-based limits
5. Create new SQL functions (get_invite_quota, claim_invite_code, etc.)

### Phase 2: Edge Functions
1. Create generate-invite-code edge function
2. Create redeem-invite edge function
3. Update handle_new_user trigger for invite completion
4. Deploy and test functions

### Phase 3: Frontend - Premium Features
1. Create useInviteQuota and useCreateInvite hooks
2. Build InviteManager component for Premium users
3. Add invite creation UI to appropriate page (wizard or nav)
4. Update useQuota to include tier info

### Phase 4: Frontend - Public Invite Redemption
1. Create InviteRedemptionPage component
2. Add route /#/invite/:code
3. Handle validation, email input, and submission
4. Show success/error states

### Phase 5: Admin Features
1. Add tier column to UserStats table
2. Create tier change dropdown with confirmation
3. Add admin_set_user_tier RPC call
4. Show invite analytics in admin dashboard

## References

### Internal Code Paths
- [supabase/migrations/20251203104423_avatarz_schema.sql](supabase/migrations/20251203104423_avatarz_schema.sql) - Current profiles/allowlist schema
- [supabase/migrations/20251203162104_storage_enhancements.sql:164-199](supabase/migrations/20251203162104_storage_enhancements.sql#L164-L199) - Current get_user_quota()
- [supabase/functions/invite-user/index.ts](supabase/functions/invite-user/index.ts) - Existing admin invite flow
- [src/hooks/useQuota.ts](src/hooks/useQuota.ts) - Current quota hook
- [src/hooks/useAdmin.ts](src/hooks/useAdmin.ts) - Admin check pattern

### External Documentation
- [Supabase Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac)
- [Supabase Rate Limiting Edge Functions](https://supabase.com/docs/guides/functions/examples/rate-limiting)
- [Supabase inviteUserByEmail](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail)
- [Supabase generateLink](https://supabase.com/docs/reference/javascript/auth-admin-generatelink)

## Notes

### Admin Email Clarification
- CLAUDE.md states admin is `ajchesney@gmail.com`
- Feature request states `ajchesney@gmail.co.uk`
- **Action needed**: Confirm which email should be the admin

### Timezone
- All quota resets use UTC midnight (matches existing generation quota)
- Uses `CURRENT_DATE` in PostgreSQL which is UTC-based
