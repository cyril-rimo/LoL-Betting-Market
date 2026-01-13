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

// This class acts as your "Hub"
export class MarketBroadcaster extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    // ctx.storage.sql is available on both Free and Paid plans in 2026
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async fetch(request) {
    const upgradeHeader = request.headers.get("Upgrade");

    // FRONTEND: Handles WebSocket connections from your Cloudflare Page
    if (upgradeHeader === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      // Connect the client and store the session
      this.ctx.acceptWebSocket(server);
      
      return new Response(null, { status: 101, webSocket: client });
    }

    // BACKEND: Handles POST requests from your Python script
    if (request.method === "POST") {
      const payload = await request.text();

      // 1. Save to SQLite so history persists if a user refreshes
      this.ctx.storage.sql.exec("INSERT INTO events (data) VALUES (?)", payload);

      // 2. Broadcast to all active browser tabs
      this.ctx.getWebSockets().forEach(ws => {
        try {
          ws.send(payload);
        } catch (e) {
          // Clean up closed connections
        }
      });

      return new Response("Broadcasted", { status: 200 });
    }

    return new Response("Expected WebSocket or POST", { status: 400 });
  }
}

// This is the "Entry Point" that directs everyone to the Hub
export default {
  async fetch(request, env) {
    // We use a fixed ID so everyone joins the same room
    const id = env.MARKET_HUB.idFromName("global-market");
    const stub = env.MARKET_HUB.get(id);
    return stub.fetch(request);
  }
};