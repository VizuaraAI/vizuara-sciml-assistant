import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8" style={{ backgroundColor: '#fbfbfd' }}>
      <div className="max-w-2xl mx-auto text-center">
        {/* Logo */}
        <div className="w-20 h-20 mx-auto mb-8 rounded-2xl flex items-center justify-center shadow-xl" style={{ backgroundColor: '#0071e3' }}>
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold mb-4 tracking-tight" style={{ color: '#1d1d1f' }}>
          Vizuara SciML Bootcamp
        </h1>
        <p className="text-lg mb-12 max-w-md mx-auto" style={{ color: '#86868b' }}>
          Your personal AI teaching assistant for the Scientific Machine Learning Bootcamp
        </p>

        {/* Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Student Portal */}
          <Link
            href="/student"
            className="group p-8 rounded-2xl transition-all duration-300 hover:-translate-y-1"
            style={{ backgroundColor: '#ffffff', border: '1px solid #e5e5e7', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: 'rgba(0, 113, 227, 0.1)' }}>
              <svg className="w-7 h-7" style={{ color: '#0071e3' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: '#1d1d1f' }}>Student Portal</h2>
            <p className="text-sm" style={{ color: '#86868b' }}>
              Access your inbox, send messages to Dr. Raj, and track your learning journey
            </p>
          </Link>

          {/* Mentor Portal */}
          <Link
            href="/mentor"
            className="group p-8 rounded-2xl transition-all duration-300 hover:-translate-y-1"
            style={{ backgroundColor: '#ffffff', border: '1px solid #e5e5e7', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: 'rgba(52, 199, 89, 0.1)' }}>
              <svg className="w-7 h-7" style={{ color: '#34c759' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: '#1d1d1f' }}>Mentor Dashboard</h2>
            <p className="text-sm" style={{ color: '#86868b' }}>
              Review AI-generated drafts, edit responses, and manage all your students
            </p>
          </Link>
        </div>

        {/* Admin link */}
        <div className="flex items-center justify-center gap-4 text-sm" style={{ color: '#86868b' }}>
          <Link href="/admin" className="transition-colors hover:underline" style={{ color: '#0071e3' }}>
            Admin Panel
          </Link>
          <span>•</span>
          <Link href="/test" className="transition-colors hover:underline" style={{ color: '#0071e3' }}>
            Developer Test UI
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-8 text-center text-sm" style={{ color: '#86868b' }}>
        Powered by Dr. Raj Dandekar, PhD (MIT) • Vizuara
      </footer>
    </main>
  );
}
