# 🌀 Brahma-JS v2

<p align="center">
  <a href="https://www.npmjs.com/package/brahma-firelight">
    <img src="https://img.shields.io/npm/v/brahma-firelight" alt="npm version">
  </a>
  <img src="https://img.shields.io/badge/Node.js-16%2B-brightgreen?logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/Rust-1.70%2B-black?logo=rust" alt="Rust">
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT">
  </a>
</p>

### JavaScript convenience, turbo-charged by Rust.

Brahma-JS is an ultra-low-latency orchestrator for JS, blending familiar `Express`-style middleware and routing with a high-performance core built in Rust. Ideal for micro-service and API use-cases where speed matters.

> **Currently in beta — source is private, but benchmarks and early feedback welcome!**

---

## The Vision: Why Brahma-JS?

- **Rust-level performance**, without needing to write Rust.
- **Express-like API**, so JS devs can jump in instantly.
- Built with **Tokio + Hyper**, delivering asynchronous speed and efficiency.
- Lightweight, zero-dependency binary — no build headaches.

---

## Performance Benchmarks

On an AWS `t2.micro` (1 vCPU, 1 GB RAM), using `autocannon` (100 connections, pipelining 50, 10 s duration):

| Framework          | Requests (10s) | Notes                             |
| ------------------ | -------------- | --------------------------------- |
| **uWebSockets.js** | **456k**       | C++ core, fastest overall         |
| **Brahma-JS**      | **413k**       | Rust-powered — impressively close |
| Fastify            | 307k           | High-performance JS framework     |
| Express.js         | 54k\*          | 3k backlogged/failures            |

\*Express fell significantly behind, with thousands of failed requests. :contentReference[oaicite:1]{index=1}

**Takeaway**: Brahma-JS delivers near-uWS levels of performance with a developer-friendly design.

---

## Quick Start

```bash
npm install brahma-firelight@latest
```

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

## Familiar API, Supercharged Backend

Just like Express:

```js
app.get("/hello", (req, res) => {
  res.send("Hi there!");
});
```

But under the hood:

- Execution occurs in Rust (Tokio + Hyper).
- Handlers (sync or async) run without sacrificing speed.
- Middleware works seamlessly — same developer experience, turbocharged engine.

---

## Max JSON Parsing Power: SIMD Parser

When to use it:

- Parsing **large JSON payloads**, such as analytics, batch uploads, or data-heavy APIs.
- Where `JSON.parse()` becomes a bottleneck — SIMD parsing delivers **multiple times the speed** using parallel processing.

```js
app.post("/simd", (req, res) => {
  try {
    const body = req.simdjson(); // Rust-powered SIMD parser
    res.json({ body });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
```

For small payloads, stick with `.json()` — but for heavy-duty parsing, `.simdjson()` is your performance ace up the sleeve.

---

## More Examples

### Async Fetch

```js
app.get("/data", async (req, res) => {
  const result = await fetch(
    "https://jsonplaceholder.typicode.com/todos/1"
  ).then((r) => r.json());
  res.json({ result });
});
```

### Middleware + Delay

```js
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

app.get("/delay", async (req, res) => {
  await new Promise((r) => setTimeout(r, 200));
  res.json({ elapsed: Date.now() - req.startTime });
});
```

### Graceful Shutdown

```js
process.on("SIGINT", async () => {
  console.log("Shutting down...");
  await app.shutdown();
  process.exit(0);
});
```

---

## Status & Feedback

- **Beta / experimental** — actively refined based on usage.
- **Source private for now**, with plans to open when stabilized.
- Feedback and early adopters **highly encouraged**.

---

## Learn More & Benchmarks

Explore performance breakdowns and comparisons here:
[https://shyam20001.github.io/rsjs/](https://shyam20001.github.io/rsjs/)

---

## 🧾 License

**MIT** © [LICENSE](https://github.com/Shyam20001/rsjs/blob/master/LICENSE)
