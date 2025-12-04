# fix: Invite Magic Link Not Auto-Logging Users In

## Overview

Users clicking an invite magic link are being shown the login page instead of being automatically logged in. The URL contains valid auth tokens (`#access_token=...`) but the app isn't recognizing them.

## Problem Analysis

Looking at the screenshot URL:
```
localhost:5173/avatarz/#access_token=eyJhb...
```

The pre-React script in [index.html:13-47](index.html#L13-L47) attempts to handle this by:
1. Detecting `access_token=` in the hash
2. Parsing tokens from URL
3. Storing a session object in localStorage
4. Redirecting to `/#/`

**Root Cause**: The session object being stored is **incomplete**. The Supabase SDK's `getSession()` expects a full session structure including a `user` object, but we're only storing tokens:

```javascript
// Current (BROKEN) - missing user object
{
  access_token: "...",
  refresh_token: "...",
  expires_in: 3600,
  expires_at: 1234567890,
  token_type: "bearer"
}

// Expected by Supabase SDK
{
  access_token: "...",
  refresh_token: "...",
  expires_in: 3600,
  expires_at: 1234567890,
  token_type: "bearer",
  user: {
    id: "...",
    email: "...",
    // ...etc
  }
}
```

When `useAuth.ts:26` calls `supabase.auth.getSession()`, it reads from localStorage but the incomplete session causes it to return `null`.

## Proposed Solution

**Option A: Let Supabase SDK Handle Token Exchange (Recommended)**

Instead of manually storing a partial session, let the Supabase SDK handle the URL tokens natively. The issue is that `detectSessionInUrl: true` doesn't work with HashRouter's `/#/` prefix.

**Fix**: Move tokens from hash to a format Supabase can detect, OR trigger `setSession()` with the tokens.

**Option B: Decode JWT to Extract User Info**

Parse the JWT access_token to extract the user object (JWTs contain the user data in the payload).

## Implementation Plan

### Phase 1: Add Debug Logging

Before fixing, add comprehensive logging to understand exactly what's happening:

**Files to modify:**
- [index.html](index.html) - Log token detection and storage
- [src/hooks/useAuth.ts](src/hooks/useAuth.ts) - Log session retrieval
- [src/lib/supabase.ts](src/lib/supabase.ts) - Log auth events

```typescript
// useAuth.ts - Add logging
const initAuth = async () => {
  console.log('[Auth] Checking localStorage:', localStorage.getItem('avatarz-auth'))
  console.log('[Auth] Current URL hash:', window.location.hash)

  const { data: { session }, error } = await supabase.auth.getSession()
  console.log('[Auth] getSession result:', { session, error })
  // ...
}
```

```javascript
// index.html - Add logging
console.log('[PreAuth] Hash detected:', hash);
console.log('[PreAuth] Storing session:', JSON.stringify(session));
```

### Phase 2: Fix Session Storage

**Approach**: Use `supabase.auth.setSession()` instead of raw localStorage, which properly establishes the session including fetching user data.

**Option 2A: Defer to React app**

Instead of storing in localStorage, pass tokens via a different mechanism and let the React app call `setSession()`:

```javascript
// index.html - Store tokens temporarily
if (accessToken && refreshToken) {
  sessionStorage.setItem('pending-auth-tokens', JSON.stringify({
    access_token: accessToken,
    refresh_token: refreshToken
  }));
  window.location.replace(window.location.pathname + '#/');
}
```

```typescript
// useAuth.ts - Check for pending tokens on mount
useEffect(() => {
  const pendingTokens = sessionStorage.getItem('pending-auth-tokens');
  if (pendingTokens) {
    sessionStorage.removeItem('pending-auth-tokens');
    const { access_token, refresh_token } = JSON.parse(pendingTokens);
    supabase.auth.setSession({ access_token, refresh_token });
  }
}, []);
```

**Option 2B: Decode JWT and build full session**

Parse the JWT to extract user info and store complete session:

```javascript
// index.html - Decode JWT and build full session
function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
  return JSON.parse(jsonPayload);
}

if (accessToken && refreshToken) {
  var payload = parseJwt(accessToken);
  var session = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: parseInt(expiresIn || '3600'),
    expires_at: Math.floor(Date.now() / 1000) + parseInt(expiresIn || '3600'),
    token_type: tokenType || 'bearer',
    user: {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      aud: payload.aud,
      // Supabase stores user nested in the session
    }
  };
  localStorage.setItem('avatarz-auth', JSON.stringify(session));
  window.location.replace(window.location.pathname + '#/');
}
```

### Phase 3: Test & Verify

1. Clear localStorage and test fresh invite flow
2. Verify session is properly established
3. Confirm user lands on authenticated home page
4. Test token refresh works correctly

## Acceptance Criteria

- [ ] User clicking invite magic link lands on authenticated home page
- [ ] Session is properly stored with user object
- [ ] Token refresh continues to work
- [ ] Debug logging helps diagnose any remaining issues
- [ ] No regression in regular OTP login flow

## Files to Modify

| File | Changes |
|------|---------|
| [index.html](index.html) | Fix session storage format, add logging |
| [src/hooks/useAuth.ts](src/hooks/useAuth.ts) | Add debug logging, handle pending tokens |
| [src/lib/supabase.ts](src/lib/supabase.ts) | Optional: add auth event logging |

## Testing Plan

1. **Manual Testing**:
   - Generate invite code
   - Redeem invite with test email
   - Click magic link in email
   - Verify auto-login to home page

2. **Console Verification**:
   - Check debug logs show token detection
   - Verify session stored correctly
   - Confirm `getSession()` returns valid session

## References

- [Supabase Session Docs](https://supabase.com/docs/guides/auth/sessions)
- [Supabase JS SDK](https://supabase.com/docs/reference/javascript/auth-getsession)
- Recent fix commit: `d1dc88d`
