# Data Mapping & Calculation Guide

## Transaction Detail Report

### Expected Format
The Transaction Detail report must contain **18 columns** in the following order:

1. Ship Date
2. SCAC
3. Carrier Name
4. Service
5. Origin City
6. Origin State
7. Origin Zip
8. Dest City
9. Dest State
10. Dest Zip
11. Weight
12. Dim Weight
13. Zone
14. Residential
15. Signature Required
16. Declared Value
17. List Cost
18. **Total Cost** (Column R)

### Critical Column: Total Cost
**The system specifically uses Column R (Total Cost) for all spend calculations.**

This column is used to calculate:
- Total Spend (sum of all Total Cost values)
- Average Cost Per Shipment (Total Spend ÷ Total Shipments)
- Projected Monthly Spend
- Projected Annual Spend

### Validation
When you upload a Transaction Detail file, the system will:
1. ✅ Verify "Total Cost" column exists
2. ⚠️ Warn if column count is not 18
3. ⚠️ Warn if "Total Cost" is not at index 17 (Column R)
4. ❌ Throw error if "Total Cost" column is missing
5. ❌ Throw error if no valid cost data is found

### Debug Information
When you click "Calculate from Strategy Data", open browser console (F12) to see:
- Which column is being used for cost data
- Sample cost values from first 3 rows
- Total spend calculation
- Average cost per shipment
- All calculation steps

## Low Cost Opportunity Report

### Expected Format
The Low Cost Opportunity report must contain at minimum:

1. **Load ID** (LoadId, Load ID, Load_ID, etc.)
2. **Selected Carrier Name** (Selected_Carrier_Name, etc.)
3. **Selected Carrier Cost** (Select_Carrier_Bill, Selected Carrier Cost, etc.)
4. **Opportunity Carrier Name** (LO_Carrier_Name, Low Cost Carrier Name, etc.)
5. **Opportunity Carrier Cost** (LO_Carrier_Bill, Low Cost Carrier Cost, etc.)

### Validation
When you upload a Low Cost Opportunity file, the system will:
1. ✅ Verify Load ID column exists (any column containing "load")
2. ✅ Verify Carrier columns exist (any column containing "carrier")
3. ✅ Verify Cost columns exist (any columns containing "cost" or "bill")
4. ❌ Throw error listing missing columns if validation fails

## Volume & Spend Calculations

### Formula
```
Total Shipments = Count of rows in Transaction Detail CSV
Total Spend = Sum of all values in "Total Cost" column (Column R)
Average Cost Per Shipment = Total Spend ÷ Total Shipments

Timeframe (Months) = Days between earliest and latest Ship Date ÷ 30
Monthly Shipments = Total Shipments ÷ Timeframe Months
Annual Shipments = Monthly Shipments × 12

Annual Spend = Average Cost Per Shipment × Annual Shipments
Monthly Spend = Annual Spend ÷ 12
```

### Accounting Format
All currency values display with:
- Comma separators (e.g., 1,234,567)
- 2 decimal places (e.g., .00)
- Dollar sign prefix (e.g., $123,456.78)

Example: `$1,234,567.89`

## Error Messages

### "DATA FORMAT ERROR: Cannot find 'Total Cost' column"
**Cause:** Your Transaction Detail file doesn't have a column named "Total Cost"

**Solution:**
1. Verify you uploaded the correct Transaction Detail report
2. Check that Column R is labeled "Total Cost"
3. Ensure the file hasn't been modified from the standard format

### "DATA FORMAT ERROR: Low Cost Opportunity report missing required columns"
**Cause:** Your Low Cost Opportunity file is missing key columns

**Solution:**
1. Verify you uploaded the correct Low Cost Opportunity report
2. Check the error message for which columns are missing
3. Ensure the file contains Load ID, Carrier Names, and Cost/Bill columns

### "DATA FORMAT ERROR: No valid cost data found in Total Cost column"
**Cause:** The Total Cost column exists but contains no valid numeric values

**Solution:**
1. Check that the Total Cost column contains numeric values
2. Verify costs are formatted correctly (numbers with optional $ and commas)
3. Ensure at least one row has a valid cost value > 0

## Column Mapping

If your reports use different column names, the system attempts to auto-map based on:
- Exact name matches (case-insensitive)
- Partial name matches (e.g., "cost" matches "Total Cost")
- Previously saved mappings

You can manually adjust mappings in the Strategy tab before uploading.

## Best Practices

1. **Always use the standard report templates** - Don't rename or reorder columns
2. **Keep column headers in row 1** - The system reads the first row as headers
3. **Use CSV format** - Excel files should be saved as CSV before uploading
4. **Verify data quality** - Ensure all cost values are numeric and properly formatted
5. **Check console logs** - If calculations seem wrong, open browser console for detailed debug info
