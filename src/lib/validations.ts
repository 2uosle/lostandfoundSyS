import { z } from 'zod';

// Environment variables validation
export const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// User validation
export const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(1).max(100).optional(),
  role: z.enum(['ADMIN', 'STUDENT']).default('STUDENT'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Item validation
const itemCategories = ['electronics', 'clothing', 'accessories', 'documents', 'other'] as const;

export const lostItemSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000, 'Description too long'),
  category: z.enum(itemCategories),
  location: z.string().min(1).max(200).optional(),
  contactInfo: z.string().min(3, 'Contact info is required').max(200),
  lostDate: z.coerce.date().refine(date => date <= new Date(), 'Date cannot be in the future'),
  imageUrl: z.string().url().optional(),
  userId: z.string().optional(),
});

export const foundItemSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000, 'Description too long'),
  category: z.enum(itemCategories),
  location: z.string().min(1, 'Location is required').max(200),
  contactInfo: z.string().min(3, 'Contact info is required').max(200),
  foundDate: z.coerce.date().refine(date => date <= new Date(), 'Date cannot be in the future'),
  imageUrl: z.string().url().optional(),
  userId: z.string().optional(),
});

// Image upload validation
export const imageUploadSchema = z.object({
  image: z.string().regex(/^data:image\/(png|jpeg);base64,/, 'Invalid image format')
    .refine(
      (data) => {
        const base64 = data.split(',')[1];
        const sizeInBytes = (base64.length * 3) / 4;
        return sizeInBytes <= 3 * 1024 * 1024; // 3MB
      },
      'Image must be under 3MB'
    )
    .optional(),
});

// Admin actions validation
export const adminActionSchema = z.object({
  action: z.enum(['claim', 'archive', 'match', 'delete', 'donate', 'dispose', 'restore', 'handoff']),
  itemId: z.string().min(1, 'Item ID is required'),
  itemType: z.enum(['LOST', 'FOUND']).default('LOST'),
  matchWithId: z.string().optional(),
}).refine(
  (data) => {
    if (data.action === 'match' && !data.matchWithId) {
      return false;
    }
    return true;
  },
  { message: 'matchWithId is required for match action', path: ['matchWithId'] }
);

// Match request validation
export const matchRequestSchema = z.object({
  type: z.enum(['lost', 'found']),
  id: z.string().min(1, 'ID is required'),
});

// Pagination validation
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().max(200).optional(),
  category: z.enum([...itemCategories, 'all']).default('all'),
  status: z.enum(['PENDING', 'MATCHED', 'CLAIMED', 'ARCHIVED', 'DONATED', 'DISPOSED', 'all']).default('all'),
});

export type UserInput = z.infer<typeof userSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type LostItemInput = z.infer<typeof lostItemSchema>;
export type FoundItemInput = z.infer<typeof foundItemSchema>;
export type AdminAction = z.infer<typeof adminActionSchema>;
export type MatchRequest = z.infer<typeof matchRequestSchema>;
export type PaginationParams = z.infer<typeof paginationSchema>;

