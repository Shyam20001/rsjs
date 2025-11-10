// // // // // // const { startServer, registerJsCallback, respond } = require('./index'); // native addon

// // // // // // function useBrahma(handler) {
// // // // // //   registerJsCallback((_, parts) => {
// // // // // //     const [reqId, path, body] = parts;

// // // // // //     const maybePromise = handler({ path, body, reqId });

// // // // // //     // Handle async + sync handlers
// // // // // //     if (maybePromise && typeof maybePromise.then === "function") {
// // // // // //       maybePromise.then((res) => sendResponse(reqId, res))
// // // // // //                   .catch((err) => sendResponse(reqId, {
// // // // // //                     status: 500,
// // // // // //                     headers: { "Content-Type": "text/plain" },
// // // // // //                     body: "Async error: " + err.message
// // // // // //                   }));
// // // // // //     } else {
// // // // // //       sendResponse(reqId, maybePromise);
// // // // // //     }
// // // // // //   });
// // // // // // }

// // // // // // // Helper to normalize response + send to Rust
// // // // // // function sendResponse(reqId, res) {
// // // // // //   if (!res) {
// // // // // //     respond(reqId, JSON.stringify({
// // // // // //       status: 200,
// // // // // //       headers: { "Content-Type": "text/plain" },
// // // // // //       body: ""
// // // // // //     }));
// // // // // //     return;
// // // // // //   }

// // // // // //   respond(reqId, JSON.stringify({
// // // // // //     status: res.status ?? 200,
// // // // // //     headers: res.headers ?? { "Content-Type": "text/plain" },
// // // // // //     body: res.body ?? ""
// // // // // //   }));
// // // // // // }

// // // // // // // === Convenience helpers for user handlers ===
// // // // // // function text(body, status = 200) {
// // // // // //   return {
// // // // // //     status,
// // // // // //     headers: { "Content-Type": "text/plain" },
// // // // // //     body
// // // // // //   };
// // // // // // }

// // // // // // function html(body, status = 200) {
// // // // // //   return {
// // // // // //     status,
// // // // // //     headers: { "Content-Type": "text/html" },
// // // // // //     body
// // // // // //   };
// // // // // // }

// // // // // // function json(obj, status = 200) {
// // // // // //   return {
// // // // // //     status,
// // // // // //     headers: { "Content-Type": "application/json" },
// // // // // //     body: JSON.stringify(obj)
// // // // // //   };
// // // // // // }

// // // // // // function redirect(location, status = 302) {
// // // // // //   return {
// // // // // //     status,
// // // // // //     headers: { "Location": location },
// // // // // //     body: `Redirecting to ${location}`
// // // // // //   };
// // // // // // }

// // // // // // module.exports = {
// // // // // //   startServer,
// // // // // //   useBrahma,
// // // // // //   text,
// // // // // //   html,
// // // // // //   json,
// // // // // //   redirect,
// // // // // // };

// // // // // ///////////////////////// with extra arrays 
// // // // // const { startServer, registerJsCallback, respond } = require('./index'); // native addon
// // // // // const { URLSearchParams } = require('url');

// // // // // function useBrahma(handler) {
// // // // //   registerJsCallback((_, rawParts) => {
// // // // //     // rawParts = [reqId, path, method, query, headersJson, body]
// // // // //     // console.log(rawParts)  //..
// // // // //     const [reqId, path, method, rawQuery, headersStr, body] = rawParts;

// // // // //     let headers = {};
// // // // //     try {
// // // // //       headers = JSON.parse(headersStr || "{}");
// // // // //     } catch {
// // // // //       console.warn("⚠️ Failed to parse headers JSON:", headersStr);
// // // // //     }

// // // // //     const query = {};
// // // // //     if (rawQuery) {
// // // // //       for (const [k, v] of new URLSearchParams(rawQuery)) {
// // // // //         query[k] = v;
// // // // //       }
// // // // //     }

// // // // //     // Build request object
// // // // //     const req = { reqId, path, method, query, headers, body };

// // // // //     // Wrap respond for convenience
// // // // //     const res = {
// // // // //       send: (status, headers, body) => {
// // // // //         respond(reqId, JSON.stringify({ status, headers, body }));
// // // // //       },
// // // // //       text: (text, status = 200) => {
// // // // //         respond(reqId, JSON.stringify({
// // // // //           status,
// // // // //           headers: { "Content-Type": "text/plain" },
// // // // //           body: text
// // // // //         }));
// // // // //       },
// // // // //       html: (html, status = 200) => {
// // // // //         respond(reqId, JSON.stringify({
// // // // //           status,
// // // // //           headers: { "Content-Type": "text/html" },
// // // // //           body: html
// // // // //         }));
// // // // //       },
// // // // //       json: (obj, status = 200) => {
// // // // //         respond(reqId, JSON.stringify({
// // // // //           status,
// // // // //           headers: { "Content-Type": "application/json" },
// // // // //           body: JSON.stringify(obj)
// // // // //         }));
// // // // //       },
// // // // //       redirect: (location, status = 302) => {
// // // // //         respond(reqId, JSON.stringify({
// // // // //           status,
// // // // //           headers: { "Location": location },
// // // // //           body: `Redirecting to ${location}`
// // // // //         }));
// // // // //       }
// // // // //     };

