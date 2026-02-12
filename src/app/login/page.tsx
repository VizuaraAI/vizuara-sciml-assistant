'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [loginType, setLoginType] = useState<'student' | 'mentor'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: loginType }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.data.user));
        localStorage.setItem('studentId', data.data.studentId || '');

        if (loginType === 'mentor') {
          router.push('/mentor');
        } else {
          router.push('/student');
        }
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fbfbfd] flex flex-col">
      {/* Header */}
      <header className="py-4 px-6">
        <div className="max-w-6xl mx-auto">
          <span className="text-[#1d1d1f] font-semibold text-xl tracking-tight">Vizuara</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 pb-20">
        <div className="w-full max-w-[360px]">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-[32px] font-semibold text-[#1d1d1f] tracking-tight leading-tight">
              Sign in
            </h1>
            <p className="text-[17px] text-[#86868b] mt-2">
              GenAI Professional Bootcamp
            </p>
          </div>

          {/* Login Type Selector */}
          <div className="flex gap-1 p-1 bg-[#f5f5f7] rounded-lg mb-6">
            <button
              onClick={() => setLoginType('student')}
              className={`flex-1 py-2.5 text-[15px] font-medium rounded-md transition-all duration-200 ${
                loginType === 'student'
                  ? 'bg-white text-[#1d1d1f] shadow-sm'
                  : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              Student
            </button>
            <button
              onClick={() => setLoginType('mentor')}
              className={`flex-1 py-2.5 text-[15px] font-medium rounded-md transition-all duration-200 ${
                loginType === 'mentor'
                  ? 'bg-white text-[#1d1d1f] shadow-sm'
                  : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              Mentor
            </button>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5 ml-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-3 bg-white border border-[#d2d2d7] rounded-xl text-[17px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5 ml-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 bg-white border border-[#d2d2d7] rounded-xl text-[17px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] transition-colors"
                required
              />
            </div>

            {error && (
              <div className="px-4 py-3 bg-[#fff5f5] border border-[#fed7d7] rounded-xl text-[15px] text-[#c53030]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[17px] font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Continue'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-[#d2d2d7]" />
            <span className="text-[13px] text-[#86868b]">or</span>
            <div className="flex-1 h-px bg-[#d2d2d7]" />
          </div>

          {/* Admin Link */}
          <a
            href="/admin"
            className="block w-full py-3 bg-white border border-[#d2d2d7] text-[#1d1d1f] text-[17px] font-medium rounded-xl text-center hover:bg-[#f5f5f7] transition-colors"
          >
            Admin Dashboard
          </a>

          {/* Footer Links */}
          <div className="mt-8 text-center">
            <p className="text-[13px] text-[#86868b]">
              Need help?{' '}
              <a href="mailto:support@vizuara.com" className="text-[#0071e3] hover:underline">
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 px-6 border-t border-[#d2d2d7]">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-[12px] text-[#86868b]">
            Copyright © 2024 Vizuara. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
