````markdown
# 🌀 BRAHMA-JS v2

[![npm version](https://img.shields.io/npm/v/brahma-firelight.svg)](https://www.npmjs.com/package/brahma-firelight)
![Node.js](https://img.shields.io/badge/Node.js-16%2B-brightgreen?logo=node.js)
![Rust](https://img.shields.io/badge/Rust-1.70%2B-black?logo=rust)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Ultra-fast Orchestrator for Node.js** — now with **middleware, async/sync handlers, and SIMD JSON** powered by Rust.

---

## ⚠️ Version Notice

- **`v1.x`** — 🔴 Deprecated (sync-only, minimal API).
- **`v2.x`** — 🟢 Current (middleware, async handlers, SIMD JSON).

---

## 📦 Install

```bash
npm install brahma-firelight@latest
```
````

---

## 🚀 Quick Start

```js
const { BrahmaApp } = require("brahma-firelight");

const app = new BrahmaApp();

app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

app.get("/hi", (req, res) => {
  res.json({ message: "Hello World from Brahma-JS v2!" });
});

app.listen(3000).then(() => {
  console.log("🌀 Brahma-JS v2 running at http://localhost:3000");
});
```

---

## ✨ Features

- Native Rust backend for throughput & low latency
- Middleware support (`app.use`)
- Async + sync handlers
- SIMD JSON parser (Rust-powered, can parse largest blobs natively)
- Familiar API (`get`, `post`, `put`, `delete`)
- Runs on Node.js 16+

---

## 🧩 Examples

### Query Params

```js
app.get("/search", (req, res) => {
  res.json({ query: req.query });
});
```

### Async Handlers

```js
app.get("/data", async (req, res) => {
  const result = await fetch(
    "https://jsonplaceholder.typicode.com/todos/1"
  ).then((r) => r.json());
  res.json({ result });
});
```

### SIMD JSON Parser

```js
app.post("/simd", (req, res) => {
  try {
    const parsed = req.simdjson();
    res.json({ parsed });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
```

### Middleware + Async Task

```js
app.use((req, res, next) => {
  req.requestTime = Date.now();
  next();
});

app.get("/time", async (req, res) => {
  await new Promise((r) => setTimeout(r, 200));
  res.json({ now: new Date().toISOString(), started: req.requestTime });
});
```

### Graceful Shutdown

```js
const app = new BrahmaApp();

app.get("/", (req, res) => res.text("Hello BrahmaJS"));

app.listen(3000).then(() => {
  console.log("Server running at http://localhost:3000");
});

process.on("SIGINT", async () => {
  console.log("Shutting down...");
  await app.shutdown();
  process.exit(0);
});
```

---

## 🧾 License

**MIT** © [LICENSE](https://github.com/Shyam20001/rsjs/blob/master/LICENSE)