// // // // //     // Call user handler
// // // // //     const maybePromise = handler(req, res);

// // // // //     // If handler returns a value instead of using res helpers
// // // // //     if (maybePromise && typeof maybePromise.then === "function") {
// // // // //       maybePromise.then((out) => {
// // // // //         if (out) {
// // // // //           respond(reqId, JSON.stringify({
// // // // //             status: out.status ?? 200,
// // // // //             headers: out.headers ?? { "Content-Type": "text/plain" },
// // // // //             body: out.body ?? ""
// // // // //           }));
// // // // //         }
// // // // //       }).catch((err) => {
// // // // //         respond(reqId, JSON.stringify({
// // // // //           status: 500,
// // // // //           headers: { "Content-Type": "text/plain" },
// // // // //           body: "Error: " + err.message
// // // // //         }));
// // // // //       });
// // // // //     } else if (maybePromise) {
// // // // //       respond(reqId, JSON.stringify({
// // // // //         status: maybePromise.status ?? 200,
// // // // //         headers: maybePromise.headers ?? { "Content-Type": "text/plain" },
// // // // //         body: maybePromise.body ?? ""
// // // // //       }));
// // // // //     }
// // // // //   });
// // // // // }

// // // // // module.exports = {
// // // // //   startServer,
// // // // //   useBrahma
// // // // // };


// // // // const { startServer, registerJsCallback, respond } = require('./index'); // native addon
// // // // const { URLSearchParams } = require('url');

// // // // function useBrahma(handler) {
// // // //   registerJsCallback((_, rawParts) => {
// // // //     // rawParts may be [reqId, path, method, query, headersJson, body]
// // // //     // or include extra fields at the end (ip, cookiesJson, metaJson)
// // // //     const reqId = rawParts[0];
// // // //     const path = rawParts[1] ?? '/';
// // // //     const method = rawParts[2] ?? 'GET';
// // // //     const rawQuery = rawParts[3] ?? '';
// // // //     const headersStr = rawParts[4] ?? '{}';
// // // //     const body = rawParts[5] ?? '';

// // // //     // Parse headers: support either an object or an array of [name,value]
// // // //     let headers = {};
// // // //     try {
// // // //       const parsed = JSON.parse(headersStr || '{}');
// // // //       if (Array.isArray(parsed)) {
// // // //         // parsed is [[name, val], ...] — preserve duplicates as arrays
// // // //         for (const item of parsed) {
// // // //           if (!Array.isArray(item) || item.length < 2) continue;
// // // //           const name = String(item[0]).toLowerCase();
// // // //           const val = String(item[1]);
// // // //           if (headers[name] === undefined) headers[name] = val;
// // // //           else if (Array.isArray(headers[name])) headers[name].push(val);
// // // //           else headers[name] = [headers[name], val];
// // // //         }
// // // //       } else if (parsed && typeof parsed === 'object') {
// // // //         // object shape: name -> single value
// // // //         for (const k of Object.keys(parsed)) {
// // // //           headers[k.toLowerCase()] = parsed[k];
// // // //         }
// // // //       } else {
// // // //         headers = {};
// // // //       }
// // // //     } catch (err) {
// // // //       console.warn('⚠️ Failed to parse headers JSON:', headersStr);
// // // //       headers = {};
// // // //     }

// // // //     // Parse query string into simple object (last value wins)
// // // //     const query = {};
// // // //     if (rawQuery) {
// // // //       for (const [k, v] of new URLSearchParams(rawQuery)) {
// // // //         query[k] = v;
// // // //       }
// // // //     }

// // // //     const req = { reqId, path, method, query, headers, body };

// // // //     // sendOnce helper to avoid duplicate responses
// // // //     let responded = false;
// // // //     const sendOnce = (payloadObj) => {
// // // //       if (responded) {
// // // //         console.warn(`Attempt to respond twice for reqId=${reqId} — ignored`);
// // // //         return;
// // // //       }
// // // //       responded = true;
// // // //       try {
// // // //         respond(reqId, JSON.stringify(payloadObj));
// // // //       } catch (err) {
// // // //         console.error('Failed to call respond native binding:', err);
// // // //       }
// // // //     };

// // // //     // Build res helpers. send(status, headers, cookies, body)
// // // //     const res = {
// // // //       send: (status = 200, headers = { 'content-type': 'text/plain' }, cookies = [], body = '') => {
// // // //         // expect cookies to be an array of cookie strings if provided
// // // //         const payload = {
// // // //           status,
// // // //           headers,
// // // //           cookies: Array.isArray(cookies) ? cookies : (cookies ? [cookies] : []),
// // // //           body: String(body ?? ''),
// // // //         };
// // // //         sendOnce(payload);
// // // //       },

// // // //       text: (text, status = 200, cookies) =>
// // // //         res.send(status, { 'Content-Type': 'text/plain' }, cookies ?? [], String(text)),

