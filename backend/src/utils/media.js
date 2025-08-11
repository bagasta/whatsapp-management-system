import sharp from 'sharp';

const MAX_WIDTH = parseInt(process.env.IMG_MAX_WIDTH || '1280', 10);
const QUALITY = parseInt(process.env.IMG_QUALITY || '70', 10);

export async function maybeCompressImage(media) {
  try {
    if (!media || !media.mimetype || !media.data) return media;
    if (!media.mimetype.startsWith('image/')) return media;

    const input = Buffer.from(media.data, 'base64');
    const image = sharp(input);
    const meta = await image.metadata();

    let pipeline = image;
    if ((meta.width || 0) > MAX_WIDTH) {
      pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
    }

    // Prefer JPEG for size; keep PNG if transparency detected
    if (meta.hasAlpha) {
      const out = await pipeline.png({ compressionLevel: 9 }).toBuffer();
      return { ...media, mimetype: 'image/png', data: out.toString('base64') };
    } else {
      const out = await pipeline.jpeg({ quality: QUALITY }).toBuffer();
      return { ...media, mimetype: 'image/jpeg', data: out.toString('base64') };
    }
  } catch (e) {
    // If compression fails, return original media
    return media;
  }
}
