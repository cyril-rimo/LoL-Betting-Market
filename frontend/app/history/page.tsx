"use client";

import MatchHistory from "@/app/components/MatchHistory";
import { useEffect, useState } from "react";

export default function HistoryPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL;

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${WORKER_URL}matches/latest`, { // slash at the end of the websocket URL
          cache: "no-store"
        });
        const data = await res.json();
        setMatches(data);
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
      <MatchHistory initialMatches={matches} />
    </div>
  );
}