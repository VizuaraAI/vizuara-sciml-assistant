/**
 * Email Service
 * Send emails using Brevo (formerly Sendinblue) API
 *
 * Setup:
 * 1. Log in to your Brevo account at https://app.brevo.com
 * 2. Go to SMTP & API > API Keys
 * 3. Create or copy your API key
 * 4. Set BREVO_API_KEY and BREVO_FROM_EMAIL in environment
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
  const loginUrl = 'https://vizuara-sciml-assistant-production.up.railway.app/student';

  const emailContent = `Hello ${preferredName}!

Let us get started with the Scientific ML Bootcamp.

Login here: ${loginUrl}

Email: ${email}
Password: ${password}

When you log in to this website, you will already see an onboarding email with the next steps of action. All our communication will happen on this website.

Let us get started.

Best regards,
Dr. Raj Dandekar`;

  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  const BREVO_FROM_EMAIL = process.env.BREVO_FROM_EMAIL || 'raj@vizuara.com';
  const BREVO_FROM_NAME = process.env.BREVO_FROM_NAME || 'Raj Dandekar';

  if (!BREVO_API_KEY) {
    console.error('BREVO_API_KEY is not configured');
    return {
      success: false,
      error: 'Email service not configured. Please set BREVO_API_KEY environment variable.',
    };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: BREVO_FROM_NAME,
          email: BREVO_FROM_EMAIL,
        },
        to: [
          {
            email: to,
            name: preferredName,
          },
        ],
        subject: "Let's get started with the Scientific ML Bootcamp.",
        textContent: emailContent,
      }),
    });

    // Brevo returns 201 Created on success with messageId
    if (response.status === 201) {
      const data = await response.json();
      console.log('Email sent successfully via Brevo, messageId:', data.messageId);
      return { success: true };
    }

    const errorData = await response.json().catch(() => ({}));
    console.error('Brevo API error:', response.status, errorData);
    return {
      success: false,
      error: errorData.message || `Brevo error: ${response.status}`,
    };
  } catch (error) {
    console.error('Failed to send email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}
