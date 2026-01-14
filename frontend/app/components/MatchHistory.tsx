"use client";

import { useEffect, useState } from "react";

type MatchCard = {
  matchId: string;
  win: boolean | null;
  champion: string;
  role: string;
  kda: string;
  kdaRatio: number;
  cs: number;
  gold: number;
  damage: number;
  items: number[];
  summonerSpells: { d: number; f: number };
  notFound?: boolean;
};

export default function MatchHistory({ initialMatches = [] }: { initialMatches?: MatchCard[] }) {
  const [matches, setMatches] = useState<MatchCard[]>(initialMatches);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {matches.map((m) => (
        <MatchCardComponent key={m.matchId} match={m} />
      ))}
    </div>
  );
}

function MatchCardComponent({ match }: { match: MatchCard }) {
  const winColor = match.win ? "bg-green-700" : "bg-red-700";

  return (
    <div className={`rounded-lg p-4 text-white ${winColor}`}>
      <div className="flex justify-between mb-2">
        <span className="font-bold">{match.champion}</span>
        <span className="opacity-80">{match.role}</span>
      </div>

      {match.notFound ? (
        <div className="text-gray-300">No player data found</div>
      ) : (
        <>
          <div className="flex justify-between text-sm mb-2">
            <span>KDA: {match.kda}</span>
            <span>Ratio: {match.kdaRatio}</span>
          </div>

          <div className="flex justify-between text-sm mb-2">
            <span>CS: {match.cs}</span>
            <span>Gold: {match.gold}</span>
          </div>

          <div className="flex justify-between text-sm mb-2">
            <span>Damage: {match.damage}</span>
          </div>

        </>
      )}
    </div>
  );
}