"use client";

import MatchHistory from "@/app/components/MatchHistory";
import { useEffect, useState } from "react";

export default function HistoryPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL;

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${WORKER_URL}matches/latest`, { 
          cache: "no-store"
        });
        const data = await res.json();
        
        setMatches(data.matches);
        setLastUpdated(data.lastUpdated);

      } catch (err) {
        console.error("Failed to fetch match history:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [WORKER_URL]);

  if (loading) {
    return (
      <div className="p-6 text-gray-400">
        Loading match history…
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4 text-center">Match History</h1>
      <p className="text-sm text-gray-500 flex items-center justify-center gap-2 mb-10">
        <span className="relative flex h-2 w-2">
          {/* Only show the pinging animation if we actually have a timestamp */}
          {lastUpdated && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${lastUpdated ? 'bg-green-500' : 'bg-gray-300'}`}></span>
        </span>
        
        Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "Not available"}
      </p>
      <MatchHistory initialMatches={matches} />
    </div>
  );
}