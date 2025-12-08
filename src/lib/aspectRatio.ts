// Converts aspect ratio strings to CSS aspect-ratio values
// Used for displaying generated images with their correct proportions

export function getAspectRatioCss(ratio?: string | null): string {
  if (!ratio) return '1/1'

  const map: Record<string, string> = {
    '1:1': '1/1',
    '16:9': '16/9',
    '9:16': '9/16',
    '4:3': '4/3',
    '3:4': '3/4',
    // Banner formats - use their actual display ratios
    'linkedin': '4/1',
    'twitter': '3/1',
    'facebook': '820/312',
    'youtube': '16/9',
  }

  return map[ratio] || '1/1'
}
