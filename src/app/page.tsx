import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl mx-auto text-center">
        {/* Logo */}
        <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-xl shadow-violet-200">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-slate-800 mb-4 tracking-tight">
          Vizuara AI Bootcamp
        </h1>
        <p className="text-lg text-slate-500 mb-12 max-w-md mx-auto">
          Your personal AI teaching assistant for the Generative AI Professional Bootcamp
        </p>

        {/* Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Student Portal */}
          <Link
            href="/student"
            className="group p-8 bg-white rounded-2xl shadow-soft hover:shadow-soft-lg border border-slate-200/60 hover:border-violet-300 transition-all duration-300"
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <svg className="w-7 h-7 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Student Portal</h2>
            <p className="text-slate-500 text-sm">
              Access your inbox, send messages to Dr. Raj, and track your learning journey
            </p>
          </Link>

          {/* Mentor Portal */}
          <Link
            href="/mentor"
            className="group p-8 bg-white rounded-2xl shadow-soft hover:shadow-soft-lg border border-slate-200/60 hover:border-amber-300 transition-all duration-300"
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Mentor Dashboard</h2>
            <p className="text-slate-500 text-sm">
              Review AI-generated drafts, edit responses, and manage all your students
            </p>
          </Link>
        </div>

        {/* Debug link */}
        <div className="text-sm text-slate-400">
          <Link href="/test" className="hover:text-violet-600 transition-colors">
            Developer Test UI →
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-8 text-center text-sm text-slate-400">
        Powered by Dr. Raj Dandekar, PhD (MIT) • Vizuara
      </footer>
    </main>
  );
}
