import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* NAVBAR */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-slate-800">

        <h2 className="text-xl font-bold">
          FOMO Analytics
        </h2>

        <div className="flex gap-6 text-gray-300">
          <a href="#" className="hover:text-white">
            Home
          </a>

          <a href="/tokens" className="hover:text-white">
            Tokens
          </a>

          <a href="#" className="hover:text-white">
            FOMO Fumble
          </a>

          <a href="#" className="hover:text-white">
            Wallet Analyzer
          </a>

          <a href="#" className="hover:text-white">
            Leaderboard
          </a>
        </div>

      </nav>

      {/* HERO SECTION */}
      <section className="flex flex-col items-center justify-center text-center px-6 min-h-[80vh]">

        <h1 className="text-5xl font-bold mb-6">
          🚀 FOMO Analytics
        </h1>

        <p className="text-xl text-gray-300 max-w-2xl mb-8">
          Track crypto tokens, analyze wallets, discover top holders,
          and calculate how much you would have made if you bought earlier.
        </p>

        <button className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold">
          Get Started
        </button>

      </section>

    </main>
  );
}