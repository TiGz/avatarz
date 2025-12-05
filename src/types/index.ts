// Types for dynamic options fetched from API
export interface CategoryOption {
  id: string
  label: string
  emoji: string
  description: string
}

// Option for radio/select input fields
export interface InputFieldOption {
  value: string
  label: string
  prompt: string  // The actual text injected into the prompt
}

// Dynamic input field for parameterized styles
export interface InputField {
  id: string
  label: string
  required: boolean
  placeholder?: string
  type?: 'text' | 'radio' | 'select'  // Default: 'text'
  defaultValue?: string
  options?: InputFieldOption[]  // For radio/select types
}

// Schema for dynamic inputs
export interface InputSchema {
  fields: InputField[]
}

export interface StyleOption {
  id: string
  categoryId: string
  label: string
  emoji: string
  prompt?: string  // Optional now - not always returned from API
  // New fields for multi-photo and parameterized styles
  useLegacyOptions: boolean        // true = show crop/age/background/name options
  inputSchema: InputSchema | null  // null = no dynamic inputs
  minPhotos: number                // 1-6
  maxPhotos: number                // 1-6
}

export interface NamePlacementOption {
  id: string
  label: string
  description: string
}

export interface CropTypeOption {
  id: string
  label: string
  description: string
}

export interface AvatarOptions {
  categories: CategoryOption[]
  // Note: styles are lazy-loaded per category via useStylesForCategory hook
  namePlacements: NamePlacementOption[]
  cropTypes: CropTypeOption[]
}

// Wizard state
export interface WizardState {
  imageData: string | null
  category: string
  style: string
  customStyle: string
  cropType: string
  showName: boolean
  name: string
  namePlacement: string
  customPlacement: string
  generatedImage: string | null
  isPublic: boolean
  shareUrl: string | null
  // Generation options (standard mode only - when use_legacy_options=true)
  keepBackground: boolean
  ageModification: 'normal' | 'younger' | 'older'
  customTextEnabled: boolean
  customText: string
  // Multi-photo support
  selectedPhotoIds: string[]  // Array of photo IDs for multi-photo styles
  selectedPhotos: Array<{ id: string; url: string }>  // Photo data for thumbnails
  // Dynamic inputs (for styles with input_schema)
  inputValues: Record<string, string>
}

// API request/response types
export interface GenerateAvatarRequest {
  imageData: string
  style: string
  customStyle?: string
  cropType: string
  name?: string
  namePlacement?: string
  customPlacement?: string
}

export interface GenerateAvatarResponse {
  success: boolean
  image?: string
  error?: string
}

// Database types
export interface Profile {
  id: string
  email: string
  is_admin: boolean
  created_at: string
}

export interface AllowlistEntry {
  id: string
  email: string
  created_at: string
}

// Photo library types
export interface Photo {
  id: string
  user_id: string
  storage_path: string
  filename: string
  mime_type: string
  file_size: number
  created_at: string
  url?: string // Signed URL for display
}

// Generation types
export interface Generation {
  id: string
  user_id: string
  input_photo_id: string | null
  output_storage_path: string
  thumbnail_storage_path: string | null
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
  is_public: boolean
  share_url: string | null
  created_at: string
  url?: string // Signed URL for full-resolution display
  thumbnailUrl?: string // Signed URL for thumbnail display
}

// Quota types
export interface UserQuota {
  tier: string
  limit: number
  used: number
  remaining: number
  is_admin: boolean
}

// Invite quota types
export interface InviteQuota {
  can_create: boolean
  tier: string
  limit?: number
  used?: number
  remaining?: number
  reason?: string
}

// Invite code types
export interface InviteCode {
  invite_id: string
  invite_code: string
  invite_created_at: string
  invite_expires_at: string
  invite_is_redeemed: boolean
  invite_redeemed_email: string | null
  invite_redeemed_at: string | null
}

// User tier types
export type UserTier = 'admin' | 'premium' | 'standard'

export interface UserTierInfo {
  id: string
  label: string
  daily_generation_limit: number
  daily_invite_limit: number
  can_create_invites: boolean
  sort_order: number
}

// Admin stats types (prefixed column names from SQL function)
export interface UserStats {
  stat_user_id: string
  stat_email: string
  stat_is_admin: boolean
  stat_tier: string
  stat_total_generations: number
  stat_total_cost: number
  stat_generations_today: number
  stat_last_generation_at: string | null
  stat_created_at: string
}

export interface RecentGeneration {
  gen_id: string
  user_email: string
  gen_style: string
  gen_crop_type: string
  gen_name_text: string | null
  gen_prompt_tokens: number | null
  gen_completion_tokens: number | null
  gen_total_tokens: number | null
  gen_cost_usd: number | null
  gen_created_at: string
}

// Extended wizard state to support photo library
export interface WizardStateExtended extends WizardState {
  inputPhotoId?: string | null
  inputPhotoPath?: string | null
}
