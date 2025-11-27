# 📊 Lost & Found Matching Algorithm

## Overview
The ClaimNEU system uses a **sophisticated multi-factor scoring algorithm** that calculates similarity between lost and found items based on multiple weighted criteria. The algorithm returns a score from **0-100+**, where higher scores indicate better matches.

---

## 🎯 How It Works - The Full Process

### 1. Initial Filtering
When a user requests matches:

```
User reports lost item → System searches PENDING found items
OR
Admin reports found item → System searches PENDING lost items
```

**Exclusions:**
- Already declined matches are filtered out
- Only items with status `PENDING` are considered
- Same category items are prioritized first

---

## 2. Scoring Components (Total: ~107 points)

The algorithm calculates a comprehensive score using **10 different factors**:

### A. Category Match - 40 points ⭐ *MOST IMPORTANT*
- **Exact match**: 40 points
- **No match**: 0 points
- Categories: Electronics, Clothing, Accessories, Documents, Other

**Why it matters**: An iPhone shouldn't match with a jacket!

---

### B. Title Similarity - 20 points
Uses **hybrid string matching**:

**3 Methods Combined:**
1. **Levenshtein Distance (50%)** - Edit distance between strings
   - Measures how many character changes needed to transform one string to another
   - Example: "iPhone" → "iphon" = 1 edit = high similarity

2. **Keyword Overlap/Jaccard Similarity (25%)**
   - Extracts keywords (removes stopwords like "the", "a", "is")
   - Compares unique keywords between items
   - Formula: `intersection / union`
   - Example: 
     ```
     Lost: "black iPhone 13" → keywords: {black, iphone, 13}
     Found: "iPhone 13 black" → keywords: {black, iphone, 13}
     Score: 3/3 = 100% match
     ```

3. **Cosine Similarity (25%)**
   - Treats text as vectors based on word frequency
   - Measures angle between vectors
   - Better for semantic similarity

**Bonuses:**
- Exact match: 100%
- One string contains the other: 90%

---

### C. Description Similarity - 12 points
Same hybrid method as title, but weighted less since descriptions can vary more.

---

### D. Cross-Field Bonus - 10 points 🆕 *SMART FEATURE*
Checks if keywords appear in different fields:
- Lost title keywords → Found description
- Found title keywords → Lost description  
- Lost description keywords → Found title
- Found description keywords → Lost title

**Why it helps:**
```
Lost:  Title: "Phone", Desc: "Black iPhone 13 with cracked screen"
Found: Title: "iPhone 13", Desc: "Has screen damage"
→ Keywords match across fields → +10 bonus!
```

**Scoring**: 2 points per matching keyword, capped at 10

---

### E. Combined Text Similarity - 5 points
Combines title + description into one text block and compares.

Helps when details are distributed differently:
```
Lost:  "Blue wallet" + "Contains cards and money"
Found: "Wallet with cards" + "Blue color with cash inside"
```

---

### F. Date Proximity - 10 points
How close are the dates?

| Time Gap | Score |
|----------|-------|
| Same day | 10 points |
| 1 day apart | 9 points |
| 2-3 days | 8 points |
| 4-5 days | 7 points |
| 6-7 days | 6 points |
| 8-14 days | 4 points |
| 15-21 days | 3 points |
| 22-30 days | 2 points |
| 31-45 days | 1 point |
| 46+ days | 0 points |

**Logic**: Items lost and found on similar dates are more likely to match.

---

### G. Location Similarity - 10 points 🗺️ *SMART LOCATION*

**Features:**
1. **Abbreviation Expansion**
   - "bball court" → "basketball court"
   - "lib" → "library"
   - "rm 203" → "room 203"

2. **Synonym Matching**
   - Gym = gymnasium = fitness center
   - Cafeteria = caf = canteen = dining hall
   - Restroom = bathroom = CR = comfort room

3. **Partial Matching**
   - "basketball court" matches "court"
   - "parking lot A" matches "parking area"

**Scoring:**
- Semantic match (synonyms): 10 points
- String similarity: 0-10 based on text similarity
- Partial match bonus: +2 points

---

### H. Color Match - 4 points 🎨
Extracts and matches colors mentioned in text:
- **Detected colors**: black, white, gray, silver, red, blue, green, yellow, purple, pink, orange, brown, gold
- **Scoring**: 2 points per matching color, max 4 points

**Example:**
```
Lost:  "Black iPhone"
Found: "Black phone"
Match: "black" → +2 points
```

---

### I. Brand Match - 2 points 🏢
Extracts and matches brand names:
- **Detected brands**: apple, iphone, samsung, huawei, oppo, vivo, xiaomi, asus, acer, lenovo, hp, dell, sony, canon, nikon, logitech
- **Scoring**: 2 points per matching brand, max 2 points

