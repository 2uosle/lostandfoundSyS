import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated Gradient Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-float"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-5xl mx-auto">
            {/* Icon with enhanced animation */}
            <div className="mb-8 inline-block animate-in zoom-in-95 duration-700">
              <div className="text-7xl sm:text-8xl md:text-9xl hover:scale-110 transition-transform duration-300 cursor-default">
                🔍
              </div>
            </div>
            
            {/* Main Heading with stagger animation */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-6 tracking-tight animate-in slide-in-from-bottom-4 duration-700 delay-150">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent bg-200% animate-gradient-flow">
                NEU Claim
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl sm:text-2xl md:text-3xl text-gray-600 dark:text-gray-300 mb-4 font-light animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
              Reuniting people with their belongings
            </p>
            
            <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 mb-16 max-w-2xl mx-auto animate-in fade-in duration-700 delay-500">
              NEU Claim is a lost and found system. Report lost items, browse found items,
              and use our intelligent matching system to help recover what matters most.
            </p>
            
            {/* CTA Buttons with hover animations */}
            <div className="grid grid-cols-1 gap-6 max-w-3xl mx-auto mb-20 animate-in slide-in-from-bottom-4 duration-700 delay-700">
              <Link 
                href="/lost"
                className="group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl 
                              group-hover:scale-105 transition-all duration-300 group-hover:shadow-2xl 
                              group-hover:shadow-blue-500/50"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-2xl opacity-0 
                              group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative px-8 py-8 sm:py-10">
                  <div className="text-4xl sm:text-5xl mb-4 group-hover:scale-110 transition-transform duration-300 
                                inline-block group-hover:rotate-12">
                    📢
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold mb-3 text-white">
                    Report Lost Item
                  </h3>
                  <p className="text-sm sm:text-base text-blue-100 group-hover:text-white transition-colors duration-300">
                    Lost something valuable? Start here to find it.
                  </p>
                  <div className="mt-4 inline-flex items-center text-sm font-semibold text-white">
                    Get Started
                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform duration-300" 
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            </div>

            {/* Features Grid with stagger animations */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <div className="bg-white/50 dark:bg-white/5 backdrop-blur-lg border border-gray-200 dark:border-gray-800 
                            rounded-2xl p-6 hover:scale-105 hover:shadow-xl transition-all duration-300 
                            hover:border-blue-300 dark:hover:border-blue-700 group cursor-default
                            animate-in fade-in slide-in-from-bottom-4 duration-700 delay-[900ms]">
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">🤖</div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Smart Matching
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  AI-powered algorithm matches lost and found items automatically
                </p>
              </div>
              
              <div className="bg-white/50 dark:bg-white/5 backdrop-blur-lg border border-gray-200 dark:border-gray-800 
                            rounded-2xl p-6 hover:scale-105 hover:shadow-xl transition-all duration-300 
                            hover:border-purple-300 dark:hover:border-purple-700 group cursor-default
                            animate-in fade-in slide-in-from-bottom-4 duration-700 delay-[1000ms]">
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">🔒</div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Secure & Private
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your information is protected and only shared when matched
                </p>
              </div>
              
              <div className="bg-white/50 dark:bg-white/5 backdrop-blur-lg border border-gray-200 dark:border-gray-800 
                            rounded-2xl p-6 hover:scale-105 hover:shadow-xl transition-all duration-300 
                            hover:border-pink-300 dark:hover:border-pink-700 group cursor-default
                            animate-in fade-in slide-in-from-bottom-4 duration-700 delay-[1100ms]">
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">⚡</div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Fast Results
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
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