// // // //       html: (html, status = 200, cookies) =>
// // // //         res.send(status, { 'Content-Type': 'text/html' }, cookies ?? [], String(html)),

// // // //       json: (obj, status = 200, cookies) =>
// // // //         res.send(
// // // //           status,
// // // //           { 'Content-Type': 'application/json' },
// // // //           cookies ?? [],
// // // //           JSON.stringify(obj)
// // // //         ),

// // // //       redirect: (location, status = 302) =>
// // // //         res.send(status, { Location: location }, [], `Redirecting to ${location}`),
// // // //     };

// // // //     // Call user handler and support sync or promise returns
// // // //     try {
// // // //       const out = handler(req, res);

// // // //       // If handler returned a promise, await resolution
// // // //       if (out && typeof out.then === 'function') {
// // // //         out
// // // //           .then((value) => {
// // // //             if (value && !responded) {
// // // //               // allow user to return a small object: { status, headers, cookies, body }
// // // //               sendOnce({
// // // //                 status: value.status ?? 200,
// // // //                 headers: value.headers ?? { 'Content-Type': 'text/plain' },
// // // //                 cookies: value.cookies ?? [],
// // // //                 body: value.body ?? '',
// // // //               });
// // // //             }
// // // //           })
// // // //           .catch((err) => {
// // // //             if (!responded) {
// // // //               sendOnce({
// // // //                 status: 500,
// // // //                 headers: { 'Content-Type': 'text/plain' },
// // // //                 body: 'Error: ' + (err && err.message ? err.message : String(err)),
// // // //               });
// // // //             }
// // // //           });
// // // //       } else if (out && !responded) {
// // // //         // sync return value
// // // //         sendOnce({
// // // //           status: out.status ?? 200,
// // // //           headers: out.headers ?? { 'Content-Type': 'text/plain' },
// // // //           cookies: out.cookies ?? [],
// // // //           body: out.body ?? '',
// // // //         });
// // // //       }
// // // //       // if out is falsy and user already used res helpers, nothing to do
// // // //     } catch (err) {
// // // //       if (!responded) {
// // // //         sendOnce({
// // // //           status: 500,
// // // //           headers: { 'Content-Type': 'text/plain' },
// // // //           body: 'Error: ' + (err && err.message ? err.message : String(err)),
// // // //         });
// // // //       }
// // // //     }
// // // //   });
// // // // }

// // // // module.exports = { startServer, useBrahma };
// // // // brahma-glue.js
// // // /* eslint-disable no-console */

// // // const { startServer, registerJsCallback, respond } = require('./index');
// // // const { URLSearchParams } = require('url');

// // // function normalizeHeaders(parsedHeaders) {
// // //   // Accept headers as either array-of-pairs or object {name: value}
// // //   const out = {};
// // //   if (!parsedHeaders) return out;

// // //   if (Array.isArray(parsedHeaders)) {
// // //     for (const item of parsedHeaders) {
// // //       if (!Array.isArray(item) || item.length < 2) continue;
// // //       const name = String(item[0]).toLowerCase();
// // //       const val = String(item[1]);
// // //       if (out[name] === undefined) out[name] = val;
// // //       else if (Array.isArray(out[name])) out[name].push(val);
// // //       else out[name] = [out[name], val];
// // //     }
// // //   } else if (typeof parsedHeaders === 'object') {
// // //     for (const k of Object.keys(parsedHeaders)) {
// // //       out[k.toLowerCase()] = parsedHeaders[k];
// // //     }
// // //   }
// // //   return out;
// // // }

// // // function parseQuery(rawQuery) {
// // //   const q = {};
// // //   if (!rawQuery) return q;
// // //   for (const [k, v] of new URLSearchParams(rawQuery)) {
// // //     q[k] = v;
// // //   }
// // //   return q;
// // // }

// // // function useBrahma(handler) {
// // //   // Register callback with native. napi type is (err, arg: string) => string
// // //   registerJsCallback((err, payloadStr) => {

// // //     // The callback may be invoked on a different thread; keep handler usage simple and sync-friendly.
// // //     if (err) {
// // //       console.error('Native callback error:', err);
// // //       return '';
// // //     }

// // //     let parsed;
// // //     try {
// // //       parsed = JSON.parse(payloadStr);
// // //      // console.log( parsed)
// // //     } catch (e) {
// // //       console.warn('Failed to parse request payload JSON:', e, 'raw:', payloadStr);
// // //       return '';
// // //     }

// // //     const reqId = String(parsed.id ?? parsed.reqId ?? '');
// // //     const path = parsed.path ?? '/';
// // //     const method = parsed.method ?? 'GET';
// // //     const rawQuery = parsed.query ?? '';
// // //     const headersRaw = parsed.headers ?? parsed.headers_json ?? [];
// // //     const body = parsed.body ?? '';
// // //     const ip = parsed.ip ?? '';
// // //     const meta = parsed.meta ?? {};

// // //     const headers = normalizeHeaders(headersRaw);
// // //     const query = parseQuery(rawQuery);

