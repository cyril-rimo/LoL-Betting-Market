/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { DurableObject } from "cloudflare:workers";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Type",
};

function handleOptions(request) {
  // Handle CORS preflight
  if (
    request.headers.get("Origin") &&
    request.headers.get("Access-Control-Request-Method")
  ) {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  // Standard OPTIONS
  return new Response(null, {
    headers: {
      Allow: "GET, POST, OPTIONS",
    },
  });
}

// This class acts as your "Hub"
export class MarketBroadcaster extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);

    // For simple display of marketURL, this is unnecessary.
    // Table for WebSocket events (your existing logic)
    /*
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    */ 

    // NEW: Table for match history
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS matches (
        id TEXT PRIMARY KEY,
        data TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async fetch(request) {
    const url = new URL(request.url);
    const upgradeHeader = request.headers.get("Upgrade");

    // -------------------------------
    // 0. OPTIONS — CORS preflight
    // -------------------------------
    if (request.method === "OPTIONS") {
      return handleOptions(request);
    }

    // -------------------------------
    // 1. WebSocket connections (unchanged)
    // -------------------------------
    if (upgradeHeader === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.ctx.acceptWebSocket(server);
      return new Response(null, { status: 101, webSocket: client });
    }

    // -------------------------------
    // 2. Collector pushes match data
    // -------------------------------
    if (request.method === "POST" && request.headers.get("X-Type") === "match") {
      const payload = await request.text();
      const match = JSON.parse(payload);
      const matchId = match.metadata.matchId;

      // Insert or replace match
      this.ctx.storage.sql.exec(
        "INSERT OR REPLACE INTO matches (id, data) VALUES (?, ?)",
        matchId,
        payload
      );

      // Keep only last 10 matches
      this.ctx.storage.sql.exec(`
        DELETE FROM matches
        WHERE id NOT IN (
          SELECT id FROM matches ORDER BY timestamp DESC LIMIT 10
        )
      `);

      return new Response("Match saved", { status: 200 });
    }

    // -------------------------------
    // 3. Frontend fetches last 10 matches
    // -------------------------------
    if (request.method === "GET" && url.pathname === "/matches/latest") {
      const result = this.ctx.storage.sql.exec(
        "SELECT data FROM matches ORDER BY timestamp DESC LIMIT 10"
      );

      const rows = result.results || [];
      const matches = rows.map(r => JSON.parse(r.data));

      return new Response(JSON.stringify(matches), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // -------------------------------
    // 4. Existing POST for event broadcasting
    // -------------------------------
    if (request.method === "POST") {
      const payload = await request.text();

      // if using events table from above
      // Save event
      /*
      this.ctx.storage.sql.exec(
        "INSERT INTO events (data) VALUES (?)",
        payload
      );
      */

      // Broadcast to all connected clients
      this.ctx.getWebSockets().forEach(ws => {
        try {
          ws.send(payload);
        } catch (e) {
          // Ignore closed sockets
        }
      });

      return new Response("Broadcasted", { status: 200 , headers: CORS_HEADERS });
    }

    return new Response("Expected WebSocket, POST, or /matches/latest", { status: 400 , headers: CORS_HEADERS });
  }
}

// Entry point that routes all requests to the DO
export default {
  async fetch(request, env) {
    const id = env.MARKET_HUB.idFromName("global-market");
    const stub = env.MARKET_HUB.get(id);
    return stub.fetch(request);
  }
};