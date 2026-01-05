"use client";

import { useSearchParams } from "next/navigation";

export default function HomePage() {
  const params = useSearchParams();
  const marketUrl = params.get("market");

  return (
    <main className="p-8 max-w-5xl mx-auto space-y-12">

      {/* 1. Manifold Market Embed */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Live Market</h2>

        {marketUrl && (
          <div className="w-full h-[700px] border rounded-lg overflow-hidden">
            <iframe
              src={marketUrl}
              className="w-full h-full"
              style={{ border: "none" }}
            />
          </div>
        )}
      </section>

      {/* 2. Game Info */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Game Info</h2>
        <div className="border rounded-lg p-4 text-gray-700">
          {/* Placeholder content */}
          <p>Game details will appear here once integrated with the Riot API.</p>
        </div>
      </section>

      {/* 3. Live Event Log */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Live Event Log</h2>
        <div className="border rounded-lg p-4 text-gray-700 h-64 overflow-y-auto">
          {/* Placeholder content */}
          <p>Live events will stream here during the match.</p>
        </div>
      </section>
    </main>
  );
}