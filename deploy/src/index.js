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

  broadcast(message) {
    const stringified = JSON.stringify(message);
    
    // Get all WebSockets currently connected to this specific DO instance
    const sessions = this.ctx.getWebSockets();
    
    sessions.forEach(ws => {
      try {
        ws.send(stringified);
      } catch (e) {
        // This handles sockets that are closed but not yet removed from the list
        console.log("Failed to send to a socket, ignoring.");
      }
    });
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
      const now = new Date().toISOString();

      // 1. Save the match to SQL as usual
      this.ctx.storage.sql.exec(
        "INSERT OR REPLACE INTO matches (id, data) VALUES (?, ?)",
        match.matchId,
        payload
      );

      // 2. Save the GLOBAL last updated time to metadata storage
      await this.ctx.storage.put("last_updated_time", now);

      return new Response("OK", { status: 200, headers: CORS_HEADERS });
    }

    // -------------------------------
    // 3. Frontend fetches last 10 matches
    // -------------------------------
    if (request.method === "GET" && url.pathname === "/matches/latest") {
      const rows = this.ctx.storage.sql.exec(
        "SELECT data FROM matches ORDER BY timestamp DESC LIMIT 10"
      ).toArray();

      // Fetch the global timestamp we saved
      const lastUpdated = await this.ctx.storage.get("last_updated_time");

      // Each row is an object where keys are column names (e.g., { data: "..." })
      const matches = rows.map(r => JSON.parse(r.data));

      return new Response(JSON.stringify({matches, lastUpdated: lastUpdated || null}), {
        headers: { "Content-Type": "application/json" , ... CORS_HEADERS }
      });
    }

    // ---------------------------------------------------
    // 4. Collector pushes market start and stop messages
    // ---------------------------------------------------
    if (request.method === "POST") {
      try {
        const data = await request.json();

        // This triggers the 'ws.onmessage' logic in your React frontend
        if (data.type === "market_created") {
          // Save to persistent storage
          await this.ctx.storage.put("current_market_url", data.url);
          this.broadcast(data); // Send to live users
        } 

        else if (data.type === "STOP") {
          // Remove from persistent storage
          await this.ctx.storage.delete("current_market_url");
          this.broadcast(data); // Clear for live users
        }

        return new Response(JSON.stringify({ success: true }), { 
          status: 200, 
          headers: CORS_HEADERS 
        });
      } catch (err) {
        return new Response(err.message, { status: 400, headers: CORS_HEADERS });
      }
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