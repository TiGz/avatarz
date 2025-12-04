# Avatarz - AI Avatar Generation App

React SPA for generating stylized avatars from user photos using Gemini API, with Supabase backend.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion
- **UI**: shadcn/ui components, Lucide icons, Sonner toasts
- **Backend**: Supabase (Postgres, Auth, Storage, Edge Functions)
- **AI**: Gemini 3 Pro Image Preview (`gemini-3-pro-image-preview`)
- **Hosting**: GitHub Pages with HashRouter

## Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn components
│   ├── auth/            # LoginForm, AuthGuard
│   ├── admin/           # InviteUser, AllowlistManager, UserStats, RecentGenerations
│   ├── wizard/          # WizardContainer, StepIndicator, steps/
│   ├── gallery/         # AvatarCard, AvatarModal
│   └── photos/          # PhotoGrid, PhotoUploader
├── hooks/
│   ├── useAuth.ts           # Auth state management
│   ├── useAdmin.ts          # Admin role check (uses is_admin() RPC)
│   ├── useWizard.ts         # Wizard state machine
│   ├── usePhotos.ts         # Photo library CRUD
│   ├── useGenerations.ts    # Avatar gallery CRUD
│   ├── useQuota.ts          # Daily generation limit check
│   ├── useAvatarOptions.ts  # Fetch categories, placements, crops
│   ├── useStylesForCategory.ts  # Lazy-load styles per category
│   └── usePublicAvatars.ts  # Public avatar showcase
├── pages/
│   ├── HomePage.tsx
│   ├── WizardPage.tsx
│   ├── AdminPage.tsx
│   ├── PhotoLibraryPage.tsx
│   └── GalleryPage.tsx
├── lib/
│   └── supabase.ts      # Supabase client
└── types/
    └── index.ts         # Type definitions
```

## Database Schema

### Tables
- `allowlist` - Emails allowed to sign up
- `profiles` - User profiles with `is_admin` flag
- `photos` - User photo library (stored in `input-photos` bucket)
- `generations` - Avatar generation records with cost tracking, thumbnails, public flag
- `style_categories` - Category definitions (animated, artistic, professional, etc.)
- `styles` - Individual styles with prompts, linked to categories

### Style Categories & Styles

Styles are database-driven, not hardcoded. Each style contains its own Gemini prompt.

**style_categories:**
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (PK) | Human-readable ID (e.g., 'animated', 'artistic') |
| label | TEXT | Display name |
| emoji | TEXT | Category icon |
| description | TEXT | Brief description |
| sort_order | INTEGER | Display order |
| is_active | BOOLEAN | Soft-delete flag |

**styles:**
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (PK) | Human-readable ID (e.g., 'ghibli', '3d-pixar') |
| category_id | TEXT (FK) | References style_categories(id) |
| label | TEXT | Display name |
| emoji | TEXT | Style icon |
| prompt | TEXT | Full Gemini API prompt for this style |
| sort_order | INTEGER | Display order within category |
| is_active | BOOLEAN | Soft-delete flag |

Both tables have public read RLS (no auth required for viewing).

### Key Functions (SECURITY DEFINER)
- `is_admin(user_id UUID)` - Check if user is admin (bypasses RLS)
- `check_email_allowlisted(email TEXT)` - Check allowlist without exposing data
- `get_user_quota()` - Returns `{limit, used, remaining, is_admin}` for current user
- `get_random_public_avatars(count)` - Returns random public avatars for showcase
- `admin_get_user_stats()` - Returns user statistics (admin only)
- `admin_get_recent_generations(limit, offset)` - Returns all generations (admin only)

### Storage Buckets
- `input-photos` - Private, 10MB max, user photo uploads
- `avatars` - Private, 10MB max, generated full-resolution PNGs
- `avatar-thumbnails` - Private, 512KB max, 300x300 JPEG thumbnails

## Adding New Categories and Styles

Create a migration to add new categories and/or styles:

```bash
# 1. Create migration
supabase migration new add_superhero_styles
```

```sql
-- 2. Add category (in migration SQL)
INSERT INTO public.style_categories (id, label, emoji, description, sort_order)
VALUES ('superhero', 'Superhero', '🦸', 'Comic book heroes', 8);

