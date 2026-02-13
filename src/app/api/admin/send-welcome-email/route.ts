/**
 * Send Welcome Email API
 * POST /api/admin/send-welcome-email
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/services/email/send-email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, preferredName, email, password } = body;

    if (!to || !preferredName || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: to, preferredName, email, password' },
        { status: 400 }
      );
    }

    const result = await sendWelcomeEmail({
      to,
      preferredName,
      email,
      password,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Send welcome email error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