---

### J. Number Match - 1 point 🔢
Extracts and matches numbers (2+ digits):
- Model numbers, room numbers, etc.
- **Example**: "iPhone 13" and "13 Pro" both have "13"
- **Scoring**: 1 point per matching number, max 1 point

---

## 3. Final Score Calculation

```typescript
Total Score = 
  Category (40) +
  Title Similarity (20) +
  Description Similarity (12) +
  Cross-Field Bonus (10) +
  Combined Similarity (5) +
  Date Proximity (10) +
  Location (10) +
  Color Match (4) +
  Brand Match (2) +
  Number Match (1)
  
Maximum: ~104 points
```

---

## 4. Filtering & Ranking

**Minimum Score Threshold**: 20 points
- Only matches scoring ≥20 are returned
- Results sorted by score (highest first)
- Top 10 matches returned by default

---

## 5. Example Match Calculation

**Lost Item:**
```
Title:       "Black iPhone 13"
Description: "Lost near library, has cracked screen"
Category:    Electronics
Location:    "NEU Library"
Date:        Nov 15, 2025
```

**Found Item:**
```
Title:       "iPhone 13 Pro"
Description: "Found at library entrance, screen is damaged"
Category:    Electronics
Location:    "Library Building"
Date:        Nov 16, 2025
```

**Score Breakdown:**
```
Category Match:           40 (Electronics = Electronics)
Title Similarity:         16 (80% similar: "iPhone 13" matches)
Description Similarity:    8 (keywords: library, screen, damaged)
Cross-Field Bonus:         6 (library, screen match across fields)
Combined Similarity:       4 (high combined text similarity)
Date Proximity:            9 (1 day apart)
Location:                 10 (library = library, synonym match)
Color Match:               2 (both mention "black")
Brand Match:               2 (iPhone detected in both)
Number Match:              1 ("13" appears in both)

═══════════════════════════════════════════════════
TOTAL SCORE: 98 points → EXCELLENT MATCH! ✅
```

---

## 6. Key Strengths of This Algorithm

✅ **Multi-dimensional**: Considers 10+ factors  
✅ **Fuzzy matching**: Handles typos and variations  
✅ **Semantic awareness**: Understands synonyms and context  
✅ **Cross-field intelligence**: Finds matches even when details are organized differently  
✅ **Domain-specific**: Detects colors, brands, numbers  
✅ **Location smart**: Handles abbreviations and synonyms  
✅ **Date-aware**: Recent matches score higher  
✅ **Weighted properly**: Important factors (category) get more weight  

---

## 7. When Matches Are Triggered

**Automatic matching happens:**
1. When an admin reports a found item → searches for matching lost items
2. When a user views their lost item → can manually search for matches
3. Results shown in dashboard with match percentage

**User can:**
- ✅ Accept a match (creates handoff session)
- ❌ Decline a match (filters it out permanently)

---

## 8. Algorithm Implementation

### String Similarity Calculation
The system uses a hybrid approach combining three techniques:

```typescript
// 1. Levenshtein Distance (50% weight)
// Measures character-level edit distance

// 2. Jaccard Similarity (25% weight)  
// Keyword overlap: intersection / union

// 3. Cosine Similarity (25% weight)
// Vector-based semantic similarity
```

### Location Normalization
```typescript
// Abbreviation expansions
'bball' → 'basketball'
'vball' → 'volleyball'
'rm'    → 'room'
'bldg'  → 'building'
'cr'    → 'comfort room'
'lib'   → 'library'
'caf'   → 'cafeteria'
```

### Keyword Extraction
Removes stopwords to focus on meaningful terms:
```typescript
Stopwords removed: 
a, an, and, are, as, at, be, by, for, from, has, he, 
in, is, it, its, of, on, that, the, to, was, will, 
with, i, my, me, have, had, this, there, their, they, 
very, some, can, could, would
```

---

## 9. Performance Considerations

- **Category-first filtering**: Same-category items are checked first for efficiency
- **Declined matches excluded**: Previously declined matches are filtered out
- **Status filtering**: Only `PENDING` items are considered
- **Top N results**: Returns maximum 10 matches by default
- **Minimum threshold**: 20-point cutoff prevents irrelevant matches

---

## 10. Future Enhancements

Potential improvements for the algorithm:

🔮 **Image similarity**: Compare uploaded photos using computer vision  
🔮 **Machine learning**: Train model on successful matches  
🔮 **User feedback**: Learn from accepted/declined matches  
🔮 **Geolocation**: Use precise GPS coordinates if available  
🔮 **Time-of-day matching**: Items lost/found at similar times  
🔮 **Weight adjustment**: Auto-tune weights based on match success rate  

---

**This is a production-grade matching algorithm that balances precision and recall, helping users find their lost items efficiently!** 🎯
