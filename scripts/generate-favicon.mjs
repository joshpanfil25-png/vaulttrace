import sharp from 'sharp'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_DIR = join(__dirname, '../src/app')

// SVG source — amber-to-orange gradient rounded square with white "V"
const makeSvg = (size) => {
  const radius = Math.round(size * 0.22)
  const fontSize = Math.round(size * 0.52)
  const baseline = Math.round(size * 0.69)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#ea580c"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#g)"/>
  <text
    x="${size / 2}"
    y="${baseline}"
    font-family="system-ui,-apple-system,'Helvetica Neue',Arial,sans-serif"
    font-weight="700"
    font-size="${fontSize}"
    fill="white"
    text-anchor="middle"
  >V</text>
</svg>`
}

// Build a valid ICO file wrapping a single PNG image
function buildIco(pngBuffer) {
  const HEADER_SIZE = 6
  const DIR_ENTRY_SIZE = 16
  const dataOffset = HEADER_SIZE + DIR_ENTRY_SIZE

  const header = Buffer.alloc(HEADER_SIZE)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: 1 = icon
  header.writeUInt16LE(1, 4) // image count: 1

  const dir = Buffer.alloc(DIR_ENTRY_SIZE)
  dir.writeUInt8(32, 0)                        // width  (32px)
  dir.writeUInt8(32, 1)                        // height (32px)
  dir.writeUInt8(0, 2)                         // color count (0 = no palette)
  dir.writeUInt8(0, 3)                         // reserved
  dir.writeUInt16LE(1, 4)                      // color planes
  dir.writeUInt16LE(32, 6)                     // bits per pixel
  dir.writeUInt32LE(pngBuffer.length, 8)       // size of image data
  dir.writeUInt32LE(dataOffset, 12)            // offset of image data

  return Buffer.concat([header, dir, pngBuffer])
}

async function main() {
  // 32×32 PNG for favicon.ico
  const png32 = await sharp(Buffer.from(makeSvg(32)))
    .resize(32, 32)
    .png()
    .toBuffer()

  // 192×192 PNG for icon.png (used by Next.js as the app icon)
  const png192 = await sharp(Buffer.from(makeSvg(192)))
    .resize(192, 192)
    .png()
    .toBuffer()

  writeFileSync(join(APP_DIR, 'favicon.ico'), buildIco(png32))
  console.log('✓ src/app/favicon.ico  (32×32)')

  writeFileSync(join(APP_DIR, 'icon.png'), png192)
  console.log('✓ src/app/icon.png     (192×192)')
}

main().catch((err) => { console.error(err); process.exit(1) })
