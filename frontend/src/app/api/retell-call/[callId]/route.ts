import { NextRequest, NextResponse } from 'next/server';
import { Retell } from 'retell-sdk';

/**
 * Fetch call data with retry logic to wait for analysis completion
 * Retell AI analysis takes 10-30 seconds after call ends
 */
async function fetchCallDataWithRetry(
  client: Retell,
  callId: string,
  maxRetries: number = 5,
  delayMs: number = 3000
): Promise<any> {
  let lastCallData: any = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const callData = await client.call.retrieve(callId);
    lastCallData = callData;

    // Check if analysis is complete
    const hasAnalysis = callData.call_analysis != null;
    const hasCustomData = hasAnalysis && callData.call_analysis.custom_analysis_data != null;

    console.log(`Attempt ${attempt + 1}/${maxRetries}:`, {
      hasAnalysis,
      hasCustomData,
      callStatus: callData.call_status
    });

    // If we have custom analysis data, return immediately
    if (hasCustomData) {
      console.log('✅ Analysis complete with custom data:', callData.call_analysis.custom_analysis_data);
      return callData;
    }

    // If this is the last attempt, return what we have
    if (attempt === maxRetries - 1) {
      console.warn('⚠️ Max retries reached, returning call data without complete analysis');
      return callData;
    }

    // Wait before next retry
    console.log(`⏳ Waiting ${delayMs}ms before retry...`);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  return lastCallData;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { callId: string } }
) {
  try {
    const { callId } = params;

    if (!callId) {
      return NextResponse.json(
        { success: false, error: 'Call ID is required' },
        { status: 400 }
      );
    }

    // Check if Retell AI is configured
    const retellApiKey = process.env.RETELL_API_KEY;

    if (!retellApiKey || retellApiKey === 'your_real_api_key_from_retell_dashboard') {
      return NextResponse.json(
        {
          success: false,
          error: 'Retell AI not configured',
          message: 'Please configure RETELL_API_KEY in environment variables'
        },
        { status: 503 }
      );
    }

    // Initialize Retell client
    const client = new Retell({
      apiKey: retellApiKey,
    });

    try {
      // Fetch call details from Retell AI with retry logic for analysis completion
      const callData = await fetchCallDataWithRetry(client, callId);

      console.log('Retell call data retrieved:', callData);

      return NextResponse.json({
        success: true,
        data: {
          // Return FULL call data for backend processing
          ...callData,
          // Also return formatted data for backward compatibility
          duration_ms: callData.end_timestamp && callData.start_timestamp
            ? callData.end_timestamp - callData.start_timestamp
            : null,
        }
      });

    } catch (retellError: any) {
      console.error('Retell API error:', retellError);

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch call data from Retell AI',
          message: retellError.message || 'Unknown error',
          callId
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Backend - Error fetching call data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
