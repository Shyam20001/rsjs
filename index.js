// Created by Shyam M (https://github.com/Shyam20001)
// License: MIT
// BrahmaJS — Ultra-fast Node.js framework powered by Rust (via NAPI-RS)

const {
  startServer,
  registerJsCallback,
  respond,
  shutdownServer,
  parseFile,
  parseJsonSimd
} = require("./brahma");

const fs = require("fs");
const path = require("path");

/** ---------------- Response ---------------- */
class Response {
  constructor(reqId) {
    this.reqId = reqId;
    this.headers = {};
    this.statusCode = 200;
    this.sent = false;
  }

  status(code) { this.statusCode = code; return this; }
  set(field, value) { this.headers[field] = value; return this; }
  setHeader(field, value) { return this.set(field, value); }

  json(obj, status) {
    if (status) this.statusCode = status;
    this.headers["Content-Type"] = "application/json";
    this.send(JSON.stringify(obj));
  }

  text(str, status) {
    if (status) this.statusCode = status;
    this.headers["Content-Type"] = "text/plain";
    this.send(str);
  }

  html(html, status) {
    if (status) this.statusCode = status;
    this.headers["Content-Type"] = "text/html";
    this.send(html);
  }

  redirect(url, status = 302) {
    this.statusCode = status;
    this.headers["Location"] = url;
    this.send("");
  }


  send(body, raw = false) {
    if (this.sent) return;
    this.sent = true;
    respond(
      this.reqId,
      JSON.stringify({
        status: this.statusCode,
        headers: this.headers,
        body,
        raw
      })
    );
  }
}

/** ---------------- Request ---------------- */
class Request {
  constructor(reqId, method, path, query, headers, rawBody, params, originalUrl) {
    this.id = reqId;
    this.method = method;
    this.path = path;
    this.query = query;
    this.headers = headers;
    this.params = params;
    this.originalUrl = originalUrl;
    this.url = originalUrl;

    this._rawBody = rawBody || "";
    this._parsedBody = null;
  }

  get body() {
    if (this._parsedBody === null) {
      try {
        this._parsedBody = JSON.parse(this._rawBody || "{}");
      } catch {
        this._parsedBody = this._rawBody;
      }
    }
    return this._parsedBody;
  }

  raw() {
    return Buffer.from(this._rawBody || "");
  }


  simdjson() {
    if (typeof parseJsonSimd !== "function") {
      throw new Error("SIMD JSON not available in this build");
    }
    if (!this._rawBody) {
      throw new Error("No raw body available for SIMD parsing");
    }
    return parseJsonSimd(this._rawBody);
  }
}

/** ---------------- App ---------------- */
class BrahmaApp {
  constructor() {
    this.routes = [];
    this.middlewares = [];
  }

  use(fn) { this.middlewares.push(fn); }
  addRoute(method, routePath, handler) {
    this.routes.push({ method, routePath, handler });
  }

  get(path, handler) { this.addRoute("GET", path, handler); }
  post(path, handler) { this.addRoute("POST", path, handler); }
  put(path, handler) { this.addRoute("PUT", path, handler); }
  delete(path, handler) { this.addRoute("DELETE", path, handler); }

  matchRoute(method, path) {
    for (const r of this.routes) {
      if (r.method !== method) continue;
      const keys = [];
      const regex = new RegExp(
        "^" +
        r.routePath
          .replace(/\//g, "\\/")
          .replace(/:(\w+)/g, (_, k) => {
            keys.push(k);
            return "([^/]+)";
          }) +
        "$"
      );
      const m = path.match(regex);
      if (m) {
        const params = {};
        keys.forEach((k, i) => (params[k] = m[i + 1]));
        return { handler: r.handler, params };
      }
    }
    return null;
  }

  async runMiddleware(req, res, handler) {
    for (let i = 0; i < this.middlewares.length; i++) {
      if (res.sent) return;
      await this.middlewares[i](req, res, () => { });
    }
    if (!res.sent) await handler(req, res);
  }

  async listen(port = 3000, host = "0.0.0.0") {
    registerJsCallback((_, args) => {
      const [reqId, path, queryStr, headersJson, rawBody] = args;

      const headers = JSON.parse(headersJson || "{}");
      const method = headers[":method"] || (rawBody ? "POST" : "GET");

      const rawQuery = headers[":query"] || queryStr || "";
      const fullPath = rawQuery ? `${path}?${rawQuery}` : path;

      const parsedUrl = new URL(fullPath, `http://${headers.host || "localhost"}`);
      const queryObj = Object.fromEntries(parsedUrl.searchParams.entries());

      const routeMatch = this.matchRoute(method, parsedUrl.pathname);
      const res = new Response(reqId);

      if (!routeMatch) {
        res.status(404).json({ error: "Not Found" });
        return;
      }

      const req = new Request(
        reqId,
        method,
        parsedUrl.pathname,
        queryObj,
        headers,
        typeof rawBody === "string" ? rawBody : "",
        routeMatch.params,
        fullPath
      );

      (async () => {
        try {
          if (this.middlewares.length === 0) {
            await routeMatch.handler(req, res);
          } else {
            await this.runMiddleware(req, res, routeMatch.handler);
          }
          if (!res.sent) res.status(204).send("");
        } catch (err) {
          if (!res.sent) res.status(500).text("Internal Server Error");
        }
      })();
    });


    await startServer(host, port);
    console.log(`🚀 BrahmaJS running at http://${host}:${port}`);
  }

  async shutdown() { await shutdownServer(); }
}

module.exports = { BrahmaApp, parseFile };
