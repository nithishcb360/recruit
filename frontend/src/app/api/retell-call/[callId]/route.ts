import { NextRequest, NextResponse } from 'next/server';
import { Retell } from 'retell-sdk';

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
      // Fetch call details from Retell AI
      const callData = await client.call.retrieve(callId);

      console.log('Retell call data retrieved:', callData);

      return NextResponse.json({
        success: true,
        data: {
          call_id: callData.call_id,
          call_status: callData.call_status,
          recording_url: callData.recording_url,
          transcript: callData.transcript,
          duration_ms: callData.end_timestamp && callData.start_timestamp
            ? callData.end_timestamp - callData.start_timestamp
            : null,
          metadata: callData.metadata,
          start_timestamp: callData.start_timestamp,
          end_timestamp: callData.end_timestamp,
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
