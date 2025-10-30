import { describe, it, expect } from 'vitest';
import { calculateMatchScore, findMatchesForLostItem, type LostItemMatch, type FoundItemMatch } from '../src/lib/matching';

function d(s: string) {
  return new Date(s);
}

describe('matching.ts', () => {
  it('scores high for same category and strong textual overlap with color/brand/number/location/date', () => {
    const lost: LostItemMatch = {
      id: 'L1',
      title: 'Lost iPhone 13 black',
      description: 'I lost my black Apple iPhone 13 near the lib',
      category: 'Electronics',
      location: 'lib',
      lostDate: d('2025-10-10'),
    };
    const found: FoundItemMatch = {
      id: 'F1',
      title: 'Found black iPhone 13',
      description: 'Apple phone picked up beside the library entrance',
      category: 'Electronics',
      location: 'library entrance',
      foundDate: d('2025-10-11'),
    };

    const res = calculateMatchScore(lost, found);
    expect(res.score).toBeGreaterThan(70);
    expect(res.breakdown.locationMatch).toBeGreaterThanOrEqual(8);
    expect(res.breakdown.dateProximity).toBeGreaterThanOrEqual(8);
    expect(res.breakdown.colorMatch ?? 0).toBeGreaterThan(0);
    expect(res.breakdown.brandMatch ?? 0).toBeGreaterThan(0);
    expect(res.breakdown.numberMatch ?? 0).toBeGreaterThan(0);
  });

  it('rewards cross-field matches and combined similarity for split details', () => {
    const lost: LostItemMatch = {
      id: 'L2',
      title: 'Lost laptop',
      description: 'Dell XPS 13 silver ultrabook',
      category: 'Electronics',
      location: 'classroom 204',
      lostDate: d('2025-10-01'),
    };
    const found: FoundItemMatch = {
      id: 'F2',
      title: 'Silver laptop found',
      description: 'Dell XPS 13 from room 204',
      category: 'Electronics',
      location: 'rm 204',
      foundDate: d('2025-10-02'),
    };

    const res = calculateMatchScore(lost, found);
    expect(res.breakdown.crossFieldBonus ?? 0).toBeGreaterThan(0);
    expect(res.breakdown.combinedSimilarity ?? 0).toBeGreaterThan(2);
    expect(res.breakdown.locationMatch).toBeGreaterThanOrEqual(7);
    expect(res.score).toBeGreaterThan(65);
  });

  it('understands location synonyms (lib vs library)', () => {
    const lost: LostItemMatch = {
      id: 'L3',
      title: 'Lost notebook',
      description: 'Paper notebook',
      category: 'Stationery',
      location: 'lib',
      lostDate: d('2025-10-05'),
    };
    const found: FoundItemMatch = {
      id: 'F3',
      title: 'Found notebook',
      description: 'Found paper notebook by study hall',
      category: 'Stationery',
      location: 'library study hall',
      foundDate: d('2025-10-05'),
    };

    const res = calculateMatchScore(lost, found);
    expect(res.breakdown.locationMatch).toBe(10);
  });

  it('gives low date proximity when far apart', () => {
    const lost: LostItemMatch = {
      id: 'L4',
      title: 'Black umbrella',
      description: 'Simple black umbrella',
      category: 'Accessories',
      location: 'cafeteria',
      lostDate: d('2025-08-01'),
    };
    const found: FoundItemMatch = {
      id: 'F4',
      title: 'Black umbrella',
      description: 'Left near dining hall',
      category: 'Accessories',
      location: 'dining hall',
      foundDate: d('2025-10-01'),
    };

    const res = calculateMatchScore(lost, found);
    expect(res.breakdown.dateProximity).toBeLessThanOrEqual(3);
  });

  it('keeps scores low for mismatched category and semantics', () => {
    const lost: LostItemMatch = {
      id: 'L5',
      title: 'Red backpack',
      description: 'Large red backpack with patches',
      category: 'Bags',
      location: 'gym',
      lostDate: d('2025-10-12'),
    };
    const found: FoundItemMatch = {
      id: 'F5',
      title: 'Black iPhone',
      description: 'Found a black phone near court',
      category: 'Electronics',
      location: 'basketball court',
      foundDate: d('2025-10-12'),
    };

    const res = calculateMatchScore(lost, found);
    expect(res.score).toBeLessThan(20);
  });

  it('ranks the best match highest among multiple candidates', () => {
    const lost: LostItemMatch = {
      id: 'L6',
      title: 'Blue water bottle',
      description: 'Blue stainless steel bottle with dents',
      category: 'Accessories',
      location: 'gym',
      lostDate: d('2025-10-18'),
    };

    const candidates: FoundItemMatch[] = [
      {
        id: 'F6-1',
        title: 'Water bottle',
        description: 'Generic bottle found in hallway',
        category: 'Accessories',
        location: 'hallway',
        foundDate: d('2025-10-18'),
      },
      {
        id: 'F6-2',
        title: 'Blue bottle',
        description: 'Blue steel bottle left in gym',
        category: 'Accessories',
        location: 'gymnasium',
        foundDate: d('2025-10-19'),
      },
      {
        id: 'F6-3',
        title: 'Phone case',
        description: 'Black phone case',
        category: 'Electronics',
        location: 'library',
        foundDate: d('2025-10-18'),
      },
    ];

    const ranked = findMatchesForLostItem(lost, candidates, 3, 0);
    expect(ranked[0].item.id).toBe('F6-2');
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });
});
