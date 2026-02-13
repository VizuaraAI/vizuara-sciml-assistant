/**
 * Email Service
 * Send emails using nodemailer with Gmail SMTP
 */

import nodemailer from 'nodemailer';

// Create reusable transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER, // hello@vizuara.com
    pass: process.env.GMAIL_APP_PASSWORD, // App password (not regular password)
  },
});

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

  try {
    await transporter.sendMail({
      from: `"Dr Raj Dandekar" <${process.env.GMAIL_USER || 'hello@vizuara.com'}>`,
      to,
      subject: 'Welcome to the Generative AI Bootcamp - Your Login Credentials',
      text: emailContent,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}
