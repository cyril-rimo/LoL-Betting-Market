export default function HistoryPage() {
  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Betting History</h1>
      <p className="text-gray-600 mb-8">
        Review your past bets, settled markets, and match outcomes.
      </p>

      {/* Summary Section */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-2">Summary</h2>
        <div className="border rounded p-6 text-gray-500">
          <p>Your profit/loss summary will appear here.</p>
        </div>
      </section>

      {/* Past Bets */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-2">Past Bets</h2>
        <div className="border rounded p-6 text-gray-500">
          <p>Historical bet data will appear here once integrated.</p>
        </div>
      </section>

      {/* Settled Markets */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Settled Markets</h2>
        <div className="border rounded p-6 text-gray-500">
          <p>Market outcomes and resolved predictions will appear here.</p>
        </div>
      </section>
    </main>
  );
}