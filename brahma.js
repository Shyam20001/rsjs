// const { startServer, registerJsCallback, respond } = require('./index'); // native addon

// function useBrahma(handler) {
//   registerJsCallback((_, parts) => {
//     const [reqId, path, body] = parts;

//     const maybePromise = handler({ path, body, reqId });

//     // Handle async + sync handlers
//     if (maybePromise && typeof maybePromise.then === "function") {
//       maybePromise.then((res) => sendResponse(reqId, res))
//                   .catch((err) => sendResponse(reqId, {
//                     status: 500,
//                     headers: { "Content-Type": "text/plain" },
//                     body: "Async error: " + err.message
//                   }));
//     } else {
//       sendResponse(reqId, maybePromise);
//     }
//   });
// }

// // Helper to normalize response + send to Rust
// function sendResponse(reqId, res) {
//   if (!res) {
//     respond(reqId, JSON.stringify({
//       status: 200,
//       headers: { "Content-Type": "text/plain" },
//       body: ""
//     }));
//     return;
//   }

//   respond(reqId, JSON.stringify({
//     status: res.status ?? 200,
//     headers: res.headers ?? { "Content-Type": "text/plain" },
//     body: res.body ?? ""
//   }));
// }

// // === Convenience helpers for user handlers ===
// function text(body, status = 200) {
//   return {
//     status,
//     headers: { "Content-Type": "text/plain" },
//     body
//   };
// }

// function html(body, status = 200) {
//   return {
//     status,
//     headers: { "Content-Type": "text/html" },
//     body
//   };
// }

// function json(obj, status = 200) {
//   return {
//     status,
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(obj)
//   };
// }

// function redirect(location, status = 302) {
//   return {
//     status,
//     headers: { "Location": location },
//     body: `Redirecting to ${location}`
//   };
// }

// module.exports = {
//   startServer,
//   useBrahma,
//   text,
//   html,
//   json,
//   redirect,
// };

///////////////////////// with extra arrays 
const { startServer, registerJsCallback, respond } = require('./index'); // native addon
const { URLSearchParams } = require('url');

function useBrahma(handler) {
  registerJsCallback((_, rawParts) => {
    // rawParts = [reqId, path, method, query, headersJson, body]
   // console.log(rawParts)
    const [reqId, path, method, rawQuery, headersStr, body] = rawParts;

    let headers = {};
    try {
      headers = JSON.parse(headersStr || "{}");
    } catch {
      console.warn("⚠️ Failed to parse headers JSON:", headersStr);
    }

    const query = {};
    if (rawQuery) {
      for (const [k, v] of new URLSearchParams(rawQuery)) {
        query[k] = v;
      }
    }

    // Build request object
    const req = { reqId, path, method, query, headers, body };

    // Wrap respond for convenience
    const res = {
      send: (status, headers, body) => {
        respond(reqId, JSON.stringify({ status, headers, body }));
      },
      text: (text, status = 200) => {
        respond(reqId, JSON.stringify({
          status,
          headers: { "Content-Type": "text/plain" },
          body: text
        }));
      },
      html: (html, status = 200) => {
        respond(reqId, JSON.stringify({
          status,
          headers: { "Content-Type": "text/html" },
          body: html
        }));
      },
      json: (obj, status = 200) => {
        respond(reqId, JSON.stringify({
          status,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(obj)
        }));
      },
      redirect: (location, status = 302) => {
        respond(reqId, JSON.stringify({
          status,
          headers: { "Location": location },
          body: `Redirecting to ${location}`
        }));
      }
    };

    // Call user handler
    const maybePromise = handler(req, res);

    // If handler returns a value instead of using res helpers
    if (maybePromise && typeof maybePromise.then === "function") {
      maybePromise.then((out) => {
        if (out) {
          respond(reqId, JSON.stringify({
            status: out.status ?? 200,
            headers: out.headers ?? { "Content-Type": "text/plain" },
            body: out.body ?? ""
          }));
        }
      }).catch((err) => {
        respond(reqId, JSON.stringify({
          status: 500,
          headers: { "Content-Type": "text/plain" },
          body: "Error: " + err.message
        }));
      });
    } else if (maybePromise) {
      respond(reqId, JSON.stringify({
        status: maybePromise.status ?? 200,
        headers: maybePromise.headers ?? { "Content-Type": "text/plain" },
        body: maybePromise.body ?? ""
      }));
    }
  });
}

module.exports = {
  startServer,
  useBrahma
};