// // //     const req = { reqId, path, method, query, headers, body, ip, meta };

// // //     // sendOnce guard
// // //     let responded = false;
// // //     const sendOnce = (payloadObj) => {
// // //       if (responded) {
// // //         console.warn(`Attempt to respond twice for reqId=${reqId} — ignored`);
// // //         return;
// // //       }
// // //       responded = true;
// // //       try {
// // //         // ensure payload is JSON string
// // //         respond(reqId, JSON.stringify(payloadObj)).catch((err) => {
// // //           console.error('Native respond() promise rejected:', err);
// // //         });
// // //       } catch (err) {
// // //         console.error('Failed to call native respond binding:', err);
// // //       }
// // //     };

// // //     // res helpers
// // //     const res = {
// // //       send: (status = 200, headers = { 'Content-Type': 'text/plain' }, cookies = [], bodyText = '') => {
// // //         const payload = {
// // //           status,
// // //           headers,
// // //           cookies: Array.isArray(cookies) ? cookies : cookies ? [cookies] : [],
// // //           body: String(bodyText ?? ''),
// // //         };
// // //         sendOnce(payload);
// // //       },
// // //       text: (text, status = 200, cookies) =>
// // //         res.send(status, { 'Content-Type': 'text/plain' }, cookies ?? [], String(text)),
// // //       html: (html, status = 200, cookies) =>
// // //         res.send(status, { 'Content-Type': 'text/html' }, cookies ?? [], String(html)),
// // //       json: (obj, status = 200, cookies) =>
// // //         res.send(status, { 'Content-Type': 'application/json' }, cookies ?? [], JSON.stringify(obj)),
// // //       redirect: (location, status = 302) =>
// // //         res.send(status, { Location: location }, [], `Redirecting to ${location}`),
// // //     };

// // //     // call handler and handle sync / promise return
// // //     try {
// // //       const out = handler(req, res);

// // //       if (out && typeof out.then === 'function') {
// // //         // promise
// // //         out
// // //           .then((value) => {
// // //             if (!responded && value) {
// // //               sendOnce({
// // //                 status: value.status ?? 200,
// // //                 headers: value.headers ?? { 'Content-Type': 'text/plain' },
// // //                 cookies: value.cookies ?? [],
// // //                 body: value.body ?? '',
// // //               });
// // //             }
// // //           })
// // //           .catch((handlerErr) => {
// // //             if (!responded) {
// // //               sendOnce({
// // //                 status: 500,
// // //                 headers: { 'Content-Type': 'text/plain' },
// // //                 body: 'Error: ' + (handlerErr && handlerErr.message ? handlerErr.message : String(handlerErr)),
// // //               });
// // //             }
// // //           });
// // //       } else if (!responded && out) {
// // //         // sync return
// // //         sendOnce({
// // //           status: out.status ?? 200,
// // //           headers: out.headers ?? { 'Content-Type': 'text/plain' },
// // //           cookies: out.cookies ?? [],
// // //           body: out.body ?? '',
// // //         });
// // //       }
// // //     } catch (handlerErr) {
// // //       if (!responded) {
// // //         sendOnce({
// // //           status: 500,
// // //           headers: { 'Content-Type': 'text/plain' },
// // //           body: 'Error: ' + (handlerErr && handlerErr.message ? handlerErr.message : String(handlerErr)),
// // //         });
// // //       }
// // //     }

// // //     // napi signature expects a string return; return empty string
// // //     return '';
// // //   });
// // // }

// // // // export helpers
// // // module.exports = {
// // //   startServer,
// // //   respond, // low-level native responder (Promise)
// // //   useBrahma,
// // // };


// // // 09212025
// // // 09212025 - updated glue for brahma v1.5 with optional full_stack meta
// // const { startServer, registerJsCallback, respond } = require('./index'); // native addon
// // const { URLSearchParams } = require('url');

// // function useBrahma(handler) {
// //   registerJsCallback((_, rawParts) => {
// //     // rawParts = [reqId, path, method, query, headersJson, body]
// //     const reqId = rawParts[0];
// //     const path = rawParts[1] ?? '/';
// //     const method = rawParts[2] ?? 'GET';
// //     const rawQuery = rawParts[3] ?? '';
// //     const headersStr = rawParts[4] ?? '{}';
// //     const body = rawParts[5] ?? '';

// //     // Parse headers into a map with lowercased keys (preserve multi-valued header handling)
// //     let headers = {};
// //     try {
// //       const parsed = JSON.parse(headersStr || '{}');
// //       if (Array.isArray(parsed)) {
// //         // array form [[k,v], [k,v], ...]
// //         for (const item of parsed) {
// //           if (!Array.isArray(item) || item.length < 2) continue;
// //           const name = String(item[0]).toLowerCase();
// //           const val = String(item[1]);
// //           if (headers[name] === undefined) headers[name] = val;
// //           else if (Array.isArray(headers[name])) headers[name].push(val);
// //           else headers[name] = [headers[name], val];
// //         }
// //       } else if (parsed && typeof parsed === 'object') {
// //         // object form {k: v, ...}
// //         for (const k of Object.keys(parsed)) {
// //           headers[k.toLowerCase()] = parsed[k];
// //         }
// //       }
// //     } catch (err) {
// //       console.warn('⚠️ Failed to parse headers JSON:', headersStr);
// //     }

