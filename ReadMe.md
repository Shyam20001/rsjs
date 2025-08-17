# 🌀 **Brahma-JS**

[![npm version](https://img.shields.io/npm/v/brahma-firelight)](https://www.npmjs.com/package/brahma-firelight)

**Firelight Orchestrator**

A blazing-fast, **fire-and-forget orchestrator** built with **Rust** and **JavaScript**, designed for ultra-low-latency task routing, message triggering, and lightweight logic execution — all without blocking.

> Think of it as a programmable API brain: Rust handles concurrency and speed, JS handles logic and control.

---

## 📦 Installation

```bash
npm install brahma-firelight
````

---

## ⚡ What It Is

* High-throughput async HTTP server (`tokio` + `hyper`)

* JS-based request handler via embedded Rust runtime

* Supports **dynamic routing**, **custom logic**, and **cached data workflows**

* Use as a:

  * **Message router**
  * **Webhook fan-out hub**
  * **API orchestrator**

* Ships as a **binary** — no build setup or source required

---

## 🚀 Quick Start

### 1. Clone this repository

```bash
git clone -b master https://github.com/Shyam20001/rsjs.git
cd rsjs
```

### 2. Prepare your JavaScript logic

Create a `handler.js` file:

```js
const { useBrahma, startServer } = require("brahma-firelight");

useBrahma((req) => {
  if (req.path === "/hi") {
    return {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hello from /hi!" }),
    };
  }

  if (req.path === "/bye") {
    return {
      headers: { "Content-Type": "text/html" },
      body: `<h1>Goodbye!</h1>`,
    };
  }

  return {
    status: 404,
    body: "Route not found",
  };
});

startServer("127.0.0.1", 3000).then(() => {
  console.log("🌀 Brahma-JS server running at http://localhost:3000");
});
```

### 3. Run with Node.js

```bash
node handler.js
```

### 4. Send HTTP requests

```bash
curl http://127.0.0.1:3000/hi
```

---

## 🧠 Features

* 🔥 **Fire-and-forget**: Rust doesn't wait for JS logic — just executes and moves on
* ⚡ **Ultra-fast**: 60K+ RPS with 24KB responses
* 🧬 **Dynamic logic**: Update JS without touching the binary
* 🛠️ **Simple**: 1 binary, 1 JS file, and you're live

---

## 💼 Use Cases

* Microservice message orchestration
* Edge compute/local automation controller
* Webhook router or API multiplexer
* Replace Redis queues or Express for internal patterns

---

## 🛡️ Notes

* Minimal validation — ensure JS safely handles request input (`body[]`, etc.)
* Logic **must be synchronous** — **no `await`** in `handleRequest`
* Designed for **trusted internal environments** (not public-facing)

---

## 📈 Performance

### Benchmark (24KB payload):

```bash
autocannon -c 100 -d 10 -p 10 http://127.0.0.1:3000/hi
```

#### Result:

```
61,000 requests/sec sustained
~10x faster than Express
~5x faster than Hono (Bun)
```

---

## 🧩 Integration Ideas

* Connect external brokers (e.g., Kafka, NATS) into the HTTP logic
* Use as a smart, JS-controlled router for service meshes
* Bundle multiple `handler.js` versions for isolated behaviors

---

## 🔐 License

Released under the [MIT License](./LICENSE).

---

## 📬 Contact

**Email**: [mshayam41@gmail.com](mailto:mshayam41@gmail.com)

---
