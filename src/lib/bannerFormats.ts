// Shared banner format configuration
// Used by both CustomFlow (GenerateStep) and WallpaperPage
//
// All banners use 16:9 to minimize cropping (2K = 2048x1152)
// safeZone = what we tell AI (smaller than actual keep % for safety margin)
// LinkedIn: keep 44%, tell 35% | Twitter: keep 59%, tell 50% | Facebook: keep 66%, tell 55%

export type BannerFormat = 'linkedin' | 'twitter' | 'facebook' | 'youtube'

export interface BannerConfig {
  label: string
  width: number
  height: number
  geminiRatio: '4:3' | '3:4' | '16:9' | '1:1'
  safeZone: number  // What we tell AI (smaller than actual for safety margin)
}

export const BANNER_FORMATS: Record<BannerFormat, BannerConfig> = {
  linkedin: { label: 'LinkedIn', width: 1584, height: 396, geminiRatio: '16:9', safeZone: 35 },
  twitter: { label: 'X / Twitter', width: 1500, height: 500, geminiRatio: '16:9', safeZone: 50 },
  facebook: { label: 'Facebook', width: 851, height: 315, geminiRatio: '16:9', safeZone: 55 },
  youtube: { label: 'YouTube', width: 2560, height: 1440, geminiRatio: '16:9', safeZone: 100 },
}

export function isBannerFormat(ratio: string): ratio is BannerFormat {
  return ratio in BANNER_FORMATS
}

// Generate banner-specific prompt with safe zone instructions
export function getBannerPrompt(safeZonePercent: number): string {
  const safeZoneInstructions = safeZonePercent < 100
    ? `

CRITICAL COMPOSITION CONSTRAINT:
This image will be cropped to a wide banner format.
The TOP ${Math.round((100 - safeZonePercent) / 2)}% and BOTTOM ${Math.round((100 - safeZonePercent) / 2)}% of the image will be REMOVED.
Keep ALL important content (faces, text, key elements) strictly within the CENTER ${safeZonePercent}% vertical band.
The top and bottom zones should contain ONLY background elements (sky, ground, gradients) that can be safely cropped.
Do NOT place any faces, text, or focal points near the top or bottom edges.
IMPORTANT: Create ONE continuous, unified composition—do NOT create distinct horizontal bands or sharp divisions between zones. The background should flow naturally as a single cohesive scene.`
    : '' // YouTube is 16:9, no cropping needed

  return `Transform this into a wide social media banner.

COMPOSITION:
- Position the subject on the RIGHT side, occupying ~30% of the width
- The LEFT 70% is for background and text elements
- Show the complete subject (head to toe) scaled to fit within the middle band and clear of the top and bottom bands that will be cropped later

TEXT & GRAFFITI:
- If the original image contains text, graffiti, or name lettering, RECREATE it in the same style on the LEFT side
- The text should be prominent and readable
- Match the original text style exactly

STYLE:
- Maintain the original art style, colors, and mood
- Seamlessly extend background elements across the wide format${safeZoneInstructions}`
}
