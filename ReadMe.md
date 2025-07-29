# **Brahma-JS**
## 🌀 **Firelight Orchestrator**

A blazing-fast, **fire-and-forget orchestrator** built with **Rust** and **JavaScript**, designed for ultra-low-latency task routing, message triggering, and lightweight logic execution — all without blocking.

> Think of it as a programmable API brain, where Rust handles concurrency and speed, and JS handles logic and control.

---

## ⚡ **What It Is**

- High-throughput async HTTP server (built with `tokio` + `hyper`)
- JS-based request handler via embedded Rust runtime
- Supports **dynamic routing**, **custom logic**, and **cached data workflows**
- Used as a **message router**, **webhook fan-out hub**, or **API orchestrator**
- Ships as a **binary** — no build setup or source required

---

## 🚀 **Quick Start**

1. **Clone this Repository**

2. **Prepare your JavaScript logic file**

   ```js
   const { registerJsCallback, startServer } = require("./reinforcements");

   function handleRequest(_, body) {
     if (body[0] === "/hi") {
       return JSON.stringify({ status: "hello", ts: Date.now() });
     }

     return JSON.stringify({ error: "404 - Not Found" });
   }

   registerJsCallback(handleRequest);

   startServer("127.0.0.1", 4000).then(() => {
     console.log("Orchestrator started at http://127.0.0.1:4000");
   });
   ```

3. **Run it with Node.js**

   ```bash
   node handler.js
   ```

4. **Send HTTP requests**

   ```bash
   curl http://127.0.0.1:4000/hi
   ```

---

## 🧠 **Features**

- **Fire-and-forget**: Rust doesn't wait for async JS logic — just executes and moves on
- **Ultra-fast**: 60K+ RPS sustained with 24KB responses
- **Dynamic logic**: Update JS without recompiling Rust
- **Simple**: 1 binary, 1 JS file, you're live

---

## 💼 **Use Cases**

- Message orchestration between microservices
- Local automation / edge compute controller
- Webhook router or API multiplexer
- Replace Redis queue/Express for certain task patterns

---

## 🛡️ **Notes**

- Only minimal validation — ensure `body[]` is accessed safely in JS
- Logic must be synchronous (no `await`) in JS `handleRequest`
- Meant for **trusted internal environments** — not exposed to the public internet without a reverse proxy

---

## 📈 **Performance (real benchmark)**

```bash
autocannon -c 100 -d 10 -p 10 http://127.0.0.1:4000/hi
```

Result (24KB response payload):

```
61,000 requests/sec sustained
~10x faster than Express
~5x faster than Hono on Bun
```

---

## 🧩 **Integration Ideas**

- Pipe messages from external brokers (e.g., Kafka/NATS) into the HTTP layer
- Use as a JS-controlled smart router for service meshes
- Bundle different `handler.js` files for distinct behaviors

---

## 🔐 **Licensing & Distribution**

This project is **binary-only** and not open source. Redistribution or reverse engineering is not permitted without consent.

---

## 📬 **Contact**

**Email**: mshayam41@gmail.com
