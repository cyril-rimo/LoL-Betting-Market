export default function AboutPage() {
  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">About</h1>

      <p className="text-lg leading-relaxed mb-4">
        Match Predict is a lightweight, self‑hosted tool for League of Legends
        players. It lets a player engage their audience by allowing friends to
        bet on the outcome of their games.
      </p>

      {/* How It Works */}
      <div className="mt-10">
        <h2 className="text-2xl font-semibold mb-3">How It Works</h2>
        <p className="text-lg text-gray-700 leading-relaxed">
          This section will explain the flow of hosting a match, sharing the
          session link, and allowing participants to place their predictions.
          Content coming soon.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="mt-10 border-t pt-6">
        <h2 className="text-sm font-semibold text-gray-500 mb-2">Disclaimer</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          This software is provided “as is,” without warranty of any kind. The
          author is not responsible for how this code is used or any outcomes
          resulting from its use.
        </p>
      </div>
    </main>
  );
}