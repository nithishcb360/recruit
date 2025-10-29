#!/bin/bash
# Test script to verify Retell call data is being saved to backend

# Configuration
CANDIDATE_ID=199  # Change this to your test candidate ID
CALL_ID="your_call_id_here"  # Change this to a real call ID from Retell dashboard
BACKEND_URL="http://localhost:8000"

echo "🧪 Testing Retell Call Data Save Flow"
echo "======================================"
echo ""
echo "📋 Test Configuration:"
echo "   Candidate ID: $CANDIDATE_ID"
echo "   Call ID: $CALL_ID"
echo "   Backend URL: $BACKEND_URL"
echo ""

# Step 1: Check candidate before
echo "📊 Step 1: Checking candidate data BEFORE save..."
echo ""
BEFORE_DATA=$(curl -s "${BACKEND_URL}/api/candidates/${CANDIDATE_ID}/" | jq '{
  id: .id,
  name: (.first_name + " " + .last_name),
  retell_call_id: .retell_call_id,
  retell_interview_scheduled: .retell_interview_scheduled,
  retell_scheduled_date: .retell_scheduled_date,
  retell_scheduled_time: .retell_scheduled_time
}')

echo "$BEFORE_DATA"
echo ""

# Step 2: Fetch call data from Retell (via Next.js API route)
echo "📞 Step 2: Fetching call data from Retell AI..."
echo ""
CALL_DATA=$(curl -s "http://localhost:3000/api/retell-call/${CALL_ID}")

# Check if fetch was successful
if echo "$CALL_DATA" | jq -e '.success' > /dev/null; then
  echo "✅ Call data fetched successfully"
  echo ""
  echo "📝 Call Info:"
  echo "$CALL_DATA" | jq '{
    call_id: .data.call_id,
    call_status: .data.call_status,
    has_analysis: (.data.call_analysis != null),
    has_custom_data: (.data.call_analysis.custom_analysis_data != null)
  }'
  echo ""

  # Show custom analysis data if available
  if echo "$CALL_DATA" | jq -e '.data.call_analysis.custom_analysis_data' > /dev/null; then
    echo "📋 Custom Analysis Data:"
    echo "$CALL_DATA" | jq '.data.call_analysis.custom_analysis_data'
    echo ""
  else
    echo "⚠️  No custom analysis data found in call"
    echo ""
  fi
else
  echo "❌ Failed to fetch call data"
  echo "$CALL_DATA" | jq '.'
  exit 1
fi

# Step 3: Save to backend
echo "💾 Step 3: Saving call data to backend..."
echo ""

# Extract the full call data
FULL_CALL_DATA=$(echo "$CALL_DATA" | jq '.data')

# Save to backend
SAVE_RESULT=$(curl -s -X POST \
  "${BACKEND_URL}/api/candidates/${CANDIDATE_ID}/save_retell_call_data/" \
  -H "Content-Type: application/json" \
  -d "$FULL_CALL_DATA")

# Check if save was successful
if echo "$SAVE_RESULT" | jq -e '.success' > /dev/null; then
  echo "✅ Call data saved successfully"
  echo ""
else
  echo "❌ Failed to save call data"
  echo "$SAVE_RESULT" | jq '.'
  exit 1
fi

# Step 4: Check candidate after
echo "📊 Step 4: Checking candidate data AFTER save..."
echo ""
AFTER_DATA=$(curl -s "${BACKEND_URL}/api/candidates/${CANDIDATE_ID}/" | jq '{
  id: .id,
  name: (.first_name + " " + .last_name),
  retell_call_id: .retell_call_id,
  retell_interview_scheduled: .retell_interview_scheduled,
  retell_scheduled_date: .retell_scheduled_date,
  retell_scheduled_time: .retell_scheduled_time,
  retell_scheduled_timezone: .retell_scheduled_timezone,
  retell_call_summary: .retell_call_summary,
  status: .status
}')

echo "$AFTER_DATA"
echo ""

# Step 5: Compare before and after
echo "🔍 Step 5: Comparison..."
echo ""
echo "BEFORE:"
echo "$BEFORE_DATA"
echo ""
echo "AFTER:"
echo "$AFTER_DATA"
echo ""

# Check if interview was scheduled
if echo "$AFTER_DATA" | jq -e '.retell_interview_scheduled == true' > /dev/null; then
  echo "🎉 SUCCESS! Interview scheduled:"
  echo "   Date: $(echo "$AFTER_DATA" | jq -r '.retell_scheduled_date')"
  echo "   Time: $(echo "$AFTER_DATA" | jq -r '.retell_scheduled_time')"
  echo "   Timezone: $(echo "$AFTER_DATA" | jq -r '.retell_scheduled_timezone')"
  echo ""
else
  echo "⚠️  No interview scheduled in this call"
  echo ""
fi

echo "✅ Test Complete!"
echo ""
echo "💡 Next Steps:"
echo "   1. Check the candidate in your frontend at http://localhost:3000/screening"
echo "   2. Verify the custom fields are displaying correctly"
echo "   3. Check Django admin at http://localhost:8000/admin"
