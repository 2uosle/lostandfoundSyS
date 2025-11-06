import { promises as fs } from 'fs';
import path from 'path';

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const JPEG_MAGIC = Buffer.from([0xFF, 0xD8, 0xFF]);

/**
 * Sanitize filename to prevent path traversal attacks
 */
export function sanitizeFilename(filename: string): string {
  // Remove Windows drive letters first (C:, D:, etc.)
  const cleaned = filename.replace(/^[a-zA-Z]:/, '');
  
  // Split by both forward slashes and backslashes to get path components
  const parts = cleaned.split(/[/\\]+/);
  
  // Get the last component (actual filename)
  let base = parts[parts.length - 1] || '';
  
  // Remove path traversal sequences
  base = base.replace(/\.\./g, '');
  
  // Remove any remaining non-alphanumeric characters except dots and dashes
  return base.replace(/[^a-zA-Z0-9.-]/g, '_');
}

/**
 * Validate image file by checking magic numbers
 */
export async function validateImageMagicNumber(
  filePath: string,
  expectedType: 'png' | 'jpeg'
): Promise<boolean> {
  try {
    const buffer = await fs.readFile(filePath);
    
    if (expectedType === 'png') {
      // Check first 8 bytes for PNG signature
      return buffer.slice(0, 8).equals(PNG_MAGIC);
    }
    
    if (expectedType === 'jpeg') {
      // Check first 3 bytes for JPEG signature
      return buffer.slice(0, 3).equals(JPEG_MAGIC);
    }
    
    return false;
  } catch (error) {
    console.error('Error validating image magic number:', error);
    return false;
  }
}

/**
 * Validate base64 image data
 */
export function validateBase64Image(base64Data: string): {
  valid: boolean;
  type?: 'png' | 'jpeg';
  ext?: string;
  buffer?: Buffer;
} {
  const matches = /^data:image\/(png|jpeg);base64,(.+)$/.exec(base64Data);
  
  if (!matches) {
    return { valid: false };
  }
  
  const type = matches[1] as 'png' | 'jpeg';
  const ext = type === 'jpeg' ? 'jpg' : type;
  const b64 = matches[2];
  
  try {
    const buffer = Buffer.from(b64, 'base64');
    
    // Verify magic numbers in the decoded buffer
    if (type === 'png' && !buffer.slice(0, 8).equals(PNG_MAGIC)) {
      return { valid: false };
    }
    
    if (type === 'jpeg' && !buffer.slice(0, 3).equals(JPEG_MAGIC)) {
      return { valid: false };
    }
    
    return { valid: true, type, ext, buffer };
  } catch (error) {
    return { valid: false };
  }
}

/**
 * Save validated image to disk
 */
export async function saveValidatedImage(
  base64Data: string,
  itemId: string,
  uploadsDir: string
): Promise<string> {
  const validation = validateBase64Image(base64Data);
  
  if (!validation.valid || !validation.buffer || !validation.ext) {
    throw new Error('Invalid image data');
  }
  
  // Sanitize filename
  const filename = sanitizeFilename(`${itemId}.${validation.ext}`);
  const outPath = path.join(uploadsDir, filename);
  
  // Ensure uploads directory exists
  await fs.mkdir(uploadsDir, { recursive: true });
  
  // Write file
  await fs.writeFile(outPath, validation.buffer);
  
  // Verify written file has correct magic numbers
  const isValid = await validateImageMagicNumber(outPath, validation.type!);
  
  if (!isValid) {
    // Delete invalid file
    await fs.unlink(outPath).catch(() => {});
    throw new Error('Image validation failed after save');
  }
  
  return `/uploads/${filename}`;
}
