import { NextRequest, NextResponse } from 'next/server';
import { Retell } from 'retell-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Backend - Received MCP call request:', body);

    const { candidateName, candidateEmail, candidatePhone, jobTitle, action } = body;

    // Validate required fields
    if (!candidateName || !candidatePhone || action !== 'start_screening_call') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: candidateName, candidatePhone, or invalid action'
        },
        { status: 400 }
      );
    }

    // Format phone number to E.164 format
    let formattedPhone = candidatePhone.trim();

    // If it's a 10-digit Indian number without country code, add +91
    if (/^\d{10}$/.test(formattedPhone)) {
      formattedPhone = `+91${formattedPhone}`;
    }
    // If it starts with 91 but no +, add the +
    else if (/^91\d{10}$/.test(formattedPhone)) {
      formattedPhone = `+${formattedPhone}`;
    }
    // If it doesn't start with +, add it (assuming it already has country code)
    else if (/^\d+$/.test(formattedPhone) && !formattedPhone.startsWith('+')) {
      formattedPhone = `+${formattedPhone}`;
    }

    console.log(`Phone number formatting: ${candidatePhone} -> ${formattedPhone}`);

    // Check if Retell AI is configured
    const retellApiKey = process.env.RETELL_API_KEY;
    const retellAgentId = process.env.RETELL_AGENT_ID;

    if (!retellApiKey || !retellAgentId ||
        retellApiKey === 'your_real_api_key_from_retell_dashboard' ||
        retellAgentId === 'your_real_agent_id_from_retell_dashboard') {

      // Return demo response if Retell is not configured
      const response = {
        success: true,
        demo: true,
        message: `Demo call initiated for ${candidateName} (Retell AI not configured)`,
        candidateName,
        candidatePhone,
        jobTitle,
        timestamp: new Date().toISOString()
      };

      console.log('Backend - Sending demo response:', response);
      return NextResponse.json(response);
    }

    // Initialize Retell client
    const client = new Retell({
      apiKey: retellApiKey,
    });

    try {
      // Create a phone call using Retell AI
      const callResponse = await client.call.createPhoneCall({
        from_number: process.env.RETELL_PHONE_NUMBER || '',
        to_number: formattedPhone,
        retell_llm_dynamic_variables: {
          candidateName,
          candidateEmail,
          jobTitle,
          timestamp: new Date().toISOString()
        }
      });

      console.log('Retell call created:', callResponse);

      const response = {
        success: true,
        demo: false,
        message: `Call initiated for ${candidateName}`,
        candidateName,
        candidatePhone: formattedPhone,
        jobTitle,
        callId: callResponse.call_id,
        timestamp: new Date().toISOString()
      };

      console.log('Backend - Sending real call response:', response);
      return NextResponse.json(response);

    } catch (retellError) {
      console.error('Retell API error:', retellError);

      // Fall back to demo mode if Retell API fails
      const response = {
        success: true,
        demo: true,
        message: `Demo call initiated for ${candidateName} (Retell API error)`,
        candidateName,
        candidatePhone,
        jobTitle,
        timestamp: new Date().toISOString(),
        error: retellError instanceof Error ? retellError.message : 'Retell API error'
      };

      console.log('Backend - Sending fallback demo response:', response);
      return NextResponse.json(response);
    }

  } catch (error) {
    console.error('Backend - Error processing MCP call:', error);
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