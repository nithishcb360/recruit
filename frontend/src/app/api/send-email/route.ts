import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, html, text } = body;

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

    // Get email configuration from environment
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;
    const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const emailPort = parseInt(process.env.EMAIL_PORT || '587');
    const emailFrom = process.env.NEXT_PUBLIC_COMPANY_EMAIL || process.env.EMAIL_USER;

    // Check if email is configured
    if (!emailUser || !emailPassword) {
      console.log('Email not configured - would send:', { to, subject });

      // Return demo success in development
      return NextResponse.json({
        success: true,
        demo: true,
        message: 'Email sending not configured. Set EMAIL_USER and EMAIL_PASSWORD in .env.local',
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