// //     // Parse query string
// //     const query = {};
// //     if (rawQuery) {
// //       for (const [k, v] of new URLSearchParams(rawQuery)) {
// //         query[k] = v;
// //       }
// //     }

// //     // meta parsing: read x-brahma-meta header if present (JSON string)
// //     let meta = null;
// //     if (headers['x-brahma-meta']) {
// //       try {
// //         meta = JSON.parse(headers['x-brahma-meta']);
// //       } catch (e) {
// //         // ignore malformed meta
// //         meta = null;
// //       }
// //     }

// //     // cookies: prefer x-brahma-cookies (JSON) if present, else lazy-parse cookie header
// //     let _cookies;
// //     const parseCookieHeader = (cookieHeader) => {
// //       const out = {};
// //       if (!cookieHeader) return out;
// //       cookieHeader.split(/; */).forEach((pair) => {
// //         const idx = pair.indexOf('=');
// //         if (idx > 0) {
// //           const k = pair.slice(0, idx).trim();
// //           const v = pair.slice(idx + 1).trim();
// //           if (k) out[k] = v;
// //         }
// //       });
// //       return out;
// //     };

// //     if (headers['x-brahma-cookies']) {
// //       try {
// //         const parsedCookies = JSON.parse(headers['x-brahma-cookies']);
// //         // Ensure it's an object
// //         if (parsedCookies && typeof parsedCookies === 'object') {
// //           _cookies = parsedCookies;
// //         } else {
// //           _cookies = {};
// //         }
// //       } catch (e) {
// //         // fallback to raw cookie header
// //         _cookies = parseCookieHeader(headers['cookie'] || headers['Cookie'] || '');
// //       }
// //     }

// //     // Build req with lazy cookies getter to avoid work unless accessed
// //     const req = {
// //       reqId,
// //       path,
// //       method,
// //       query,
// //       headers,
// //       body,
// //       get cookies() {
// //         if (_cookies !== undefined) return _cookies;
// //         _cookies = parseCookieHeader(headers['cookie'] || headers['Cookie'] || '');
// //         return _cookies;
// //       },
// //       // expose meta and convenience ip/port
// //       meta,
// //       ip: meta && meta.ip ? meta.ip : '',
// //       port: meta && meta.port ? meta.port : '',
// //     };

// //     // --- Response glue (unchanged) ---
// //     let responded = false;
// //     const sendOnce = (payloadObj) => {
// //       if (responded) {
// //         console.warn(`Attempt to respond twice for reqId=${reqId} — ignored`);
// //         return;
// //       }
// //       responded = true;
// //       try {
// //         respond(reqId, JSON.stringify(payloadObj));
// //       } catch (err) {
// //         console.error('Failed to call respond native binding:', err);
// //       }
// //     };

// //     const res = {
// //       send: (status = 200, headers = { 'content-type': 'text/plain' }, cookies = [], body = '') => {
// //         const payload = {
// //           status,
// //           headers,
// //           cookies: Array.isArray(cookies) ? cookies : (cookies ? [cookies] : []),
// //           body: String(body ?? ''),
// //         };
// //         sendOnce(payload);
// //       },
// //       text: (text, status = 200, cookies) =>
// //         res.send(status, { 'Content-Type': 'text/plain' }, cookies ?? [], String(text)),
// //       html: (html, status = 200, cookies) =>
// //         res.send(status, { 'Content-Type': 'text/html' }, cookies ?? [], String(html)),
// //       json: (obj, status = 200, cookies) =>
// //         res.send(status, { 'Content-Type': 'application/json' }, cookies ?? [], JSON.stringify(obj)),
// //       redirect: (location, status = 302) =>
// //         res.send(status, { Location: location }, [], `Redirecting to ${location}`),
// //     };

// //     try {
// //       const out = handler(req, res);
// //       if (out && typeof out.then === 'function') {
// //         out
// //           .then((value) => {
// //             if (value && !responded) {
// //               sendOnce({
// //                 status: value.status ?? 200,
// //                 headers: value.headers ?? { 'Content-Type': 'text/plain' },
// //                 cookies: value.cookies ?? [],
// //                 body: value.body ?? '',
// //               });
// //             }
// //           })
// //           .catch((err) => {
// //             if (!responded) {
// //               sendOnce({
// //                 status: 500,
// //                 headers: { 'Content-Type': 'text/plain' },
// //                 body: 'Error: ' + (err && err.message ? err.message : String(err)),
// //               });
// //             }
// //           });
// //       } else if (out && !responded) {
// //         sendOnce({
// //           status: out.status ?? 200,
// //           headers: out.headers ?? { 'Content-Type': 'text/plain' },
// //           cookies: out.cookies ?? [],
// //           body: out.body ?? '',
// //         });
// //       }
// //     } catch (err) {
// //       if (!responded) {
// //         sendOnce({
// //           status: 500,
// //           headers: { 'Content-Type': 'text/plain' },
// //           body: 'Error: ' + (err && err.message ? err.message : String(err)),
// //         });
// //       }
// //     }
// //   });
// // }

