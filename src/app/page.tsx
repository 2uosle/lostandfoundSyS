import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Gradient Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-5xl mx-auto">
            {/* Icon with animation */}
            <div className="mb-8 inline-block animate-bounce-slow">
              <div className="text-7xl sm:text-8xl md:text-9xl">🔍</div>
            </div>
            
            {/* Main Heading */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-6 tracking-tight">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Lost & Found
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl sm:text-2xl md:text-3xl text-gray-600 mb-4 font-light">
              Reuniting people with their belongings
            </p>
            
            <p className="text-base sm:text-lg text-gray-500 mb-16 max-w-2xl mx-auto">
              Report lost items, browse found items, and use our intelligent matching system 
              to help recover what matters most.
            </p>
            
            {/* CTA Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto mb-20">
              <Link 
                href="/lost"
                className="group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl 
                              group-hover:scale-105 transition-transform duration-300"></div>
                <div className="relative px-8 py-8 sm:py-10">
                  <div className="text-4xl sm:text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">📢</div>
                  <h3 className="text-xl sm:text-2xl font-bold mb-3 text-white">
                    Report Lost Item
                  </h3>
                  <p className="text-sm sm:text-base text-blue-100">
                    Lost something valuable? Start here to find it.
                  </p>
                  <div className="mt-4 inline-flex items-center text-sm font-semibold text-white">
                    Get Started
                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
              
              <Link 
                href="/found"
                className="group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl 
                              group-hover:scale-105 transition-transform duration-300"></div>
                <div className="relative px-8 py-8 sm:py-10">
                  <div className="text-4xl sm:text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">✨</div>
                  <h3 className="text-xl sm:text-2xl font-bold mb-3 text-white">
                    Report Found Item
                  </h3>
                  <p className="text-sm sm:text-base text-green-100">
                    Found something? Help return it to its owner.
                  </p>
                  <div className="mt-4 inline-flex items-center text-sm font-semibold text-white">
                    Get Started
                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <div className="bg-white/50 backdrop-blur-lg border border-gray-200 rounded-2xl p-6">
                <div className="text-3xl mb-3">🤖</div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Smart Matching
                </h4>
                <p className="text-sm text-gray-600">
                  AI-powered algorithm matches lost and found items automatically
                </p>
              </div>
              
              <div className="bg-white/50 backdrop-blur-lg border border-gray-200 rounded-2xl p-6">
                <div className="text-3xl mb-3">🔒</div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Secure & Private
                </h4>
                <p className="text-sm text-gray-600">
                  Your information is protected and only shared when matched
                </p>
              </div>
              
              <div className="bg-white/50 backdrop-blur-lg border border-gray-200 rounded-2xl p-6">
                <div className="text-3xl mb-3">⚡</div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Fast Results
                </h4>
                <p className="text-sm text-gray-600">
                  Get notified instantly when potential matches are found
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </main>
  );
}
