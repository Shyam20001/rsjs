// // Created by Shyam M (https://github.com/Shyam20001)
// // License: MIT
// // BrahmaJS — Ultra-fast Node.js framework powered by Rust (via NAPI-RS)

const {
  startServer,
  registerJsCallback,
  respond,
  shutdownServer,
  parseFile,
  parseJsonSimd // optional, may not exist in build
} = require("./brahma");

const fs = require("fs");
const path = require("path");

/**
 * HTTP Response wrapper (Express-like).
 */
class Response {
  constructor(reqId) {
    this.reqId = reqId;
    this.headers = {};
    this.statusCode = 200;
    this.sent = false;
  }

  /** Set HTTP status code */
  status(code) { this.statusCode = code; return this; }

  /** Set a header (Express-style) */
  set(field, value) { this.headers[field] = value; return this; }

  /** Set a header (Node.js alias) */
  setHeader(field, value) { return this.set(field, value); }

  /** Send JSON response */
  json(obj, status) {
    if (status) this.statusCode = status;
    this.headers["Content-Type"] = "application/json";
    this.send(JSON.stringify(obj));
  }

  /** Send plain text response */
  text(str, status) {
    if (status) this.statusCode = status;
    this.headers["Content-Type"] = "text/plain";
    this.send(str);
  }

  /** Send HTML response */
  html(html, status) {
    if (status) this.statusCode = status;
    this.headers["Content-Type"] = "text/html";
    this.send(html);
  }

  /** Redirect to another URL */
  redirect(url, status = 302) {
    this.statusCode = status;
    this.headers["Location"] = url;
    this.send("");
  }

  /** Send a file (base64 encoded) */
  file(filePath, status) {
    if (status) this.statusCode = status;
    const absPath = path.resolve(filePath);
    const content = fs.readFileSync(absPath);
    this.headers["Content-Type"] =
      this.headers["Content-Type"] || "application/octet-stream";
    this.send(content.toString("base64"), true);
  }

  /** Send raw/string body */
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

/**
 * HTTP Request wrapper.
 */
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

  /** Lazy parse body (JSON.parse once on demand) */
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

  /** SIMD JSON parsing for extremely large payload (Rust accelerated) */
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

/**
 * Main BrahmaJS application.
 */
class BrahmaApp {
  constructor() {
    this.routes = [];
    this.middlewares = [];
  }

  /** Register global middleware */
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

  /** Start HTTP server */
  async listen(port = 3000, host = "0.0.0.0") {
    registerJsCallback((_, args) => {
      const [reqIdRaw, path, queryStr, headersJson, rawBody] =
        Array.isArray(args) ? args : [];

      const reqId = reqIdRaw.toString();
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

      try {
        if (this.middlewares.length === 0) {
          routeMatch.handler(req, res);
        } else {
          this.runMiddleware(req, res, routeMatch.handler);
        }
      } catch (err) {
        if (!res.sent) res.status(500).text("Internal Server Error");
      }
    });

    await startServer(host, port);
    console.log(`🚀 BrahmaJS AUTO running at http://${host}:${port}`);
  }

  /** Shut down the server */
  async shutdown() { await shutdownServer(); }
}


module.exports = { BrahmaApp, parseFile };