// // module.exports = { startServer, useBrahma };


// // 09212025
// const { startServer, registerJsCallback, respond } = require('./index'); // native addon
// const { URLSearchParams } = require('url');

// function useBrahma(handler) {
//   registerJsCallback((_, rawParts) => {
//    // console.log(rawParts)
//     // rawParts = [reqId, path, method, query, headersJson, body, peer_addr, cookie_header]
//     // Note: Rust now sends full headers_json (object). We parse it here into req.headers.
//     const reqId = rawParts[0];
//     const path = rawParts[1] ?? '/';
//     const method = rawParts[2] ?? 'GET';
//     const rawQuery = rawParts[3] ?? '';
//     const headersStr = rawParts[4] ?? '{}'; // full headers JSON from Rust
//     const body = rawParts[5] ?? '';
//     const peerAddr = rawParts[6] ?? '';       // e.g. "127.0.0.1:54321" or "[::1]:54321"
//     const rawCookieHeader = rawParts[7] ?? ''; // raw Cookie header as a string

//     // Parse peerAddr into ip and port (split on last ':', supports "[::1]:1234")
//     let client_ip = '';
//     let client_port = '';
//     if (peerAddr) {
//       const lastColon = peerAddr.lastIndexOf(':');
//       if (lastColon > -1) {
//         client_ip = peerAddr.slice(0, lastColon);
//         client_port = peerAddr.slice(lastColon + 1);
//         if (client_ip.startsWith('[') && client_ip.endsWith(']')) {
//           client_ip = client_ip.slice(1, -1);
//         }
//       } else {
//         client_ip = peerAddr;
//       }
//     }

//     // Parse query string
//     const query = {};
//     if (rawQuery) {
//       for (const [k, v] of new URLSearchParams(rawQuery)) {
//         query[k] = v;
//       }
//     }

//     // Parse headers JSON (robust to object or array-of-pairs). Lowercase header names.
//     let headers = {};
//     try {
//       const parsed = JSON.parse(headersStr || '{}');
//       if (Array.isArray(parsed)) {
//         for (const item of parsed) {
//           if (!Array.isArray(item) || item.length < 2) continue;
//           const name = String(item[0]).toLowerCase();
//           const val = String(item[1]);
//           if (headers[name] === undefined) headers[name] = val;
//           else if (Array.isArray(headers[name])) headers[name].push(val);
//           else headers[name] = [headers[name], val];
//         }
//       } else if (parsed && typeof parsed === 'object') {
//         for (const k of Object.keys(parsed)) {
//           headers[k.toLowerCase()] = parsed[k];
//         }
//       }
//     } catch (err) {
//       // If parsing fails, fall back to empty headers but do not crash
//       console.warn('⚠️ Failed to parse headers JSON:', headersStr);
//       headers = {};
//     }

//     // Simple cookie parser — prefer rawCookieHeader from Rust; fallback to headers['cookie']
//     const cookies = {};
//     const cookieHeader = rawCookieHeader || headers['cookie'] || '';
//     if (cookieHeader) {
//       cookieHeader.split(/; */).forEach((pair) => {
//         const idx = pair.indexOf('=');
//         if (idx > 0) {
//           const k = pair.slice(0, idx).trim();
//           const v = pair.slice(idx + 1).trim();
//           if (k) cookies[k] = v;
//         }
//       });
//     }

//     // Build req object
//     const req = {
//       reqId,
//       path,
//       method,
//       query,
//       headers, // parsed headers available here
//       body,
//       cookies,
//       ip: client_ip,
//       port: client_port,
//       raw: { peerAddr, rawCookieHeader, headersStr },
//     };

//     // --- Response glue ---
//     let responded = false;
//     const sendOnce = (payloadObj) => {
//       if (responded) {
//         console.warn(`Attempt to respond twice for reqId=${reqId} — ignored`);
//         return;
//       }
//       responded = true;
//       try {
//         respond(reqId, JSON.stringify(payloadObj));
//       } catch (err) {
//         console.error('Failed to call respond native binding:', err);
//       }
//     };

//     // Helper to normalize cookies input into array of strings
//     const normalizeCookies = (cookiesInput) => {
//       if (!cookiesInput) return [];
//       if (Array.isArray(cookiesInput)) return cookiesInput.map(String);
//       return [String(cookiesInput)];
//     };

//     const res = {
//       send: (status = 200, headers = { 'content-type': 'text/plain' }, cookiesInput = [], body = '') => {
//         const cookieArr = normalizeCookies(cookiesInput);

//         // Copy headers
//         const headersCopy = Object.assign({}, headers);

