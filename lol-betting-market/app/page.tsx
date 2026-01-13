"use client";

import { useEffect, useState } from "react";

export default function HomePage() {
  const [marketUrl, setMarketUrl] = useState<string | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;

    function connect() {
      ws = new WebSocket("ws://localhost:8000/ws");

      //window.ws = ws; // for console debugging

      ws.onopen = () => {
        console.log("WebSocket connected");
      };

      // listen to event messages coming from the backend app
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "market_created") { // if type attr doesn't exist, then the front end code ignores it
            console.log("Received market:", data.url);
            setMarketUrl(data.url);
          }

          if (data?.type === "STOP") {
            setMarketUrl(null);
          }
        } catch (err) {
          console.error("WS parse error:", err);
        }
      };


      ws.onclose = () => {
        console.log("WebSocket disconnected — retrying in 1s");
        setTimeout(connect, 1000);
      };
    }

    connect();  

    return () => {
      if (ws) ws.close();
    };
  }, []);

  useEffect(() => {
    console.log("marketUrl changed:", marketUrl);
  }, [marketUrl]);

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