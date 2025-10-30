# Analytics Export Feature

## Overview

The Analytics Dashboard now includes powerful export functionality that allows administrators to download analytics data for external analysis, reporting, and record-keeping.

## Features

### 🎯 Export Formats

**1. CSV Export** 📊
- **Format**: Comma-Separated Values (CSV)
- **Use Case**: Excel, Google Sheets, data analysis tools
- **Includes**:
  - Summary statistics (total items, match rates, active users)
  - Category breakdown with counts
  - Top locations with item counts
  - Daily time-series data (lost vs found items)
- **File Naming**: `analytics-report-{days}days-{date}.csv`

**2. JSON Export** 📄
- **Format**: JavaScript Object Notation (JSON)
- **Use Case**: Programming, APIs, advanced data analysis
- **Includes**:
  - Metadata (generation timestamp, date range, report type)
  - All raw analytics data in structured format
  - Nested objects for easy parsing
- **File Naming**: `analytics-data-{days}days-{date}.json`

## How to Use

### Accessing the Export Feature

1. **Login as Admin**
   - Navigate to `/admin/dashboard`
   - Click on "Analytics" card

2. **Select Date Range**
   - Choose from: Last 7 days, Last 30 days, or Last 90 days
   - Analytics data will update automatically

3. **Export Data**
   - Click **"Export CSV"** for spreadsheet format
   - Click **"Export JSON"** for structured data format
   - File downloads automatically to your browser's download folder

### CSV Format Structure

```csv
Analytics Report
Generated: 10/30/2025, 1:00:00 PM
Date Range: Last 30 days

SUMMARY
Metric,Value
Total Lost Items,45
Total Found Items,38
Matched Items,12
Resolved Items,8
Active Users,23
Match Success Rate,44.4%

CATEGORIES
Category,Count
Electronics,15
Clothing,12
Documents,8
Keys,5
...

TOP LOCATIONS
Location,Count
Library,18
Cafeteria,12
Gym,8
...

DAILY STATISTICS
Date,Lost Items,Found Items
2025-10-01,2,3
2025-10-02,1,2
...
```

### JSON Format Structure

```json
{
  "metadata": {
    "generatedAt": "2025-10-30T13:00:00.000Z",
    "dateRange": "30 days",
    "reportType": "Analytics Dashboard Export"
  },
  "summary": {
    "totalLostItems": 45,
    "totalFoundItems": 38,
    "matchedItems": 12,
    "resolvedItems": 8,
    "activeUsers": 23,
    "matchSuccessRate": 44.4
  },
  "categories": [
    { "name": "Electronics", "count": 15 },
    { "name": "Clothing", "count": 12 }
  ],
  "locations": [
    { "name": "Library", "count": 18 },
    { "name": "Cafeteria", "count": 12 }
  ],
  "recentActivity": [...],
  "timeSeriesData": [
    { "date": "2025-10-01", "lost": 2, "found": 3 }
  ]
}
```

## Use Cases

### 📈 Monthly Reports
1. Set date range to "Last 30 days"
2. Export as CSV
3. Import into Excel/Google Sheets
4. Create charts and presentations
5. Share with stakeholders

### 📊 Data Analysis
1. Export as JSON for any date range
2. Import into Python/R/data analysis tools
3. Perform statistical analysis
4. Build custom visualizations
5. Integrate with other systems

### 📝 Record Keeping
1. Export data monthly/quarterly
2. Archive for compliance/auditing
3. Track trends over time
4. Compare different time periods

### 🔄 System Integration
1. Export JSON data
2. Feed into other systems via API
3. Automate reporting workflows
4. Build custom dashboards

## Technical Details

### Export Functions

**CSV Export**
```typescript
exportToCSV()
- Generates CSV formatted string
- Includes all analytics sections
- Creates downloadable blob
- Auto-downloads with timestamped filename
```

**JSON Export**
```typescript
exportToJSON()
- Wraps data with metadata
- Pretty-prints JSON (2-space indent)
- Creates downloadable blob
- Auto-downloads with timestamped filename
```

### Security

- ✅ **Admin Only**: Only users with ADMIN role can access analytics
- ✅ **Session Based**: Requires active authenticated session
- ✅ **Client-Side**: Export happens in browser (no sensitive data sent to server)
- ✅ **CORS Protected**: Analytics API validates origin

### Browser Compatibility

The export feature works in all modern browsers:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Opera

Uses standard Web APIs:
- `Blob` API for file creation
- `URL.createObjectURL` for download links
- No external dependencies required

## File Size Considerations

### Typical File Sizes
- **CSV**: 2-10 KB for 30 days of data
- **JSON**: 5-20 KB for 30 days of data

### Large Datasets
- 90 days with high activity: ~50-100 KB
- Still very manageable for modern browsers
- No special handling needed

## Tips and Best Practices

### 📋 Regular Exports
- Export data monthly for trend analysis
- Keep historical records for comparison
- Archive important periods (semester ends, etc.)

### 🔍 Data Analysis
- Use CSV for quick Excel analysis
- Use JSON for programmatic processing
- Combine multiple exports to track long-term trends

### 📤 Sharing Data
- CSV is more universal for non-technical users
- JSON is better for developers/technical staff
- Always include date range in filename for clarity

### 🗂️ Organization
- Create folder structure: `/analytics/{year}/{month}/`
- Use consistent naming convention
- Document any custom analysis performed

## Future Enhancements

Potential additions to consider:

1. **PDF Export** 📑
   - Formatted report with charts
   - Professional layout
   - Ready for printing/sharing

2. **Excel Export** 📊
   - Native .xlsx format
   - Multiple sheets
   - Pre-formatted charts

3. **Scheduled Exports** ⏰
   - Automatic weekly/monthly exports
   - Email delivery
   - Cloud storage integration

4. **Custom Reports** 🎨
   - Select specific metrics
   - Custom date ranges
   - Filtered data exports

5. **Email Reports** 📧
   - Send reports to multiple recipients
   - Customizable templates
   - Attachment options

## Troubleshooting

### Issue: Export button doesn't work
**Solutions**:
- Check browser console for errors
- Verify you're logged in as admin
- Try refreshing the page
- Clear browser cache

### Issue: File downloads as .txt instead of .csv/.json
**Solutions**:
- Rename file after download
- Check browser download settings
- Try different browser
- Update browser to latest version

### Issue: Data looks incorrect
**Solutions**:
- Verify date range selection
- Refresh analytics data
- Check if items exist in database
- Contact system administrator

## Support

For issues or questions about the export feature:
1. Check this documentation
2. Review analytics API logs
3. Contact system administrator
4. Check browser console for errors

## Code References

- **Analytics Page**: `src/app/admin/analytics/page.tsx`
- **Export Functions**: Lines 50-134 (exportToCSV, exportToJSON)
- **Export Buttons**: Lines 180-210 (UI components)
- **Analytics API**: `src/app/api/admin/analytics/route.ts`
