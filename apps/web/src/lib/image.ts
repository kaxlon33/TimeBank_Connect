/** Crops a photo to a square and shrinks it so it stays small. Returns a JPEG data address. */
export async function resizeToAvatar(file: File, size = 256): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')
  if (file.size > 8 * 1024 * 1024) throw new Error('That photo is too large. Choose one under 8 MB.')

  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Your browser could not process the photo.')
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.85)
}

/**
 * Which part of a picture to keep. `x` and `y` run from 0 (left / top edge) to 1 (right / bottom edge)
 * and say where the frame sits in the space it can move; `zoom` of 1 shows as much as fits.
 */
export interface Focus {
  x: number
  y: number
  zoom: number
}

export const CENTRE: Focus = { x: 0.5, y: 0.5, zoom: 1 }

/** Checks a chosen skill picture before it is shown in the framer. */
export function checkSkillPicture(file: File): void {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')
  if (file.size > 10 * 1024 * 1024) throw new Error('That picture is too large. Choose one under 10 MB.')
}

/** Crops a picture to 4:3 around the chosen focus and shrinks it, for a skill photo. Returns a JPEG data address. */
export async function cropToCover(file: File, focus: Focus = CENTRE, width = 960, height = 720): Promise<string> {
  checkSkillPicture(file)

  const bitmap = await createImageBitmap(file)
  const ratio = width / height
  // The largest 4:3 window that fits, made smaller by the zoom.
  let sw = bitmap.width
  let sh = sw / ratio
  if (sh > bitmap.height) {
    sh = bitmap.height
    sw = sh * ratio
  }
  const zoom = Math.min(Math.max(focus.zoom, 1), 4)
  sw /= zoom
  sh /= zoom
  const clamp = (v: number) => Math.min(Math.max(v, 0), 1)
  const sx = (bitmap.width - sw) * clamp(focus.x)
  const sy = (bitmap.height - sh) * clamp(focus.y)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Your browser could not process the picture.')
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.82)
}

/** Crops the centre of a picture to 4:3, for a skill photo. */
export async function resizeToCover(file: File, width = 960, height = 720): Promise<string> {
  return cropToCover(file, CENTRE, width, height)
}