//         // IMPORTANT: If cookies array is provided, remove any Set-Cookie from headers
//         // to avoid invalid header values (we want Rust to create one header per cookie).
//         if (cookieArr.length > 0) {
//           for (const hk of Object.keys(headersCopy)) {
//             if (hk.toLowerCase() === 'set-cookie') {
//               delete headersCopy[hk];
//               console.warn('⚠️ Removing headers[Set-Cookie] because cookies array is provided; Rust will set Set-Cookie headers from payload.cookies.');
//               break;
//             }
//           }
//         }

//         const payload = {
//           status,
//           headers: headersCopy,
//           cookies: cookieArr,
//           body: String(body ?? ''),
//         };
//         sendOnce(payload);
//       },

//       text: (text, status = 200, cookies) =>
//         res.send(status, { 'Content-Type': 'text/plain' }, cookies ?? [], String(text)),

//       html: (html, status = 200, cookies) =>
//         res.send(status, { 'Content-Type': 'text/html' }, cookies ?? [], String(html)),

//       json: (obj, status = 200, cookies) =>
//         res.send(status, { 'Content-Type': 'application/json' }, cookies ?? [], JSON.stringify(obj)),

//       redirect: (location, status = 302) =>
//         res.send(status, { Location: location }, [], `Redirecting to ${location}`),
//     };

//     try {
//       const out = handler(req, res);
//       if (out && typeof out.then === 'function') {
//         out
//           .then((value) => {
//             if (value && !responded) {
//               sendOnce({
//                 status: value.status ?? 200,
//                 headers: value.headers ?? { 'Content-Type': 'text/plain' },
//                 cookies: normalizeCookies(value.cookies ?? []),
//                 body: value.body ?? '',
//               });
//             }
//           })
//           .catch((err) => {
//             if (!responded) {
//               sendOnce({
//                 status: 500,
//                 headers: { 'Content-Type': 'text/plain' },
//                 body: 'Error: ' + (err && err.message ? err.message : String(err)),
//               });
//             }
//           });
//       } else if (out && !responded) {
//         sendOnce({
//           status: out.status ?? 200,
//           headers: out.headers ?? { 'Content-Type': 'text/plain' },
//           cookies: normalizeCookies(out.cookies ?? []),
//           body: out.body ?? '',
//         });
//       }
//     } catch (err) {
//       if (!responded) {
//         sendOnce({
//           status: 500,
//           headers: { 'Content-Type': 'text/plain' },
//           body: 'Error: ' + (err && err.message ? err.message : String(err)),
//         });
//       }
//     }
//   });
// }

// module.exports = { startServer, useBrahma };

//////////////////


// simple glue with body normalized to Buffer (no busboy)
// date: 20250927
const { startServer, registerJsCallback, respond, getJsResponseTimeout, getMaxBodyBytes, setJsResponseTimeout, setMaxBodyBytes, serdeParseAsync, serdeStringifyAsync } = require('./index'); // native addon
const { URLSearchParams } = require('url');

// function bufferFromBody(raw) {
//   if (!raw) return Buffer.alloc(0);
//   if (Buffer.isBuffer(raw)) return raw;
//   if (Array.isArray(raw)) return Buffer.from(raw);
//   if (typeof raw === 'string') return Buffer.from(raw, 'utf8');
//   try {
//     return Buffer.from(raw);
//   } catch {
//     return Buffer.alloc(0);
//   }
// }

// fast one 
// function bufferFromBody(raw) {
//   console.log(raw)
//   return raw || Buffer.alloc(0);
// }

// function bufferFromBody(raw) {
//   return Buffer.from(raw || []);
// }



