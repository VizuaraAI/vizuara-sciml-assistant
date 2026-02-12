'use client';

import { useState, useEffect } from 'react';

interface Student {
  id: string;
  name: string;
  email: string;
  password: string;
  currentPhase: string;
  enrollmentDate: string;
}

interface OnboardedStudent {
  name: string;
  email: string;
  password: string;
  joiningDate: string;
  endDate: string;
  welcomeMessage: string;
}

export default function AdminDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarding, setIsOnboarding] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);

  // Result state
  const [onboardedStudent, setOnboardedStudent] = useState<OnboardedStudent | null>(null);
  const [error, setError] = useState('');

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

    try {
      const res = await fetch('/api/admin/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, joiningDate }),
      });

      const data = await res.json();

      if (data.success) {
        setOnboardedStudent({
          name: data.data.name,
          email: data.data.email,
          password: data.data.password,
          joiningDate: data.data.joiningDate,
          endDate: data.data.endDate,
          welcomeMessage: data.data.welcomeMessage,
        });
        setName('');
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
    navigator.clipboard.writeText(text);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50 px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/vizuara-logo.png"
              alt="Vizuara"
              className="w-12 h-12 object-contain"
            />
            <div>
              <h1 className="text-2xl font-bold text-white">Vizuara Admin Dashboard</h1>
              <p className="text-slate-400">GenAI Bootcamp - Student Onboarding</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/mentor"
              className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors"
            >
              Mentor Dashboard
            </a>
            <a
              href="/login"
              className="px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Login Page
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Onboarding Form */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Onboard New Student
            </h2>

            <form onSubmit={handleOnboard} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Student Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g., Vishnu Kumar"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="e.g., vishnu@example.com"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Joining Date
                </label>
                <input
                  type="date"
                  value={joiningDate}
                  onChange={e => setJoiningDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isOnboarding}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-200 disabled:opacity-50"
              >
                {isOnboarding ? 'Creating Student...' : 'Create Student & Generate Credentials'}
              </button>
            </form>

            {/* Onboarded Student Result */}
            {onboardedStudent && (
              <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                <h3 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Student Created Successfully!
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                    <div>
                      <p className="text-xs text-slate-400">Name</p>
                      <p className="text-white font-medium">{onboardedStudent.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                    <div>
                      <p className="text-xs text-slate-400">Email (Login)</p>
                      <p className="text-white font-mono">{onboardedStudent.email}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(onboardedStudent.email)}
                      className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                      title="Copy"
                    >
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                    <div>
                      <p className="text-xs text-slate-400">Password</p>
                      <p className="text-emerald-400 font-mono text-lg">{onboardedStudent.password}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(onboardedStudent.password)}
                      className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                      title="Copy"
                    >
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>

                  <div className="p-3 bg-slate-900/50 rounded-lg">
                    <p className="text-xs text-slate-400">Mentorship Period</p>
                    <p className="text-white">{onboardedStudent.joiningDate} - {onboardedStudent.endDate}</p>
                  </div>

                  <div className="p-3 bg-slate-900/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-slate-400">Welcome Message (Draft Created)</p>
                      <button
                        onClick={() => copyToClipboard(onboardedStudent.welcomeMessage)}
                        className="text-xs text-emerald-400 hover:text-emerald-300"
                      >
                        Copy Message
                      </button>
                    </div>
                    <p className="text-slate-300 text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {onboardedStudent.welcomeMessage}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Students List */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              All Students ({students.length})
            </h2>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
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
                    className="p-4 bg-slate-900/50 border border-slate-700/50 rounded-xl hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                          student.currentPhase === 'phase1'
                            ? 'bg-gradient-to-br from-blue-500 to-blue-700'
                            : 'bg-gradient-to-br from-emerald-500 to-emerald-700'
                        }`}>
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-white">{student.name}</p>
                          <p className="text-sm text-slate-400">{student.email}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        student.currentPhase === 'phase1'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {student.currentPhase === 'phase1' ? 'Phase I' : 'Phase II'}
                      </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between">
                      <div className="text-xs text-slate-500">
                        Joined: {new Date(student.enrollmentDate).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Password:</span>
                        <code className="text-xs text-emerald-400 bg-slate-800 px-2 py-1 rounded">
                          {student.password}
                        </code>
                        <button
                          onClick={() => copyToClipboard(student.password)}
                          className="p-1 hover:bg-slate-700 rounded transition-colors"
                          title="Copy password"
                        >
                          <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
