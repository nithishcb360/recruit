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

    // Get email configuration from database settings API
    let emailSettings = null;
    try {
      const settingsResponse = await fetch('http://127.0.0.1:8000/api/email-settings/active/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (settingsResponse.ok) {
        emailSettings = await settingsResponse.json();
      }
    } catch (error) {
      console.error('Error fetching email settings from database:', error);
    }

    // Fallback to environment variables if database settings not found
    const emailUser = emailSettings?.email || process.env.EMAIL_USER;
    const emailPassword = emailSettings?.password || process.env.EMAIL_PASSWORD;
    const emailHost = emailSettings?.host || process.env.EMAIL_HOST || 'smtp.gmail.com';
    const emailPort = emailSettings?.port || parseInt(process.env.EMAIL_PORT || '587');
    const emailFrom = emailSettings?.from_name || process.env.NEXT_PUBLIC_COMPANY_EMAIL || emailUser;
    const useTLS = emailSettings?.use_tls !== undefined ? emailSettings.use_tls : true;
    const useSSL = emailSettings?.use_ssl !== undefined ? emailSettings.use_ssl : false;

    // Check if email is configured
    if (!emailUser || !emailPassword) {
      console.log('Email not configured - would send:', { to, subject });

      // Return demo success in development
      return NextResponse.json({
        success: true,
        demo: true,
        message: 'Email sending not configured. Please configure email settings in Settings → General tab',
        previewData: { to, subject, from: emailFrom }
      });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: emailHost,
      port: emailPort,
      secure: useSSL, // true for 465 (SSL), false for other ports (TLS)
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
      tls: useTLS ? {
        rejectUnauthorized: false
      } : undefined,
    });

    // Send email
    const info = await transporter.sendMail({
      from: emailFrom ? `"${emailFrom}" <${emailUser}>` : emailUser,
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
      message: `Email sent successfully using ${emailSettings ? 'database settings' : 'environment variables'}`,
      configuredFrom: emailSettings ? 'database' : 'environment'
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
