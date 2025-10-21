# Matching Algorithm Improvements - Fuzzy Matching & Smart Location Detection

## Overview

The matching algorithm has been significantly enhanced to handle real-world scenarios where users make typos, use abbreviations, or provide partial information.

## Key Improvements

### 1. **Fuzzy String Matching**

**Problem:** Users don't always type exactly the same thing. "Backpack" vs "backpak" should still match.

**Solution:**
- **Levenshtein Distance**: Measures how many character edits are needed to transform one string into another
- **Keyword Overlap**: Extracts meaningful words and compares them (ignoring common words like "the", "a", "and")
- **Weighted Combination**: 60% Levenshtein + 40% keyword overlap for best results

**Examples:**
- "Blue Nike Backpack" ✓ matches "Blue Nikee Backpak" (handles typos)
- "iPhone 13 Pro Max" ✓ matches "iphone 13 promax" (handles spacing)
- "Red wallet with cards" ✓ matches "Red wallet cards inside" (keyword matching)

### 2. **Smart Location Matching**

**Problem:** "basketball court" vs "court" should be recognized as the same location.

**Solution:**

#### Location Normalization
Automatically expands common abbreviations:
- "bball court" → "basketball court"
- "rm 301" → "room 301"
- "lib" → "library"
- "caf" → "cafeteria"
- "CR" → "comfort room"

#### Synonym Recognition
Recognizes that these are the same:
- **Court**: basketball court, tennis court, volleyball court, sports court
- **Gym**: gymnasium, fitness center, workout room
- **Library**: lib, study hall, learning center
- **Cafeteria**: caf, canteen, dining hall, food court
- **Parking**: parking lot, parking area, car park
- **Restroom**: bathroom, toilet, washroom, CR, comfort room
- **Hallway**: corridor, hall, passage
- **Classroom**: class, room

**Examples:**
- "basketball court" ✓ matches "court" (partial match)
- "library" ✓ matches "lib" (abbreviation)
- "parking lot" ✓ matches "car park" (synonym)
- "CR" ✓ matches "restroom" (common term expansion)

#### Partial Location Matches
- "Room 301, Building A" ✓ matches "Building A" (contains)
- "Second floor hallway" ✓ matches "hallway" (contains)

### 3. **Enhanced Text Similarity**

**Keyword Extraction:**
Filters out meaningless words ("a", "the", "is", "was") and focuses on important terms:
- Input: "I found a blue backpack with my books inside"
- Keywords: ["found", "blue", "backpack", "books", "inside"]

**Jaccard Similarity:**
Measures how much keyword sets overlap:
```
Overlap = (Common Keywords) / (All Unique Keywords)
```

**Examples:**
- "Lost my phone in the library"
- "Found phone at lib"
- Common keywords: ["phone", "library/lib"]
- High similarity despite different sentence structure

### 4. **Improved Date Proximity Scoring**

**More granular date scoring:**
- Same day: 10 points
- 1 day apart: 9 points
- 2-3 days: 8 points
- 4-5 days: 7 points
- 6-7 days: 6 points
- 8-14 days: 4 points
- 15-21 days: 3 points
- 22-30 days: 2 points
- 31-45 days: 1 point
- 45+ days: 0 points

This gives more nuanced scoring for items lost/found within a few days of each other.

### 5. **Multi-Factor Scoring**

The algorithm weighs different factors:

| Factor | Weight | Why |
|--------|--------|-----|
| Category Match | 40% | Must be same type of item |
| Title Similarity | 25% | Main identifier |
| Description Similarity | 15% | Additional details |
| Date Proximity | 10% | Timeline matters |
| Location Similarity | 10% | Where it was lost/found |

**Total: 100 points**

Items must score at least 20 points to be considered a match.

## Real-World Examples

### Example 1: Typos
**Lost Item:**
- Title: "iPhone 14 Pro"
- Description: "Black iPhone with cracked screen"
- Location: "Library"

**Found Item:**
- Title: "iphone 14 pro"
- Description: "Blak iphone craked screen"
- Location: "lib"

**Result:** ✓ High match (handles case insensitivity, typos, abbreviations)

### Example 2: Partial Information
**Lost Item:**
- Title: "Blue Nike Backpack"
- Description: "Blue backpack with a lot of books"
- Location: "Basketball Court near Building A"

**Found Item:**
- Title: "Backpack"
- Description: "Nike blue bag books inside"
- Location: "Court"

**Result:** ✓ Good match (handles partial descriptions, location synonyms)

### Example 3: Different Wording
**Lost Item:**
- Title: "Wallet"
- Description: "Brown leather wallet with student ID and credit cards"
- Location: "Second floor hallway"

**Found Item:**
- Title: "Brown Wallet"
- Description: "Leather wallet contains ID cards"
- Location: "hallway floor 2"

**Result:** ✓ Excellent match (keyword overlap, semantic similarity)

## Technical Implementation

### String Similarity Function
```typescript
calculateStringSimilarity(str1, str2) {
  // 1. Normalize (lowercase, trim)
  // 2. Check exact match → 1.0
  // 3. Check substring → 0.9
  // 4. Calculate Levenshtein → 0-1
  // 5. Calculate keyword overlap → 0-1
  // 6. Weighted average: 60% Levenshtein + 40% keywords
}
```

### Location Similarity Function
```typescript
calculateLocationSimilarity(loc1, loc2) {
  // 1. Normalize (expand abbreviations)
  // 2. Check synonym match → 10 points
  // 3. Check substring → 10 points + bonus
  // 4. Calculate fuzzy similarity → 0-10 points
}
```

## Performance Considerations

- **Category Pre-filtering**: Only compares items in the same category first
- **Fallback**: If no same-category matches, searches all categories
- **Limit Results**: Returns top 10 matches by default
- **Minimum Score**: Filters out matches below 20% similarity

## Future Enhancements (Possible)

1. **Color recognition**: "navy blue" ≈ "dark blue"
2. **Brand synonyms**: "iPhone" ≈ "Apple phone"
3. **Size variations**: "large" ≈ "big"
4. **Machine learning**: Train on successful matches
5. **Image comparison**: If photos are available

## Testing Examples

You can test the improved matching with:

1. **Typos**: "baskitball" should match "basketball"
2. **Abbreviations**: "bball court" should match "basketball court"
3. **Partial info**: "court" should match "basketball court near gym"
4. **Synonyms**: "parking lot" should match "car park"
5. **Case sensitivity**: "iPHONE" should match "iphone"

## Summary

The matching algorithm now:
- ✅ Handles typos and spelling mistakes
- ✅ Recognizes abbreviations and common terms
- ✅ Matches partial location descriptions
- ✅ Uses synonym awareness for locations
- ✅ Performs keyword-based matching
- ✅ Provides more nuanced scoring
- ✅ Works with real-world, imperfect user input

