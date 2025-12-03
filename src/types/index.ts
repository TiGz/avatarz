// Style options for avatar generation
export const STYLES = [
  'cartoon', 'realistic', 'anime', 'pixel-art', 'watercolor',
  'oil-painting', 'cyberpunk', 'vintage', 'pop-art', 'custom'
] as const
export type Style = typeof STYLES[number]

// Body crop options
export const CROP_TYPES = ['headshot', 'half', 'full'] as const
export type CropType = typeof CROP_TYPES[number]

// Name placement options
export const NAME_PLACEMENTS = ['graffiti', 'headband', 'necklace', 'corner', 'custom'] as const
export type NamePlacement = typeof NAME_PLACEMENTS[number]

// Wizard state
export interface WizardState {
  imageData: string | null
  style: Style
  customStyle: string
  cropType: CropType
  showName: boolean
  name: string
  namePlacement: NamePlacement
  customPlacement: string
  generatedImage: string | null
}

// API request/response types
export interface GenerateAvatarRequest {
  imageData: string
  style: Style | string
  customStyle?: string
  cropType: CropType
  name?: string
  namePlacement?: NamePlacement | string
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
