import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, html, text, attachments } = body;

    // Validate required fields
    if (!to || !subject || (!html && !text)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: to, subject, and html/text'
        },
        { status: 400 }
      );
    }

    // Get email configuration from backend API (Settings page) with password
    let emailUser = '';
    let emailPassword = '';
    let emailHost = 'smtp.gmail.com';
    let emailPort = 587;

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      // Get active email settings (includes password for sending)
      const settingsResponse = await fetch(`${backendUrl}/api/email-settings/active/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        emailUser = settingsData.email || '';
        emailPassword = settingsData.password || '';
        emailHost = settingsData.host || 'smtp.gmail.com';
        emailPort = parseInt(settingsData.port || '587');
      }
    } catch (error) {
      console.error('Error fetching email settings:', error);
    }

    // Fallback to environment variables if not configured in Settings
    if (!emailUser || !emailPassword) {
      emailUser = emailUser || process.env.EMAIL_USER || '';
      emailPassword = emailPassword || process.env.EMAIL_PASSWORD || '';
      emailHost = emailHost || process.env.EMAIL_HOST || 'smtp.gmail.com';
      emailPort = emailPort || parseInt(process.env.EMAIL_PORT || '587');
    }
    const emailFrom = process.env.NEXT_PUBLIC_COMPANY_EMAIL || emailUser;

    // Check if email is configured
    if (!emailUser || !emailPassword) {
      console.log('Email not configured - would send:', { to, subject });

      // Return demo success in development
      return NextResponse.json({
        success: true,
        demo: true,
        message: 'Email sending not configured. Please configure email settings in Settings page → Email Configuration',
        previewData: { to, subject, from: emailFrom }
      });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: emailHost,
      port: emailPort,
      secure: emailPort === 465, // true for 465, false for other ports
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    });

    // Send email
    const info = await transporter.sendMail({
      from: `"Recruitment Team" <${emailFrom}>`,
      to,
      subject,
      text,
      html,
      attachments: attachments || [],
    });

    console.log('Email sent:', info.messageId);

    return NextResponse.json({
      success: true,
      demo: false,
      messageId: info.messageId,
      message: 'Email sent successfully'
    });

  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send email',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
