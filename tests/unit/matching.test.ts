import { describe, it, expect } from 'vitest';
import {
  calculateMatchScore,
  findMatchesForLostItem,
  findMatchesForFoundItem,
} from '@/lib/matching';

describe('Matching Algorithm', () => {
  describe('calculateMatchScore', () => {
    it('should give perfect score for identical items', () => {
      const lost = {
        id: '1',
        title: 'Blue Nike Backpack',
        description: 'Lost near the library',
        category: 'accessories',
        location: 'Library',
        lostDate: new Date('2025-10-25'),
      };

      const found = {
        id: '2',
        title: 'Blue Nike Backpack',
        description: 'Found near the library',
        category: 'accessories',
        location: 'Library',
        foundDate: new Date('2025-10-25'),
      };

      const match = calculateMatchScore(lost, found);
      
      expect(match.score).toBeGreaterThan(90); // Very high score
      expect(match.breakdown.categoryMatch).toBe(40); // Category worth 40 points
    });

    it('should give zero score for different categories', () => {
      const lost = {
        id: '1',
        title: 'Laptop',
        description: 'MacBook Pro',
        category: 'electronics',
        location: 'Library',
        lostDate: new Date('2025-10-25'),
      };

      const found = {
        id: '2',
        title: 'Umbrella',
        description: 'Black umbrella',
        category: 'accessories',
        location: 'Library',
        foundDate: new Date('2025-10-25'),
      };

      const match = calculateMatchScore(lost, found);
      
      expect(match.breakdown.categoryMatch).toBe(0);
      expect(match.score).toBeLessThan(50); // Low score without category match
    });

    it('should handle location synonyms', () => {
      const lost = {
        id: '1',
        title: 'Water Bottle',
        description: 'Blue water bottle',
        category: 'accessories',
        location: 'basketball court',
        lostDate: new Date('2025-10-25'),
      };

      const found = {
        id: '2',
        title: 'Water Bottle',
        description: 'Blue water bottle',
        category: 'accessories',
        location: 'bball court', // Abbreviated
        foundDate: new Date('2025-10-25'),
      };

      const match = calculateMatchScore(lost, found);
      
      expect(match.breakdown.locationMatch).toBeGreaterThan(7); // Should recognize synonym
    });

    it('should penalize large time gaps', () => {
      const lost = {
        id: '1',
        title: 'Phone',
        description: 'iPhone 13',
        category: 'electronics',
        location: 'Cafeteria',
        lostDate: new Date('2025-09-01'), // 54 days ago
      };

      const found = {
        id: '2',
        title: 'Phone',
        description: 'iPhone 13',
        category: 'electronics',
        location: 'Cafeteria',
        foundDate: new Date('2025-10-25'),
      };

      const match = calculateMatchScore(lost, found);
      
      expect(match.breakdown.dateProximity).toBe(0); // > 45 days
    });

    it('should handle cross-field matching (title keywords in description)', () => {
      const lost = {
        id: '1',
        title: 'Red Wallet',
        description: 'Lost my leather wallet with student ID',
        category: 'accessories',
        location: 'Library',
        lostDate: new Date('2025-10-25'),
      };

      const found = {
        id: '2',
        title: 'Leather Wallet',
        description: 'Found a red wallet near the entrance',
        category: 'accessories',
        location: 'Library',
        foundDate: new Date('2025-10-25'),
      };

      const match = calculateMatchScore(lost, found);
      
      // "wallet" appears in both titles
      // "red" from lost.title appears in found.description
      // "leather" from found.title appears in lost.description
      expect(match.score).toBeGreaterThan(85); // High cross-field bonus
    });
  });

  describe('findMatchesForLostItem', () => {
    it('should prioritize items in the same category', () => {
      const lostItem = {
        id: '1',
        title: 'Blue Backpack',
        description: 'Nike backpack',
        category: 'accessories',
        location: 'Library',
        lostDate: new Date('2025-10-25'),
      };

      const foundItems = [
        {
          id: '2',
          title: 'Red Phone',
          description: 'iPhone',
          category: 'electronics',
          location: 'Library',
          foundDate: new Date('2025-10-25'),
        },
        {
          id: '3',
          title: 'Blue Backpack',
          description: 'Nike backpack',
          category: 'accessories',
          location: 'Library',
          foundDate: new Date('2025-10-25'),
        },
      ];

      const matches = findMatchesForLostItem(lostItem, foundItems, 10, 20);
      
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].item.id).toBe('3'); // Same category item should rank first
      expect(matches[0].score).toBeGreaterThan(matches[1]?.score || 0);
    });

    it('should filter by minimum score threshold', () => {
      const lostItem = {
        id: '1',
        title: 'Laptop',
        description: 'MacBook Pro 15 inch',
        category: 'electronics',
        location: 'Library',
        lostDate: new Date('2025-10-25'),
      };

      const foundItems = [
        {
          id: '2',
          title: 'Completely Different Item',
          description: 'Nothing in common',
          category: 'clothing',
          location: 'Gym',
          foundDate: new Date('2025-09-01'),
        },
      ];

      const matches = findMatchesForLostItem(lostItem, foundItems, 10, 50); // High threshold
      
      expect(matches.length).toBe(0); // Should filter out low-scoring matches
    });

    it('should respect result limit', () => {
      const lostItem = {
        id: '1',
        title: 'Wallet',
        description: 'Black wallet',
        category: 'accessories',
        location: 'Library',
        lostDate: new Date('2025-10-25'),
      };

      const foundItems = Array.from({ length: 20 }, (_, i) => ({
        id: `${i + 2}`,
        title: `Wallet ${i}`,
        description: 'Found wallet',
        category: 'accessories',
        location: 'Library',
        foundDate: new Date('2025-10-25'),
      }));

      const matches = findMatchesForLostItem(lostItem, foundItems, 5, 20); // Limit to 5
      
      expect(matches.length).toBeLessThanOrEqual(5);
    });
  });
});
