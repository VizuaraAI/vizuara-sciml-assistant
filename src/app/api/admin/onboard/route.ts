/**
 * Admin Onboarding API
 * POST /api/admin/onboard - Create a new student with auto-generated credentials
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Generate a simple password
function generatePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Generate username from name
function generateUsername(name: string): string {
  const base = name.toLowerCase().replace(/\s+/g, '.');
  const suffix = Math.floor(Math.random() * 1000);
  return `${base}${suffix}`;
}

// Format date for display
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, preferredName, email, joiningDate } = body;

    if (!name || !email || !joiningDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, email, joiningDate' },
        { status: 400 }
      );
    }

    // Use preferred name or default to first name
    const displayName = preferredName || name.split(' ')[0];

    // Generate credentials
    const username = generateUsername(name);
    const password = generatePassword();

    // Calculate end date (4 months from joining)
    const startDate = new Date(joiningDate);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 4);

    // Create user (using email as login identifier)
    const userId = randomUUID();
    const normalizedEmail = email.toLowerCase().trim();
    const { error: userError } = await supabase.from('users').insert({
      id: userId,
      name,
      preferred_name: displayName,
      email: normalizedEmail,
      role: 'student',
      password_hash: password, // In production, this should be hashed
    });

    if (userError) {
      console.error('Failed to create user:', userError);
      throw new Error(userError.message);
    }

    // Create student record
    const studentId = randomUUID();
    const { error: studentError } = await supabase.from('students').insert({
      id: studentId,
      user_id: userId,
      current_phase: 'phase1',
      current_topic_index: 1,
      current_milestone: 0,
      enrollment_date: startDate.toISOString(),
    });

    if (studentError) {
      console.error('Failed to create student:', studentError);
      // Rollback user creation
      await supabase.from('users').delete().eq('id', userId);
      throw new Error(studentError.message);
    }

    // Create conversation for the student
    const conversationId = randomUUID();
    const { error: convError } = await supabase.from('conversations').insert({
      id: conversationId,
      student_id: studentId,
    });

    if (convError) {
      console.error('Failed to create conversation:', convError);
    }

    // Generate welcome message using preferred name
    const welcomeMessage = `Hello ${displayName},

Welcome to the SciML Bootcamp!

Here are the next steps to be followed:

(a) Go to your dashboard at https://flyvidesh.online/ml-bootcamp. We have activated the SciML Bootcamp for you now.

(b) We will allocate 1-1.5 months for you to go through the course videos and assignments. You can start going through the modules sequentially.

(c) Whenever you face any doubts or queries, ask here. We will respond immediately. We won't be having voice or video calls. Hence, it is very important that you are very proactive on email.

(d) The remaining 2-2.5 months will be spent on research.

This is a 4 month mentorship from ${formatDate(startDate)} - ${formatDate(endDate)}.

Let's get started!

Let me know if you have any doubts or questions!

Best regards,
Dr. Raj Dandekar,
MIT PhD`;

    // Create welcome message as sent (auto-approved, no mentor review needed)
    const { error: msgError } = await supabase.from('messages').insert({
      id: randomUUID(),
      conversation_id: conversationId,
      role: 'agent',
      content: welcomeMessage,
      status: 'approved',
    });

    if (msgError) {
      console.error('Failed to create welcome message:', msgError);
    }

    return NextResponse.json({
      success: true,
      data: {
        studentId,
        userId,
        name,
        preferredName: displayName,
        email,
        username,
        password,
        joiningDate: formatDate(startDate),
        endDate: formatDate(endDate),
        welcomeMessage,
      },
    });
  } catch (error) {
    console.error('Onboarding API error:', error);

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - List all students with their credentials
export async function GET() {
  try {
    // Use explicit foreign key reference to avoid ambiguity (students has user_id and mentor_id)
    const { data: students, error } = await supabase
      .from('students')
      .select(`
        id,
        user_id,
        current_phase,
        current_topic_index,
        current_milestone,
        enrollment_date,
        users!user_id (
          id,
          name,
          preferred_name,
          email,
          password_hash
        )
      `)
      .order('enrollment_date', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const formattedStudents = (students || []).map((s: any) => ({
      id: s.id,
      userId: s.user_id,
      name: s.users.name,
      preferredName: s.users.preferred_name || s.users.name?.split(' ')[0] || '',
      email: s.users.email,
      password: s.users.password_hash,
      currentPhase: s.current_phase,
      enrollmentDate: s.enrollment_date,
    }));

    return NextResponse.json({
      success: true,
      data: { students: formattedStudents },
    });
  } catch (error) {
    console.error('Get students error:', error);

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