function useBrahma(handler) {
  registerJsCallback((_, rawParts) => {
    // console.log(rawParts)
    // rawParts = [reqId, path, method, query, headersJson, body, peer_addr, cookie_header]
    const reqId = rawParts[0];
    const path = rawParts[1] ?? '/';
    const method = (rawParts[2] ?? 'GET').toUpperCase();
    const rawQuery = rawParts[3] ?? '';
    const headersStr = rawParts[4] ?? '{}'; // full headers JSON from Rust
    const rawBody = rawParts[5] ?? '';
    const peerAddr = rawParts[6] ?? '';
    const rawCookieHeader = rawParts[7] ?? '';

    // Parse peerAddr into ip and port (split on last ':', supports "[::1]:1234")
    let client_ip = '';
    let client_port = '';
    if (peerAddr) {
      const lastColon = peerAddr.lastIndexOf(':');
      if (lastColon > -1) {
        client_ip = peerAddr.slice(0, lastColon);
        client_port = peerAddr.slice(lastColon + 1);
        if (client_ip.startsWith('[') && client_ip.endsWith(']')) {
          client_ip = client_ip.slice(1, -1);
        }
      } else {
        client_ip = peerAddr;
      }
    }

    // Parse query string
    const query = {};
    if (rawQuery) {
      for (const [k, v] of new URLSearchParams(rawQuery)) {
        query[k] = v;
      }
    }

    // Parse headers JSON (robust to object or array-of-pairs). Lowercase header names.
    let headers = {};
    try {
      const parsed = JSON.parse(headersStr || '{}');
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (!Array.isArray(item) || item.length < 2) continue;
          const name = String(item[0]).toLowerCase();
          const val = String(item[1]);
          if (headers[name] === undefined) headers[name] = val;
          else if (Array.isArray(headers[name])) headers[name].push(val);
          else headers[name] = [headers[name], val];
        }
      } else if (parsed && typeof parsed === 'object') {
        for (const k of Object.keys(parsed)) {
          headers[k.toLowerCase()] = parsed[k];
        }
      }
    } catch (err) {
      console.warn('⚠️ Failed to parse headers JSON:', headersStr);
      headers = {};
    }

    // Simple cookie parser — prefer rawCookieHeader from Rust; fallback to headers['cookie']
    const cookies = {};
    const cookieHeader = rawCookieHeader || headers['cookie'] || '';
    if (cookieHeader) {
      cookieHeader.split(/; */).forEach((pair) => {
        const idx = pair.indexOf('=');
        if (idx > 0) {
          const k = pair.slice(0, idx).trim();
          const v = pair.slice(idx + 1).trim();
          if (k) cookies[k] = v;
        }
      });
    }

    // Normalize body into Buffer (no parsing here; leave it to handler)
    // const body = bufferFromBody(rawBody);
    const body = rawBody || Buffer.alloc(0);


    // Build req object
    const req = {
      reqId,
      path,
      method,
      query,
      headers, // parsed headers available here
      body, // Buffer
      cookies,
      ip: client_ip,
      port: client_port,
      raw: { peerAddr, rawCookieHeader, headersStr },
    };

    // --- Response glue ---
    let responded = false;
    const sendOnce = (payloadObj) => {
      if (responded) {
        console.warn(`Attempt to respond twice for reqId=${reqId} — ignored`);
        return;
      }
      responded = true;
      try {
        respond(reqId, JSON.stringify(payloadObj));
      } catch (err) {
        console.error('Failed to call respond native binding:', err);
      }
    };

    // Helper to normalize cookies input into array of strings
    const normalizeCookies = (cookiesInput) => {
      if (!cookiesInput) return [];
      if (Array.isArray(cookiesInput)) return cookiesInput.map(String);
      return [String(cookiesInput)];
    };

    const res = {
      send: (status = 200, headersOut = { 'content-type': 'text/plain' }, cookiesInput = [], bodyOut = '') => {
        const cookieArr = normalizeCookies(cookiesInput);

        // Copy headers
        const headersCopy = Object.assign({}, headersOut);

        // IMPORTANT: If cookies array is provided, remove any Set-Cookie from headers
        // to avoid invalid header values (we want Rust to create one header per cookie).
        if (cookieArr.length > 0) {
          for (const hk of Object.keys(headersCopy)) {
            if (hk.toLowerCase() === 'set-cookie') {
              delete headersCopy[hk];
              console.warn('⚠️ Removing headers[Set-Cookie] because cookies array is provided; Rust will set Set-Cookie headers from payload.cookies.');
              break;
            }
          }
        }

        const payload = {
          status,
          headers: headersCopy,
          cookies: cookieArr,
          body: typeof bodyOut === 'string' ? bodyOut : (bodyOut && bodyOut.toString ? bodyOut.toString() : String(bodyOut ?? '')),
        };
        sendOnce(payload);
      },

      text: (text, status = 200, cookies) =>
        res.send(status, { 'Content-Type': 'text/plain' }, cookies ?? [], String(text)),

      html: (html, status = 200, cookies) =>
        res.send(status, { 'Content-Type': 'text/html' }, cookies ?? [], String(html)),

      json: (obj, status = 200, cookies) =>
        res.send(status, { 'Content-Type': 'application/json' }, cookies ?? [], JSON.stringify(obj)),

      redirect: (location, status = 302) =>
        res.send(status, { Location: location }, [], `Redirecting to ${location}`),
    };

    try {
      const out = handler(req, res);
      if (out && typeof out.then === 'function') {
        out
          .then((value) => {
            if (value && !responded) {
              sendOnce({
                status: value.status ?? 200,
                headers: value.headers ?? { 'Content-Type': 'text/plain' },
                cookies: normalizeCookies(value.cookies ?? []),
                body: value.body ?? '',
              });
            }
          })
          .catch((err) => {
            if (!responded) {
              sendOnce({
                status: 500,
                headers: { 'Content-Type': 'text/plain' },
                body: 'Error: ' + (err && err.message ? err.message : String(err)),
              });
            }
          });
      } else if (out && !responded) {
        sendOnce({
          status: out.status ?? 200,
          headers: out.headers ?? { 'Content-Type': 'text/plain' },
          cookies: normalizeCookies(out.cookies ?? []),
          body: out.body ?? '',
        });
      }
    } catch (err) {
      if (!responded) {
        sendOnce({
          status: 500,
          headers: { 'Content-Type': 'text/plain' },
          body: 'Error: ' + (err && err.message ? err.message : String(err)),
        });
      }
    }
  });
}

module.exports = { startServer, useBrahma, setJsResponseTimeout, setMaxBodyBytes, getJsResponseTimeout, getMaxBodyBytes, serdeParseAsync, serdeStringifyAsync };
