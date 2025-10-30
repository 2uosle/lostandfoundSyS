# Matching Algorithm Testing Guide

## Overview
The matching algorithm test creates realistic test data to demonstrate how the matching system works in your Lost and Found application.

## Test Data Created

### Test Users
- **Admin**: admin-test-matching@neu.edu.ph / Password123!
- **Student 1**: student1-test-matching@neu.edu.ph / Password123!
- **Student 2**: student2-test-matching@neu.edu.ph / Password123!

### Test Scenarios

#### 1. iPhone - Perfect Match (~95% expected)
**Lost Item:**
- Title: "iPhone 13 Pro Max"
- Description: "Black iPhone 13 Pro Max with blue case. Lost near the library entrance."
- Category: Electronics
- Location: Main Library
- Date: 2025-01-15

**Found Item:**
- Title: "Black iPhone with Blue Case"
- Description: "Found iPhone 13 Pro with blue case near the main library entrance."
- Category: Electronics
- Location: Main Library
- Date: 2025-01-15

**Why it should match:**
- ✅ Same category (Electronics)
- ✅ Same location (Main Library)
- ✅ Same date
- ✅ Similar titles and descriptions
- ✅ Keyword overlap: iPhone, black, blue, case, library

---

#### 2. Wallet - Good Match (~85% expected)
**Lost Item:**
- Title: "Brown Leather Wallet"
- Description: "Brown leather wallet with ID cards and some cash. Very important!"
- Category: Personal Items
- Location: Gymnasium
- Date: 2025-01-16

**Found Item:**
- Title: "Leather Wallet"
- Description: "Brown leather wallet found in the gym. Contains ID and cards."
- Category: Personal Items
- Location: Gymnasium
- Date: 2025-01-16

**Why it should match:**
- ✅ Same category (Personal Items)
- ✅ Same location (Gymnasium/gym - location synonyms)
- ✅ Same date
- ✅ Keyword overlap: leather, wallet, brown, ID, cards

---

#### 3. Keys - Medium Match (~50-60% expected)
**Lost Item:**
- Title: "Car Keys with Red Keychain"
- Description: "Toyota car keys with a red keychain. Has 3 keys attached."
- Category: Personal Items
- Location: Parking Lot
- Date: 2025-01-17

**Found Item:**
- Title: "Car Keys with Keychain"
- Description: "Found car keys with red keychain, looks like Toyota keys."
- Category: Personal Items
- Location: Cafeteria
- Date: 2025-01-17

**Why medium score:**
- ✅ Same category (Personal Items)
- ❌ Different location (Parking Lot vs Cafeteria) - **location penalty**
- ✅ Same date
- ✅ Keyword overlap: car, keys, red, keychain, Toyota

---

#### 4. Textbook vs Laptop - Should NOT Match (~20% expected)
**Lost Item:**
- Title: "Calculus Textbook"
- Description: "Math textbook for Calculus 101. Blue cover."
- Category: Books
- Date: 2025-01-18

**Found Item:**
- Title: "MacBook Laptop"
- Description: "Found MacBook Pro laptop. Silver color."
- Category: Electronics
- Date: 2025-01-18

**Why it should reject:**
- ❌ Different category (Books vs Electronics)
- ❌ No keyword overlap
- ❌ Completely different items
- ✅ Same location (Classroom Building A) - not enough to overcome category mismatch

---

#### 5. AirPods - High Match (~90% expected)
**Lost Item:**
- Title: "AirPods Pro"
- Description: "Apple AirPods Pro with charging case. White color."
- Category: Electronics
- Location: Cafeteria
- Date: 2025-01-19

**Found Item:**
- Title: "Apple AirPods with Case"
- Description: "Found AirPods Pro with white charging case in the cafeteria."
- Category: Electronics
- Location: Cafeteria
- Date: 2025-01-19

**Why it should match:**
- ✅ Same category (Electronics)
- ✅ Same location (Cafeteria)
- ✅ Same date
- ✅ Brand detection: Apple
- ✅ Keyword overlap: AirPods, Pro, case, white, charging

---

## How the Matching Algorithm Works

### Scoring Components (Total: 114 points, normalized to 100%)

1. **Category Match (40 points)** - Most important factor
   - Must match for a high score
   
2. **Title Similarity (20 points)**
   - Levenshtein distance (50%)
   - Keyword Jaccard similarity (25%)
   - Cosine similarity (25%)

3. **Description Similarity (12 points)**
   - Same metrics as title

