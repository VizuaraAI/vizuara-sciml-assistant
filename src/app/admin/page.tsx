'use client';

import { useState, useEffect } from 'react';
import { playClickSound, playSuccessSound } from '@/lib/sounds';

interface Student {
  id: string;
  name: string;
  preferredName: string;
  email: string;
  password: string;
  currentPhase: string;
  enrollmentDate: string;
}

interface OnboardedStudent {
  name: string;
  preferredName: string;
  email: string;
  password: string;
  joiningDate: string;
  endDate: string;
  welcomeMessage: string;
  emailSent?: boolean;
}

export default function AdminDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarding, setIsOnboarding] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [email, setEmail] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);

  // Result state
  const [onboardedStudent, setOnboardedStudent] = useState<OnboardedStudent | null>(null);
  const [error, setError] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  async function fetchStudents() {
    try {
      const res = await fetch('/api/admin/onboard');
      const data = await res.json();
      if (data.success) {
        setStudents(data.data.students);
      }
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleOnboard(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setOnboardedStudent(null);
    setIsOnboarding(true);
    playClickSound();

    try {
      const res = await fetch('/api/admin/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, preferredName: preferredName || name.split(' ')[0], email, joiningDate }),
      });

      const data = await res.json();

      if (data.success) {
        playSuccessSound();
        setOnboardedStudent({
          name: data.data.name,
          preferredName: data.data.preferredName,
          email: data.data.email,
          password: data.data.password,
          joiningDate: data.data.joiningDate,
          endDate: data.data.endDate,
          welcomeMessage: data.data.welcomeMessage,
        });
        setName('');
        setPreferredName('');
        setEmail('');
        setJoiningDate(new Date().toISOString().split('T')[0]);
        fetchStudents();
      } else {
        setError(data.error || 'Failed to onboard student');
      }
    } catch (err) {
      setError('Failed to onboard student. Please try again.');
    } finally {
      setIsOnboarding(false);
    }
  }

  function copyToClipboard(text: string) {
    playClickSound();
    navigator.clipboard.writeText(text);
  }

  async function handleSendWelcomeEmail() {
    if (!onboardedStudent) return;

    setIsSendingEmail(true);
    setEmailError('');
    playClickSound();

    try {
      const res = await fetch('/api/admin/send-welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: onboardedStudent.email,
          preferredName: onboardedStudent.preferredName,
          email: onboardedStudent.email,
          password: onboardedStudent.password,
        }),
      });

      const data = await res.json();

      if (data.success) {
        playSuccessSound();
        setOnboardedStudent({ ...onboardedStudent, emailSent: true });
      } else {
        setEmailError(data.error || 'Failed to send email');
      }
    } catch (err) {
      setEmailError('Failed to send email. Please try again.');
    } finally {
      setIsSendingEmail(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fbfbfd]">
      {/* Header */}
      <header className="bg-white border-b border-[#e5e5e7] px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/vizuara-logo.png"
              alt="Vizuara"
              className="w-10 h-10 object-contain"
            />
            <div>
              <h1 className="text-xl font-semibold text-[#1d1d1f]">Admin Dashboard</h1>
              <p className="text-sm text-[#86868b]">GenAI Bootcamp - Student Onboarding</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/mentor"
              className="px-4 py-2 bg-[#f5f5f7] text-[#1d1d1f] rounded-lg hover:bg-[#e8e8ed] transition-colors text-sm font-medium"
            >
              Mentor Dashboard
            </a>
            <a
              href="/login"
              className="px-4 py-2 bg-[#0071e3] text-white rounded-lg hover:bg-[#0077ed] transition-colors text-sm font-medium"
            >
              Login Page
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Onboarding Form */}
          <div className="bg-white rounded-2xl border border-[#e5e5e7] p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1d1d1f] mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#34c759]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Onboard New Student
            </h2>

            <form onSubmit={handleOnboard} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g., Vishnu Kumar"
                  className="w-full px-4 py-3 bg-[#f5f5f7] border border-[#e5e5e7] rounded-xl text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">
                  Preferred Name <span className="text-[#86868b] font-normal">(what to call them in chat)</span>
                </label>
                <input
                  type="text"
                  value={preferredName}
                  onChange={e => setPreferredName(e.target.value)}
                  placeholder="e.g., Vishnu (defaults to first name if empty)"
                  className="w-full px-4 py-3 bg-[#f5f5f7] border border-[#e5e5e7] rounded-xl text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="e.g., vishnu@example.com"
                  className="w-full px-4 py-3 bg-[#f5f5f7] border border-[#e5e5e7] rounded-xl text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-2">
                  Joining Date
                </label>
                <input
                  type="date"
                  value={joiningDate}
                  onChange={e => setJoiningDate(e.target.value)}
                  className="w-full px-4 py-3 bg-[#f5f5f7] border border-[#e5e5e7] rounded-xl text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all"
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-[#fff5f5] border border-[#fed7d7] rounded-xl text-[#c53030] text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isOnboarding}
                className="w-full py-3 bg-[#34c759] hover:bg-[#2db84d] text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50"
              >
                {isOnboarding ? 'Creating Student...' : 'Create Student & Generate Credentials'}
              </button>
            </form>

            {/* Onboarded Student Result */}
            {onboardedStudent && (
              <div className="mt-6 p-4 bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl">
                <h3 className="text-base font-semibold text-[#15803d] mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Student Created Successfully!
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-[#e5e5e7]">
                    <div>
                      <p className="text-xs text-[#86868b]">Name</p>
                      <p className="text-[#1d1d1f] font-medium">{onboardedStudent.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-[#e5e5e7]">
                    <div>
                      <p className="text-xs text-[#86868b]">Email (Login)</p>
                      <p className="text-[#1d1d1f] font-mono text-sm">{onboardedStudent.email}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(onboardedStudent.email)}
                      className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
                      title="Copy"
                    >
                      <svg className="w-4 h-4 text-[#86868b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-[#e5e5e7]">
                    <div>
                      <p className="text-xs text-[#86868b]">Password</p>
                      <p className="text-[#34c759] font-mono text-lg font-semibold">{onboardedStudent.password}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(onboardedStudent.password)}
                      className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
                      title="Copy"
                    >
                      <svg className="w-4 h-4 text-[#86868b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-[#e5e5e7]">
                    <p className="text-xs text-[#86868b]">Mentorship Period</p>
                    <p className="text-[#1d1d1f]">{onboardedStudent.joiningDate} - {onboardedStudent.endDate}</p>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-[#e5e5e7]">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-[#86868b]">Welcome Message (Draft Created)</p>
                      <button
                        onClick={() => copyToClipboard(onboardedStudent.welcomeMessage)}
                        className="text-xs text-[#0071e3] hover:text-[#0077ed] font-medium"
                      >
                        Copy Message
                      </button>
                    </div>
                    <p className="text-[#424245] text-sm whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
                      {onboardedStudent.welcomeMessage}
                    </p>
                  </div>

                  {/* Send Welcome Email Button */}
                  <div className="mt-4 pt-4 border-t border-[#bbf7d0]">
                    {emailError && (
                      <div className="mb-3 p-2 bg-[#fff5f5] border border-[#fed7d7] rounded-lg text-[#c53030] text-sm">
                        {emailError}
                      </div>
                    )}

                    {onboardedStudent.emailSent ? (
                      <div className="flex items-center gap-2 text-[#15803d]">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">Welcome email sent successfully!</span>
                      </div>
                    ) : (
                      <button
                        onClick={handleSendWelcomeEmail}
                        disabled={isSendingEmail}
                        className="w-full py-3 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isSendingEmail ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Sending Email...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Send Welcome Email to {onboardedStudent.preferredName}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Students List */}
          <div className="bg-white rounded-2xl border border-[#e5e5e7] p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1d1d1f] mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#5856d6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              All Students ({students.length})
            </h2>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-12 text-[#86868b]">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p>No students yet</p>
                <p className="text-sm mt-1">Add your first student using the form</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {students.map(student => (
                  <div
                    key={student.id}
                    className="p-4 bg-[#f5f5f7] border border-[#e5e5e7] rounded-xl hover:border-[#d1d1d6] transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                          student.currentPhase === 'phase1'
                            ? 'bg-[#007aff]'
                            : 'bg-[#34c759]'
                        }`}>
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-[#1d1d1f]">{student.name}</p>
                          <p className="text-sm text-[#86868b]">{student.email}</p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        student.currentPhase === 'phase1'
                          ? 'bg-[#e3f2fd] text-[#007aff]'
                          : 'bg-[#e8f5e9] text-[#34c759]'
                      }`}>
                        {student.currentPhase === 'phase1' ? 'Phase I' : 'Phase II'}
                      </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-[#e5e5e7] flex items-center justify-between">
                      <div className="text-xs text-[#86868b]">
                        Joined: {new Date(student.enrollmentDate).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#86868b]">Password:</span>
                        <code className="text-xs text-[#34c759] bg-[#f0fdf4] px-2 py-1 rounded font-mono">
                          {student.password}
                        </code>
                        <button
                          onClick={() => copyToClipboard(student.password)}
                          className="p-1 hover:bg-white rounded transition-colors"
                          title="Copy password"
                        >
                          <svg className="w-3 h-3 text-[#86868b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
