import { describe, it, expect } from 'vitest';
import { validateBase64Image, sanitizeFilename } from '@/lib/image-validation';

describe('Image Validation', () => {
  describe('validateBase64Image', () => {
    it('should validate a valid PNG image', () => {
      // PNG magic number: 89 50 4E 47 0D 0A 1A 0A
      const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      const base64 = `data:image/png;base64,${pngHeader.toString('base64')}`;
      
      const result = validateBase64Image(base64);
      
      expect(result.valid).toBe(true);
      expect(result.type).toBe('png');
      expect(result.ext).toBe('png');
    });

    it('should validate a valid JPEG image', () => {
      // JPEG magic number: FF D8 FF
      const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
      const base64 = `data:image/jpeg;base64,${jpegHeader.toString('base64')}`;
      
      const result = validateBase64Image(base64);
      
      expect(result.valid).toBe(true);
      expect(result.type).toBe('jpeg');
      expect(result.ext).toBe('jpg');
    });

    it('should reject invalid base64 format', () => {
      const result = validateBase64Image('not-a-valid-data-url');
      
      expect(result.valid).toBe(false);
    });

    it('should reject wrong mime type', () => {
      const result = validateBase64Image('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=');
      
      expect(result.valid).toBe(false);
    });

    it('should reject image with mismatched magic numbers', () => {
      // JPEG header but claiming to be PNG
      const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF]);
      const base64 = `data:image/png;base64,${jpegHeader.toString('base64')}`;
      
      const result = validateBase64Image(base64);
      
      expect(result.valid).toBe(false);
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove path traversal attempts', () => {
      expect(sanitizeFilename('../../etc/passwd')).toBe('passwd');
      expect(sanitizeFilename('../../../secret.txt')).toBe('secret.txt');
    });

    it('should replace special characters with underscores', () => {
      expect(sanitizeFilename('file<script>.png')).toBe('file_script_.png');
      expect(sanitizeFilename('file|name*.jpg')).toBe('file_name_.jpg');
    });

    it('should preserve valid filenames', () => {
      expect(sanitizeFilename('image-123.png')).toBe('image-123.png');
      expect(sanitizeFilename('photo.2024.jpg')).toBe('photo.2024.jpg');
    });

    it('should handle Windows-style paths', () => {
      expect(sanitizeFilename('C:\\Windows\\System32\\file.exe')).toBe('file.exe');
    });
  });
});
