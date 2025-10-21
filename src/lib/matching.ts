import { differenceInDays } from 'date-fns';
import { levenshtein } from './string-utils';

export interface LostItemMatch {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string | null;
  lostDate: Date;
}

export interface FoundItemMatch {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  foundDate: Date;
}

export interface MatchScore {
  item: LostItemMatch | FoundItemMatch;
  score: number;
  breakdown: {
    categoryMatch: number;
    titleSimilarity: number;
    descriptionSimilarity: number;
    dateProximity: number;
    locationMatch: number;
  };
}

/**
 * Common location synonyms and normalizations
 */
const locationSynonyms: { [key: string]: string[] } = {
  'court': ['basketball court', 'tennis court', 'volleyball court', 'badminton court', 'sports court'],
  'gym': ['gymnasium', 'fitness center', 'workout room'],
  'library': ['lib', 'study hall', 'learning center'],
  'cafeteria': ['caf', 'canteen', 'dining hall', 'food court'],
  'parking': ['parking lot', 'parking area', 'car park'],
  'restroom': ['bathroom', 'toilet', 'washroom', 'cr', 'comfort room'],
  'hallway': ['corridor', 'hall', 'passage'],
  'classroom': ['class', 'room'],
  'office': ['admin office', 'faculty office'],
};

/**
 * Normalize location string by expanding abbreviations and handling common variations
 */
function normalizeLocation(location: string): string {
  const normalized = location.toLowerCase().trim();
  
  // Expand common abbreviations
  const expansions: { [key: string]: string } = {
    'bball': 'basketball',
    'vball': 'volleyball',
    'rm': 'room',
    'bldg': 'building',
    'cr': 'comfort room',
    'lib': 'library',
    'caf': 'cafeteria',
    'admin': 'administration',
  };
  
  let expanded = normalized;
  for (const [abbr, full] of Object.entries(expansions)) {
    const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
    expanded = expanded.replace(regex, full);
  }
  
  return expanded;
}

/**
 * Check if two locations are semantically similar
 */
function areLocationsSimilar(loc1: string, loc2: string): boolean {
  const norm1 = normalizeLocation(loc1);
  const norm2 = normalizeLocation(loc2);
  
  // Direct match after normalization
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return true;
  }
  
  // Check synonyms
  for (const [base, synonyms] of Object.entries(locationSynonyms)) {
    const matchesBase1 = norm1.includes(base);
    const matchesBase2 = norm2.includes(base);
    const matchesSynonym1 = synonyms.some(syn => norm1.includes(syn));
    const matchesSynonym2 = synonyms.some(syn => norm2.includes(syn));
    
    if ((matchesBase1 || matchesSynonym1) && (matchesBase2 || matchesSynonym2)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Extract keywords from text (remove common words)
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'i', 'my', 'me', 'have', 'had', 'this',
    'there', 'their', 'they', 'very', 'some', 'can', 'could', 'would',
  ]);
  
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

/**
 * Calculate keyword overlap between two texts
 */
function calculateKeywordOverlap(text1: string, text2: string): number {
  const keywords1 = new Set(extractKeywords(text1));
  const keywords2 = new Set(extractKeywords(text2));
  
  if (keywords1.size === 0 || keywords2.size === 0) return 0;
  
  const intersection = new Set([...keywords1].filter(x => keywords2.has(x)));
  const union = new Set([...keywords1, ...keywords2]);
  
  return intersection.size / union.size; // Jaccard similarity
}

/**
 * Calculate similarity score between two strings with fuzzy matching
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  // Exact match
  if (s1 === s2) return 1;
  
  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.9;
  }
  
  // Calculate Levenshtein distance similarity
  const distance = levenshtein(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  const levenshteinSimilarity = maxLength > 0 ? 1 - (distance / maxLength) : 0;
  
  // Calculate keyword overlap
  const keywordSimilarity = calculateKeywordOverlap(s1, s2);
  
  // Weighted combination (60% Levenshtein, 40% keyword overlap)
  return levenshteinSimilarity * 0.6 + keywordSimilarity * 0.4;
}

/**
 * Calculate date proximity score (0-10, higher is better)
 */
function calculateDateProximity(date1: Date, date2: Date): number {
  const daysDiff = Math.abs(differenceInDays(date1, date2));
  
  if (daysDiff === 0) return 10;
  if (daysDiff <= 1) return 9;
  if (daysDiff <= 3) return 8;
  if (daysDiff <= 5) return 7;
  if (daysDiff <= 7) return 6;
  if (daysDiff <= 14) return 4;
  if (daysDiff <= 21) return 3;
  if (daysDiff <= 30) return 2;
  if (daysDiff <= 45) return 1;
  
  return 0;
}

/**
 * Calculate location similarity with fuzzy matching and synonym awareness
 */
function calculateLocationSimilarity(loc1: string | null, loc2: string): number {
  if (!loc1) return 0;
  
  // Check semantic similarity first
  if (areLocationsSimilar(loc1, loc2)) {
    return 10; // Full score if semantically similar
  }
  
  // Fall back to string similarity with normalization
  const norm1 = normalizeLocation(loc1);
  const norm2 = normalizeLocation(loc2);
  
  const similarity = calculateStringSimilarity(norm1, norm2);
  
  // Bonus for partial matches
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return Math.min(10, similarity * 10 + 2);
  }
  
  return similarity * 10;
}

/**
 * Calculate cross-field matching bonus
 * Checks if keywords from one field appear in another field
 */