-- 3. Add styles for the category
INSERT INTO public.styles (id, category_id, label, emoji, prompt, sort_order)
VALUES
  ('marvel-hero', 'superhero', 'Marvel Hero', '🕷️',
   'Transform into a Marvel superhero with dramatic comic book style, bold colors, dynamic pose, and heroic lighting. Maintain recognizable facial features.',
   1),
  ('dc-hero', 'superhero', 'DC Hero', '🦇',
   'Transform into a DC superhero with cinematic dark aesthetic, strong jawline enhancement, cape flowing, gotham-style dramatic shadows.',
   2);
```

```bash
# 4. Deploy
supabase db push
```

**Key points:**
- Use descriptive text IDs (not UUIDs) for readability
- `prompt` is the exact text sent to Gemini - be specific about style and face preservation
- Set `sort_order` to control display sequence
- Set `is_active = false` to hide without deleting
- Frontend caches styles per category - refresh clears cache automatically

## Edge Functions

### generate-avatar
Main generation function that:
1. GET: Returns available categories, styles, placements, crops (no auth)
2. POST: Validates auth and rate limit
3. Fetches style prompt from database (or uses custom prompt)
4. Calls Gemini API with constructed prompt
5. Generates 300x300 thumbnail
6. Stores full image in `avatars` bucket, thumbnail in `avatar-thumbnails`
7. Records generation with token usage and cost

### invite-user
Admin-only function to invite users by email:
1. Validates caller is admin
2. Adds email to allowlist
3. Sends magic link via Supabase Auth

### public-avatars
Unauthenticated endpoint for homepage showcase:
1. Calls `get_random_public_avatars()` RPC
2. Returns signed thumbnail URLs

## Key Patterns

### SECURITY DEFINER for RLS
When RLS policies need to query the same table they're protecting (e.g., "admins can see all profiles"), use SECURITY DEFINER functions to avoid infinite recursion:

```sql
CREATE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$ SELECT COALESCE((SELECT is_admin FROM profiles WHERE id = user_id), false); $$;
```

### Auth Loading Race Condition
useAdmin must wait for useAuth to complete before checking admin status:

```typescript
const { user, loading: authLoading } = useAuth()
const [adminChecked, setAdminChecked] = useState(false)

// Don't check admin until auth is done
if (authLoading) return

const loading = authLoading || !adminChecked
```

### SQL Function Column Prefixing
RETURNS TABLE columns conflict with table columns in PL/pgSQL. Prefix output columns:

```sql
RETURNS TABLE (
  gen_id UUID,        -- not "id"
  stat_user_id UUID   -- not "user_id"
)
```

### Chunked Base64 Encoding
Large arrays cause stack overflow with `String.fromCharCode(...array)`. Use chunks:

```typescript
let binary = ''
const chunkSize = 8192
for (let i = 0; i < uint8Array.length; i += chunkSize) {
  const chunk = uint8Array.subarray(i, i + chunkSize)
  binary += String.fromCharCode(...chunk)
}
```

### Lazy-Loading Styles
Styles are fetched per-category with client-side caching to reduce initial load:

```typescript
// useStylesForCategory.ts - caches styles per category
const { styles } = useStylesForCategory(selectedCategoryId)
```

## Cost Tracking

Gemini pricing (stored per generation):
- Input: $2.00 / 1M tokens
- Output: $12.00 / 1M tokens

Calculated from `usageMetadata` in Gemini response.

## Commands

```bash
# Development
npm run dev

# Build
npm run build

# Supabase
supabase db push              # Apply migrations
supabase functions deploy     # Deploy all functions
supabase functions deploy generate-avatar  # Deploy specific function

# Secrets (stored in Supabase Vault)
supabase secrets set GEMINI_API_KEY=xxx
```

## Environment Variables

```env
VITE_SUPABASE_URL=https://ucgabgrineaweqpjripj.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Admin Access

Admin user: ajchesney@gmail.com (set in `config` table and migration)

Admin features:
- Invite users by email (sends magic link)
- View all generations with costs
- Per-user statistics (generations, cost, last activity)
- Manage allowlist

## Rate Limiting

- 20 generations per day per user (admins unlimited)
- Checked via `get_user_quota()` RPC before generation
- Resets at midnight UTC
