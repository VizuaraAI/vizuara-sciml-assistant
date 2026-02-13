/**
 * Email Service
 * Send emails using SendGrid API
 *
 * Setup:
 * 1. Create free account at https://sendgrid.com
 * 2. Go to Settings > API Keys > Create API Key (Full Access)
 * 3. Go to Settings > Sender Authentication > Verify a Single Sender
 *    - Add your email (e.g., teamvizuara@gmail.com)
 *    - Click verification link in your inbox
 * 4. Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL in environment
 *
 * Free tier: 100 emails/day
 */

interface WelcomeEmailParams {
  to: string;
  preferredName: string;
  email: string;
  password: string;
}

export async function sendWelcomeEmail({
  to,
  preferredName,
  email,
  password,
}: WelcomeEmailParams): Promise<{ success: boolean; error?: string }> {
  const loginUrl = 'https://vizuara-genai-assistant-production.up.railway.app/student';

  const emailContent = `Hello ${preferredName}!

Let us get started with the Generative AI Bootcamp.

Login here: ${loginUrl}

Email: ${email}
Password: ${password}

When you log in to this website, you will already see an onboarding email with the next steps of action. All our communication will happen on this website.

Let us get started.

Best regards,
Dr Raj Dandekar`;

  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'rajatdandekar@vizuara.com';

  if (!SENDGRID_API_KEY) {
    console.error('SENDGRID_API_KEY is not configured');
    return {
      success: false,
      error: 'Email service not configured. Please set SENDGRID_API_KEY environment variable.',
    };
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: to }],
          },
        ],
        from: {
          email: SENDGRID_FROM_EMAIL,
          name: 'Dr Raj Dandekar',
        },
        subject: "Let's get started",
        content: [
          {
            type: 'text/plain',
            value: emailContent,
          },
        ],
      }),
    });

    // SendGrid returns 202 Accepted on success (no body)
    if (response.status === 202) {
      console.log('Email sent successfully via SendGrid');
      return { success: true };
    }

    const errorData = await response.json().catch(() => ({}));
    console.error('SendGrid API error:', response.status, errorData);
    return {
      success: false,
      error: errorData.errors?.[0]?.message || `SendGrid error: ${response.status}`,
    };
  } catch (error) {
    console.error('Failed to send email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}
