/**
 * Login API
 * POST /api/auth/login - Authenticate user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, role } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email (case-insensitive)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .ilike('email', email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check password (in production, use proper hashing like bcrypt)
    if (user.password_hash !== password) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check role
    if (role === 'mentor' && user.role !== 'mentor') {
      return NextResponse.json(
        { success: false, error: 'This account is not a mentor account' },
        { status: 403 }
      );
    }

    if (role === 'student' && user.role !== 'student') {
      return NextResponse.json(
        { success: false, error: 'This account is not a student account' },
        { status: 403 }
      );
    }

    // Get student ID if this is a student
    let studentId = null;
    if (user.role === 'student') {
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single();

      studentId = student?.id;
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        studentId,
      },
    });
  } catch (error) {
    console.error('Login error:', error);

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
