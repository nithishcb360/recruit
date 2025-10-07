/**
 * Test Script - Verify Retell Custom Field Extraction
 *
 * This script helps you test if custom fields are being extracted properly
 * from your Retell AI calls.
 *
 * Usage:
 * 1. Replace YOUR_RETELL_API_KEY with your actual API key
 * 2. Replace YOUR_CALL_ID with a recent call ID
 * 3. Run: node test-retell-custom-fields.js
 */

const RETELL_API_KEY = 'YOUR_RETELL_API_KEY';
const TEST_CALL_ID = 'YOUR_CALL_ID'; // Get this from Retell dashboard after a call

async function testRetellCustomFields() {
  console.log('🔍 Testing Retell Custom Field Extraction\n');
  console.log(`📞 Call ID: ${TEST_CALL_ID}\n`);

  try {
    // Fetch call data from Retell AI
    const response = await fetch(`https://api.retellai.com/v2/get-call/${TEST_CALL_ID}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RETELL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const callData = await response.json();

    console.log('✅ Call Data Retrieved\n');
    console.log('📊 Basic Call Info:');
    console.log(`   Status: ${callData.call_status}`);
    console.log(`   Duration: ${callData.duration_ms ? (callData.duration_ms / 1000).toFixed(0) + 's' : 'N/A'}`);
    console.log(`   Type: ${callData.call_type}\n`);

    // Check if analysis exists
    if (!callData.call_analysis) {
      console.log('❌ No call_analysis found');
      console.log('   Possible reasons:');
      console.log('   - Call analysis not yet complete (wait 10-30 seconds after call ends)');
      console.log('   - Post-call analysis not enabled in Retell dashboard');
      console.log('   - Call ended in error or voicemail\n');
      return;
    }

    console.log('✅ Call Analysis Found\n');

    // Check for custom analysis data
    const customData = callData.call_analysis.custom_analysis_data;

    if (!customData) {
      console.log('❌ No custom_analysis_data found');
      console.log('   Possible reasons:');
      console.log('   - Custom fields not configured in Retell dashboard');
      console.log('   - Analysis still in progress');
      console.log('   - Agent prompt doesn\'t extract required information\n');
      console.log('📝 Call Summary (if available):');
      console.log(`   ${callData.call_analysis.call_summary || 'N/A'}\n`);
      return;
    }

    console.log('✅ Custom Analysis Data Found!\n');
    console.log('📋 Custom Fields Extracted:\n');

    // Check each required field
    const fields = {
      'interview_scheduled': {
        value: customData.interview_scheduled,
        expected: 'boolean (true/false)',
        status: customData.interview_scheduled !== undefined ? '✅' : '❌'
      },
      'scheduled_date': {
        value: customData.scheduled_date,
        expected: 'YYYY-MM-DD format (e.g., 2025-10-08)',
        status: customData.scheduled_date ? '✅' : '⚠️'
      },
      'scheduled_time': {
        value: customData.scheduled_time,
        expected: 'HH:MM AM/PM format (e.g., 3:00 PM)',
        status: customData.scheduled_time ? '✅' : '⚠️'
      },
      'scheduled_timezone': {
        value: customData.scheduled_timezone,
        expected: 'Timezone (e.g., Eastern Time (ET))',
        status: customData.scheduled_timezone ? '✅' : '⚠️'
      },
      'scheduled_datetime_iso': {
        value: customData.scheduled_datetime_iso,
        expected: 'ISO 8601 format',
        status: customData.scheduled_datetime_iso ? '✅' : '⚠️'
      }
    };

    for (const [fieldName, info] of Object.entries(fields)) {
      console.log(`${info.status} ${fieldName}:`);
      console.log(`   Value: ${info.value !== undefined ? JSON.stringify(info.value) : 'NOT SET'}`);
      console.log(`   Expected: ${info.expected}\n`);
    }

    // Overall assessment
    console.log('\n📊 ASSESSMENT:\n');

    const allFieldsPresent = Object.values(fields).every(f => f.status === '✅');

    if (allFieldsPresent) {
      console.log('🎉 SUCCESS! All custom fields are being extracted correctly.');
      console.log('   Your Retell configuration is working properly.\n');
    } else {
      const missingFields = Object.entries(fields)
        .filter(([_, info]) => info.status !== '✅')
        .map(([name, _]) => name);

      console.log('⚠️  PARTIAL SUCCESS - Some fields are missing:');
      missingFields.forEach(field => console.log(`   - ${field}`));
      console.log('\n   To fix this:');
      console.log('   1. Ensure these fields are added in Retell Dashboard → Post-Call Analysis');
      console.log('   2. Check that field descriptions clearly explain what to extract');
      console.log('   3. Update your agent prompt to explicitly collect this information');
      console.log('   4. Make a test call and verify the agent asks for all required info\n');
    }

    // Show full custom data for debugging
    console.log('🔍 FULL CUSTOM DATA (for debugging):\n');
    console.log(JSON.stringify(customData, null, 2));
    console.log('\n');

    // Show transcript excerpt if available
    if (callData.transcript) {
      console.log('📝 TRANSCRIPT EXCERPT (first 500 chars):\n');
      console.log(callData.transcript.substring(0, 500) + '...\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Verify RETELL_API_KEY is correct');
    console.log('2. Verify TEST_CALL_ID is valid');
    console.log('3. Check that call has ended and analysis is complete');
    console.log('4. Ensure you have network connectivity\n');
  }
}

// Check if API key and Call ID are set
if (RETELL_API_KEY === 'YOUR_RETELL_API_KEY' || TEST_CALL_ID === 'YOUR_CALL_ID') {
  console.log('❌ Configuration Required\n');
  console.log('Please edit this file and set:');
  console.log('1. RETELL_API_KEY = "your_actual_api_key"');
  console.log('2. TEST_CALL_ID = "your_actual_call_id"\n');
  console.log('Get your API key from: https://dashboard.retellai.com/settings');
  console.log('Get a call ID from: https://dashboard.retellai.com/calls\n');
  process.exit(1);
}

// Run the test
testRetellCustomFields();