4. **Cross-Field Bonus (10 points)**
   - Keywords from title appearing in description and vice versa

5. **Date Proximity (10 points)**
   - Same day: 10 points
   - 1-3 days: 7 points
   - 4-7 days: 5 points
   - 8-14 days: 2 points

6. **Location Match (10 points)**
   - Exact match or synonyms (gym/gymnasium, library/lib, etc.)

7. **Combined Text (5 points)**
   - Overall text similarity

8. **Color Matching (4 points)**
   - Detected color keywords match

9. **Brand Matching (2 points)**
   - Electronics brand detection (Apple, Samsung, etc.)

10. **Number Matching (1 point)**
    - Model numbers or quantities

### Match Thresholds
- **High Match**: ≥80% - Should be suggested to users
- **Medium Match**: 60-79% - May be suggested
- **Low Match**: 20-59% - Visible but not prioritized
- **Rejected**: <20% - Not shown to users

---

## Testing the Matching Algorithm

### 1. Run the Test Script
```powershell
npm run test:matching
```

This will:
- Clean up any existing test data
- Create 3 test users
- Create 5 lost items
- Create 5 found items
- Display test scenarios

### 2. Manual Testing via UI

1. **Login to Admin Dashboard**
   - Email: admin-test-matching@neu.edu.ph
   - Password: Password123!

2. **Navigate to Manage Items**
   - Go to Admin Dashboard
   - Click on "Manage Items"

3. **Test Matching**
   - Click "Match" button on any lost item
   - View the suggested matches and their scores
   - Compare actual scores with expected scores

4. **Verify Expected Results**
   - iPhone should match at ~95% ✅
   - Wallet should match at ~85% ✅
   - AirPods should match at ~90% ✅
   - Keys should match at ~55% (medium) ⚠️
   - Textbook should NOT match MacBook ❌

### 3. Testing Match Confirmation

1. Click "Confirm Match" on a high-scoring match
2. Verify both items are marked as "MATCHED"
3. Check that notification was created
4. Verify activity log entry

---

## Understanding Match Scores

### High Score Indicators
- ✅ Same category
- ✅ Same or similar location
- ✅ Close dates (within 1-3 days)
- ✅ Strong keyword overlap
- ✅ Brand/color matches

### Low Score Indicators
- ❌ Different categories
- ❌ Different locations
- ❌ Large date differences (>2 weeks)
- ❌ No keyword overlap
- ❌ Completely different descriptions

---

## Troubleshooting

### Scores Lower Than Expected?
- Check if location synonyms are working (gym = gymnasium)
- Verify date proximity calculations
- Review keyword extraction in descriptions
- Check for typos in test data

### No Matches Showing?
- Minimum threshold is 20% - items below this are filtered out
- Category mismatch severely penalizes scores
- Try adjusting the `minScore` parameter in the API

### Testing with Your Own Data
```typescript
// Run the seed script instead for production-like data
npm run db:seed
```

---

## Cleanup

To remove all test data:
```typescript
await prisma.lostItem.deleteMany({
  where: { contactInfo: { contains: 'test-matching' } }
});
await prisma.foundItem.deleteMany({
  where: { contactInfo: { contains: 'test-matching' } }
});
await prisma.user.deleteMany({
  where: { email: { contains: 'test-matching' } }
});
```

Or simply run the test script again - it cleans up first automatically.

---

## Next Steps

1. ✅ Test matching via UI with created data
2. ✅ Verify match scores align with expectations
3. ✅ Test match confirmation workflow
4. ✅ Check email notifications (if SMTP configured)
5. ✅ Review analytics dashboard for match statistics
6. ✅ Export analytics data as CSV/JSON

---

## Algorithm Improvements

If you want to adjust the matching behavior:

1. **Increase category weight**: Edit `src/lib/matching.ts`
2. **Add new scoring factors**: Implement in `calculateMatchScore()`
3. **Adjust thresholds**: Change minimum score in API routes
4. **Add location synonyms**: Update `locationSynonyms` object
5. **Fine-tune text similarity**: Adjust weights in text comparison functions

---

## Production Considerations

1. **Performance**: Algorithm scales linearly with found items
2. **Caching**: Consider caching match results for large datasets
3. **Batch Processing**: Use background jobs for auto-matching
4. **Threshold Tuning**: Adjust based on user feedback
5. **False Positives**: Monitor and adjust if too many wrong matches

---

*Created: 2025-01-25*  
*Author: GitHub Copilot*
