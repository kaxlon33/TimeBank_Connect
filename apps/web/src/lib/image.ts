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

/** Crops a picture to 4:3 and shrinks it, for a skill photo. Returns a JPEG data address. */
export async function resizeToCover(file: File, width = 960, height = 720): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')
  if (file.size > 10 * 1024 * 1024) throw new Error('That picture is too large. Choose one under 10 MB.')

  const bitmap = await createImageBitmap(file)
  const ratio = width / height
  let sw = bitmap.width
  let sh = sw / ratio
  if (sh > bitmap.height) {
    sh = bitmap.height
    sw = sh * ratio
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Your browser could not process the picture.')
  ctx.drawImage(bitmap, (bitmap.width - sw) / 2, (bitmap.height - sh) / 2, sw, sh, 0, 0, width, height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.82)
}
