"use client";

import { useEffect, useState } from "react";

export default function HomePage() {
  const [marketUrl, setMarketUrl] = useState<string | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;
    // Replace with your actual Worker URL
    const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL;

    function connect() {
      ws = new WebSocket(WORKER_URL);

      ws.onopen = () => {
        // console.log("✅ Connected to Cloudflare Relay");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // 1. Handle History (sent once upon connection)
          if (data.type === "history") {
            console.log("📜 Received history from SQLite:", data.data);
            if (data.data.length > 0) {
              // Set the most recent market from history
              const mostRecent = JSON.parse(data.data[0].data);
              setMarketUrl(mostRecent.url);
            }
          } 
          
          // 2. Handle Live Broadcasts
          else if (data.type === "market_created") {
            console.log("🚀 Live market received:", data.url);
            setMarketUrl(data.url);
          }

          // 3. Handle Stop/Reset
          if (data?.type === "STOP") {
            setMarketUrl(null);
          }
        } catch (err) {
          console.error("WS parse error:", err);
        }
      };

      ws.onclose = () => {
        console.log("❌ Disconnected — retrying in 2s");
        setTimeout(connect, 2000);
      };

      ws.onerror = (err) => {
        console.error("WS Error:", err);
        ws?.close();
      };
    }

    connect();

    return () => {
      if (ws) ws.close();
    };
  }, []);

  return (
    <main className="p-8 max-w-5xl mx-auto space-y-12">
      {/* 1. Manifold Market Embed */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Live Market</h2>

        {marketUrl ? (
          <div className="w-full h-[700px] border rounded-lg overflow-hidden">
            <iframe
              src={marketUrl}
              className="w-full h-full"
              style={{ border: "none" }}
            />
          </div>
        ) : (
          <p className="text-gray-500">Waiting for market…</p>
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