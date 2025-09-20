# <span style="display:inline-block; transform: scaleX(-1);">🗿</span> Brahma-JS (brahma-firelight)

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

---

## The Vision: Why Brahma-JS?

- **Rust-level performance**, without needing to write Rust.
- **Express-like API**, so JS devs can jump in instantly.
- Built with **Tokio + Hyper**, delivering asynchronous speed and efficiency.
- Lightweight, zero-dependency binary — no build headaches.

---

## Performance Benchmarks

Benchmarks were run with **wrk** on an Intel® Core™ i5-12450H (12 vCPUs available under virtualization, 200 concurrent connections, 10s duration):

**wrk output (Brahma-JS):**

```

Running 10s test @ [http://127.0.0.1:2000/hi](http://127.0.0.1:2000/hi)
1 threads and 200 connections
Thread Stats   Avg      Stdev     Max   +/- Stdev
Latency     1.51ms  479.16us   7.89ms   78.17%
Req/Sec   131.57k     9.13k  146.78k    79.00%
1309338 requests in 10.00s, 186.05MB read
Requests/sec: 130899.58
Transfer/sec: 18.60MB

```

**Takeaway:** Brahma-JS sustains **130k+ requests/sec** with low latency, powered by its Rust core and Express-style developer API.

---

### 🔬 How to Reproduce

1. **Start Brahma-JS server:**

```bash
node server.js
# server listens on 0.0.0.0:2000
```

2. **Run wrk against the `/hi` endpoint:**

```bash
wrk http://127.0.0.1:2000/hi -d 10 -t 1 -c 200
```

- `-d 10` → run for 10 seconds
- `-t 1` → 1 worker thread
- `-c 200` → 200 concurrent connections

3. **Test machine info (`lscpu`):**

```
Architecture:           x86_64
CPU(s):                 12
Model name:             12th Gen Intel(R) Core(TM) i5-12450H
Threads per core:       2
Cores per socket:       6
Virtualization:         Microsoft Hyper-V (full)
```

## Quick Start

```bash
npm install brahma-firelight
# or
yarn add brahma-firelight
# or
pnpm add brahma-firelight
# or
bun add brahma-firelight
# or
nypm add brahma-firelight

```

```js
const { createApp } = require("brahma-firelight");

const app = createApp();

// utils.js
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

app.get("/hi", (req, res) => {
  res.json({ message: "Hello World from Brahma-JS!" });
});

// // Async handler returning an object
app.get("/time", async (req) => {
  await sleep(20000);
  return {
    status: 400,
    headers: { "Content-Type": "application/json" }, // Custom Returns
    body: JSON.stringify({ now: Date.now() }),
  };
});

// To send HTML response
app.get("/page", (req, res) => {
  res.html(`<h1>Hello HTML</h1><p>Served by Brahma-JS id: ${req.reqId}</p>`);
});

// to return body no overhead very fast as text
app.post("/json", (req, res) => {
  res.text(req.body);
});

app.post("/submit", (req, res) => {
  let formData = JSON.parse(req.body);
  console.log("bodyData:", formData);
  res.json(formData, 201); // return the JSON response with http-status-code
});

// Set-Up cookies and User Sessions

app.get("/set-cookies", (req, res) => {
  console.log("Request:-->", req); // Request Parameters-> contains all info + additional meta data
  res.send(
    200, // http-status code
    { "Content-Type": "text/plain" }, // headers Content-Type
    ["a=1; Path=/; HttpOnly", "b=2; Path=/; Secure; Max-Age=3600"], // manual cookie setup
    "hello" // optional Return Body
  );
});

app.get("/redirect", (req, res) => {
  res.redirect("https://google.com");
});

app.listen("0.0.0.0", 2000, () => {
  console.log("Server listening on port 2000");
});
```

---

## Familiar API, Turbo-Charged ⚡ Backend

Just like Express:

```js
app.get("/hello", (req, res) => {
  res.send("Hi there!");
});
```

But under the hood:

- Execution occurs in Rust (Tokio + Hyper).
- Handlers (sync or async) run without sacrificing speed.
- Middleware works seamlessly — same developer experience, turbo-charged engine.

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

---

## Status & Feedback

- **Beta / experimental** — actively refined based on usage.
- Feedback and early adopters **highly encouraged**.

---

## Platform binaries / Prebuilds

Brahma-Firelight ships prebuilt native binaries for macOS, Linux and Windows so you don't need to compile the native addon locally.

**Supported artifact filenames (what the JS loader will try to load):**

- macOS (Apple Silicon): `brahma-js.darwin-arm64.node`
- macOS (Intel x64): `brahma-js.darwin-x64.node`
- Linux (x64, GNU): `brahma-js.linux-x64-gnu.node`
- Linux (arm64, GNU): `brahma-js.linux-arm64-gnu.node`
- Windows (x64, MSVC): `brahma-js.win32-x64-msvc.node`

👉 Forked from Brahma-Core. An open source repository [**Brahma-Core**](https://github.com/Shyam20001/brahma-core.git).

---

## 🧾 License

**MIT** © [LICENSE](https://github.com/Shyam20001/rsjs/blob/master/LICENSE)
