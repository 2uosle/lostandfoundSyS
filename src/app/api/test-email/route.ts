import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * POST /api/test-email
 * Test endpoint to verify SMTP configuration is working
 * Only accessible to admins
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only admins can test email
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const { testEmail } = await req.json();
    const recipientEmail = testEmail || session.user.email;

    if (!recipientEmail) {
      return NextResponse.json(
        { success: false, error: 'No email address provided' },
        { status: 400 }
      );
    }

    console.log('🧪 Testing email configuration...');
    console.log('   Sending to:', recipientEmail);
    console.log('   SMTP Host:', process.env.SMTP_HOST || 'NOT SET');
    console.log('   SMTP Port:', process.env.SMTP_PORT || 'NOT SET');
    console.log('   SMTP User:', process.env.SMTP_USER || 'NOT SET');
    console.log('   SMTP From:', process.env.SMTP_FROM || 'NOT SET');

    const result = await sendEmail({
      to: recipientEmail,
      subject: '🧪 Test Email - ClaimNEU Lost and Found',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px; }
            .content { background: #f9fafb; padding: 30px; border-radius: 8px; margin-top: 20px; }
            .success { background: #10b981; color: white; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .info { background: #e0e7ff; padding: 15px; border-radius: 8px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>✅ Email Test Successful!</h1>
            <p>ClaimNEU Lost and Found System</p>
          </div>
          <div class="content">
            <div class="success">
              <strong>🎉 Your SMTP configuration is working correctly!</strong>
            </div>
            <div class="info">
              <p><strong>Test Details:</strong></p>
              <ul>
                <li>Recipient: ${recipientEmail}</li>
                <li>Sent at: ${new Date().toLocaleString()}</li>
                <li>Server: ${process.env.SMTP_HOST}</li>
              </ul>
            </div>
            <p>This confirms that:</p>
            <ul>
              <li>✅ SMTP credentials are correctly configured</li>
              <li>✅ Connection to mail server is successful</li>
              <li>✅ Emails can be delivered</li>
            </ul>
            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
              This is an automated test message from ClaimNEU Lost and Found System.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
Email Test Successful!

Your SMTP configuration is working correctly.

Test Details:
- Recipient: ${recipientEmail}
- Sent at: ${new Date().toLocaleString()}
- Server: ${process.env.SMTP_HOST}

This confirms that:
✅ SMTP credentials are correctly configured
✅ Connection to mail server is successful
✅ Emails can be delivered

---
This is an automated test message from ClaimNEU Lost and Found System.
      `.trim(),
    });

    if (result.sent) {
      console.log('✅ Test email sent successfully!');
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully! Check your inbox.',
        details: {
          recipient: recipientEmail,
          sentAt: new Date().toISOString(),
        },
      });
    } else {
      console.error('❌ Test email failed:', result.reason);
      return NextResponse.json({
        success: false,
        error: 'Failed to send test email',
        reason: result.reason,
        details: {
          smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
          smtpHost: process.env.SMTP_HOST || 'NOT SET',
        },
      }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ Test email error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
