# How to Fix Blank Custom Fields in Retell AI

## Problem
You configured custom fields in Retell AI (`scheduled_date`, `scheduled_time`, `interview_scheduled`) but they're showing as blank in your database.

## Root Cause
The issue was that your **frontend was fetching call data from Retell but never saving it to the backend database**. The data was only stored in React state (temporary) and never persisted to Django/PostgreSQL.

## Solution Applied

### ✅ 1. Added Retry Logic (API Route)
**File: `frontend/src/app/api/retell-call/[callId]/route.ts`**

Added `fetchCallDataWithRetry()` function that:
- Waits up to 15 seconds for Retell's post-call analysis to complete
- Checks for `custom_analysis_data` before returning
- Retries 5 times with 3-second delays
- Logs progress for debugging

### ✅ 2. Created Save-to-Backend Function
**File: `frontend/src/lib/api/retell-enhanced.ts`**

Added `getCallDetailsAndSave()` method that:
1. Fetches full call data from Retell (with retry logic)
2. Automatically saves to Django backend via `POST /api/candidates/{id}/save_retell_call_data/`
3. Returns the saved candidate data with all Retell fields populated
4. Shows detailed logging for debugging

### ✅ 3. Updated Frontend to Use New Function
**File: `frontend/src/app/screening/page.tsx`**

Modified `fetchCallDataByCallId()` to:
- Use `enhancedRetellAPI.getCallDetailsAndSave()` instead of just `getCallDetails()`
- Show toast notification with interview details if scheduled
- Log all extracted custom fields to console

## How to Use

### Method 1: Via UI (Recommended)
1. Go to screening page: `http://localhost:3000/screening`
2. Find a candidate
3. Make a call using Retell AI (or use existing call ID)
4. Wait 20-30 seconds for call analysis to complete
5. Enter the Call ID in the "Fetch Call Data" input
6. Click "Fetch Call Data" button
7. ✅ Data is now saved to database!

### Method 2: Via API (For Testing)
```bash
# Edit the test script with your values
nano test-save-call-data.sh

# Update these variables:
CANDIDATE_ID=199           # Your candidate ID
CALL_ID="call_abc123"      # Your Retell call ID

# Run the test
bash test-save-call-data.sh
```

### Method 3: Manual cURL
```bash
# 1. Fetch call data from Retell (with retry)
curl http://localhost:3000/api/retell-call/YOUR_CALL_ID | jq '.'

# 2. Save to backend
curl -X POST http://localhost:8000/api/candidates/CANDIDATE_ID/save_retell_call_data/ \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "call_id": "your_call_id",
  "call_status": "ended",
  "call_analysis": {
    "call_summary": "...",
    "custom_analysis_data": {
      "interview_scheduled": true,
      "scheduled_date": "2025-10-08",
      "scheduled_time": "3:00 PM"
    }
  }
}
EOF

# 3. Verify it saved
curl http://localhost:8000/api/candidates/CANDIDATE_ID/ | jq '{
  retell_call_id,
  retell_interview_scheduled,
  retell_scheduled_date,
  retell_scheduled_time
}'
```

## Verification Checklist

After fetching a call, verify these in order:

### ✅ Check 1: Console Logs
Look for these logs in browser console:
```
📞 Fetched call data from Retell: {
  call_id: "...",
  has_analysis: true,
  has_custom_data: true
}

✅ Call data saved to backend: {
  candidate_id: 199,
  interview_scheduled: true,
  scheduled_date: "2025-10-08",
  scheduled_time: "3:00 PM"
}
```

### ✅ Check 2: Toast Notification
Should see:
```
✅ Call Data Saved
Recording, transcript, and analysis saved to database
✓ Interview: 2025-10-08 at 3:00 PM
```

### ✅ Check 3: Database
```bash
# Check candidate in database
curl http://localhost:8000/api/candidates/199/ | jq '{
  retell_interview_scheduled,
  retell_scheduled_date,
  retell_scheduled_time
}'

# Should return:
{
  "retell_interview_scheduled": true,
  "retell_scheduled_date": "2025-10-08",
  "retell_scheduled_time": "3:00 PM"
}
```

## Troubleshooting

### Issue: Still Getting Blank Fields

**Problem:** Custom fields are still blank after fetch

**Solutions:**

1. **Check if analysis is complete**
   - Wait 30 seconds after call ends
   - Look for console log: `⚠️ Max retries reached`
   - If so, wait longer and try again

2. **Verify Retell dashboard configuration**
   - Go to Retell Dashboard → Post-Call Analysis
   - Ensure custom fields are configured with correct types and descriptions
   - See `RETELL_AGENT_PROMPT.md` for exact field configuration

3. **Check agent prompt**
   - Ensure your Retell agent asks for specific date, time, and timezone
   - Agent must get explicit confirmation from candidate
   - See `RETELL_AGENT_PROMPT.md` for recommended prompt

4. **Test with Retell's test call**
   - Use `test-retell-custom-fields.js` to verify field extraction
   - Run: `node test-retell-custom-fields.js`

### Issue: "Failed to save to backend"

**Problem:** Frontend fetches data but backend save fails

**Solutions:**

1. **Check backend is running**
   ```bash
   curl http://localhost:8000/api/candidates/
   ```

2. **Check candidate exists**
   ```bash
   curl http://localhost:8000/api/candidates/YOUR_ID/
   ```

3. **Check Django logs**
   - Look for errors in terminal where Django is running
   - Check for database migration issues

4. **Verify endpoint exists**
   ```bash
   curl -X POST http://localhost:8000/api/candidates/199/save_retell_call_data/ \
     -H "Content-Type: application/json" \
     -d '{"call_id": "test"}'
   ```

### Issue: Frontend can't reach backend

**Problem:** CORS or connection errors

**Solutions:**

1. **Check `NEXT_PUBLIC_BACKEND_URL`**
   ```bash
   # In frontend/.env.local
   NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
   ```

2. **Check Django CORS settings**
   ```python
   # In backend/settings.py
   CORS_ALLOW_ALL_ORIGINS = True  # For development
   ```

3. **Verify ports**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8000

## Summary

The fix involved three changes:

1. ✅ **API Route**: Added retry logic to wait for analysis
2. ✅ **Helper Function**: Created `getCallDetailsAndSave()` to fetch AND save
3. ✅ **Frontend**: Updated UI to use new save function

**Before:** Fetch → Show in UI → Lost on refresh ❌

**After:** Fetch → Save to DB → Persist forever ✅

## Files Modified

- `frontend/src/app/api/retell-call/[callId]/route.ts` - Added retry logic
- `frontend/src/lib/api/retell-enhanced.ts` - Added save function
- `frontend/src/app/screening/page.tsx` - Updated to call save function

## Next Steps

1. Test with a real call from Retell AI
2. Verify data appears in Django admin
3. Check that fields update correctly on subsequent fetches
4. Set up webhook for automatic saving (see `RETELL_INTEGRATION_GUIDE.md`)