function calculateCrossFieldBonus(
  lostTitle: string,
  lostDesc: string,
  foundTitle: string,
  foundDesc: string
): number {
  const lostTitleKeywords = new Set(extractKeywords(lostTitle));
  const lostDescKeywords = new Set(extractKeywords(lostDesc));
  const foundTitleKeywords = new Set(extractKeywords(foundTitle));
  const foundDescKeywords = new Set(extractKeywords(foundDesc));
  
  let bonus = 0;
  
  // Check if lost title keywords appear in found description
  const lostTitleInFoundDesc = [...lostTitleKeywords].filter(k => foundDescKeywords.has(k)).length;
  if (lostTitleInFoundDesc > 0) {
    bonus += lostTitleInFoundDesc * 2; // 2 points per matching keyword
  }
  
  // Check if found title keywords appear in lost description
  const foundTitleInLostDesc = [...foundTitleKeywords].filter(k => lostDescKeywords.has(k)).length;
  if (foundTitleInLostDesc > 0) {
    bonus += foundTitleInLostDesc * 2; // 2 points per matching keyword
  }
  
  // Check if lost description keywords appear in found title
  const lostDescInFoundTitle = [...lostDescKeywords].filter(k => foundTitleKeywords.has(k)).length;
  if (lostDescInFoundTitle > 0) {
    bonus += lostDescInFoundTitle * 2; // 2 points per matching keyword
  }
  
  // Check if found description keywords appear in lost title
  const foundDescInLostTitle = [...foundDescKeywords].filter(k => lostTitleKeywords.has(k)).length;
  if (foundDescInLostTitle > 0) {
    bonus += foundDescInLostTitle * 2; // 2 points per matching keyword
  }
  
  // Cap the bonus at 10 points
  return Math.min(10, bonus);
}

/**
 * Calculate combined text similarity (title + description)
 * This helps when important details are split across fields
 */
function calculateCombinedTextSimilarity(
  lostTitle: string,
  lostDesc: string,
  foundTitle: string,
  foundDesc: string
): number {
  // Combine title and description for each item
  const lostCombined = `${lostTitle} ${lostDesc}`;
  const foundCombined = `${foundTitle} ${foundDesc}`;
  
  return calculateStringSimilarity(lostCombined, foundCombined);
}

/**
 * Calculate match score for a lost item against a found item
 */
export function calculateMatchScore(
  lost: LostItemMatch,
  found: FoundItemMatch
): MatchScore {
  // Category match (40 points - most important)
  const categoryMatch = lost.category === found.category ? 40 : 0;
  
  // Title similarity (20 points) - with fuzzy matching
  const titleSimilarity = calculateStringSimilarity(lost.title, found.title) * 20;
  
  // Description similarity (15 points) - with keyword matching
  const descriptionSimilarity = calculateStringSimilarity(lost.description, found.description) * 15;
  
  // Cross-field bonus (10 points) - NEW!
  // Rewards when keywords from title appear in description and vice versa
  const crossFieldBonus = calculateCrossFieldBonus(
    lost.title,
    lost.description,
    found.title,
    found.description
  );
  
  // Combined text similarity (5 points) - NEW!
  // Helps when details are distributed differently across fields
  const combinedSimilarity = calculateCombinedTextSimilarity(
    lost.title,
    lost.description,
    found.title,
    found.description
  ) * 5;
  
  // Date proximity (10 points)
  const dateProximity = calculateDateProximity(lost.lostDate, found.foundDate);
  
  // Location similarity (10 points) - with synonym awareness
  const locationMatch = calculateLocationSimilarity(lost.location, found.location);
  
  // Total score out of 100
  const totalScore = categoryMatch + titleSimilarity + descriptionSimilarity + 
                    crossFieldBonus + combinedSimilarity + dateProximity + locationMatch;
  
  return {
    item: found,
    score: Math.round(totalScore * 10) / 10, // Round to 1 decimal
    breakdown: {
      categoryMatch,
      titleSimilarity: Math.round(titleSimilarity * 10) / 10,
      descriptionSimilarity: Math.round(descriptionSimilarity * 10) / 10,
      dateProximity,
      locationMatch: Math.round(locationMatch * 10) / 10,
    },
  };
}

/**
 * Find best matches for a lost item from found items
 */
export function findMatchesForLostItem(
  lostItem: LostItemMatch,
  foundItems: FoundItemMatch[],
  limit: number = 10,
  minScore: number = 20
): MatchScore[] {
  // Filter by category first for performance
  const sameCategoryItems = foundItems.filter(
    found => found.category === lostItem.category
  );
  
  // If we have same-category items, prioritize them
  const itemsToScore = sameCategoryItems.length > 0 ? sameCategoryItems : foundItems;
  
  // Calculate scores
  const scored = itemsToScore.map(found => calculateMatchScore(lostItem, found));
  
  // Filter by minimum score and sort
  return scored
    .filter(match => match.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Find best matches for a found item from lost items
 */
export function findMatchesForFoundItem(
  foundItem: FoundItemMatch,
  lostItems: LostItemMatch[],
  limit: number = 10,
  minScore: number = 20
): MatchScore[] {
  // Convert to use the same scoring function
  const sameCategoryItems = lostItems.filter(
    lost => lost.category === foundItem.category
  );
  
  const itemsToScore = sameCategoryItems.length > 0 ? sameCategoryItems : lostItems;
  
  // Calculate scores (reversed logic)
  const scored = itemsToScore.map(lost => {
    const matchScore = calculateMatchScore(lost, foundItem);
    return {
      item: lost,
      score: matchScore.score,
      breakdown: matchScore.breakdown,
    };
  });
  
  return scored
    .filter(match => match.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
