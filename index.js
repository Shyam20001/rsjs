// Created by Shyam M (https://github.com/Shyam20001)
// License: MIT
// BrahmaJS — Ultra-fast Node.js framework powered by Rust (via NAPI-RS)
// brahma-createApp-rawparts.js
// Minimal changes from your original createApp; attachNative now expects (err, rawParts)
// rawParts: [ reqId, path, method, query, headersJson, body, ip, cookiesJson, metaJson ]


const { startServer, registerJsCallback, respond } = require('./brahma'); // native addon
const { URLSearchParams } = require('url');

function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&'); }

function compilePath(path) {
  const names = [];
  if (!path || path === '*') return { regex: /^.*$/, names };
  const segments = (path || '/').split('/').filter(Boolean);
  if (segments.length === 0) return { regex: /^\/$/, names };
  const parts = segments.map(seg => {
    if (seg.startsWith(':')) { names.push(seg.slice(1)); return '([^/]+)'; }
    if (seg === '*') return '(.*)';
    return escapeRegExp(seg);
  }).join('\\/');
  return { regex: new RegExp('^\\/' + parts + '\\/?$'), names };
}

function matchPrefix(mountPath, reqPath) {
  if (!mountPath || mountPath === '/') return true;
  if (mountPath === '*') return true;
  const normalized = mountPath.endsWith('/') ? mountPath.slice(0, -1) : mountPath;
  return reqPath === normalized || reqPath.startsWith(normalized + '/');
}

function createApp() {
  const middleware = [];
  const routes = [];
  let shuttingDown = false;
  let pending = 0;
  let forcedTimer = null;
  let listening = false;
  let resolveClose = null;
  let nativeRegistered = false;

  function use(pathOrFn, ...fns) {
    if (typeof pathOrFn === 'function') {
      middleware.push({ path: '/', fn: pathOrFn });
      return app;
    }
    const path = pathOrFn || '/';
    if (fns.length === 0) throw new TypeError('middleware must be a function (pass function(s) after the path)');
    for (const fn of fns) {
      if (typeof fn !== 'function') throw new TypeError('middleware must be a function');
      middleware.push({ path, fn });
    }
    return app;
  }

  function addRouteImpl(method, path, ...fns) {
    if (fns.length === 0) throw new Error('route needs handler');
    const handler = fns.length === 1 ? fns[0] : (req, res, next) => {
      let i = 0;
      function _n(err) {
        if (err) return res.text(err.message || String(err), 500);
        const fn = fns[i++];
        if (!fn) return;
        try { fn(req, res, _n); } catch (e) { _n(e); }
      }
      _n();
    };
    routes.push({ method: method.toUpperCase(), path, handler, pathInfo: compilePath(path) });
    return app;
  }

  function createRes(reqId) {
    let sent = false;
    const headers = {};

    return {
      _sent: false,
      _sendObj(obj) {
        if (sent) return;
        sent = true;

        const cookies = Array.isArray(obj.cookies) ? obj.cookies : (obj.cookies ? [obj.cookies] : []);

        const payload = {
          status: obj.status ?? 200,
          headers: Object.assign({}, headers, obj.headers || {}),
          cookies,
          body: obj.body ?? ''
        };

        try {
          respond(String(reqId), JSON.stringify(payload));
        } catch (e) {
          console.error('respond failed', e);
        }
        this._sent = true;
      },

      send(a = 200, b = {}, c = [], d = '') {
        if (a && typeof a === 'object' && !Array.isArray(a)) {
          return this._sendObj(a);
        }
        return this._sendObj({
          status: a,
          headers: b,
          cookies: Array.isArray(c) ? c : (c ? [c] : []),
          body: d
        });
      },

      text(t, status = 200, cookies = []) {
        this._sendObj({ status, headers: { "Content-Type": "text/plain" }, cookies, body: String(t) });
      },

      html(h, status = 200, cookies = []) {
        this._sendObj({ status, headers: { "Content-Type": "text/html" }, cookies, body: String(h) });
      },

      json(o, status = 200, cookies = []) {
        this._sendObj({ status, headers: { "Content-Type": "application/json" }, cookies, body: JSON.stringify(o) });
      },

      redirect(loc, status = 302) {
        this._sendObj({ status, headers: { "Location": loc }, cookies: [], body: "Redirecting" });
      },

      setHeader(k, v) { headers[k] = v; },
      appendHeader(k, v) {
        const cur = headers[k];
        if (!cur) headers[k] = v;
        else if (Array.isArray(cur)) headers[k] = cur.concat(v);
        else headers[k] = [cur].concat(v);
      }
    };
  }

  // Small perf-minded helper: normalize header container (object or array-of-pairs)
  function normalizeHeadersCandidate(parsed) {
    if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') {
      const out = {};
      for (const k in parsed) {
        if (!Object.prototype.hasOwnProperty.call(parsed, k)) continue;
        out[String(k).toLowerCase()] = parsed[k];
      }
      return out;
    }

    if (Array.isArray(parsed)) {
      const out = {};
      for (let i = 0; i < parsed.length; i++) {
        const pair = parsed[i];
        if (!pair || pair.length === 0) continue;
        const rawKey = pair[0];
        if (rawKey == null) continue;
        const key = String(rawKey).toLowerCase();
        const val = pair.length > 1 ? pair[1] : '';
        const cur = out[key];
        if (cur === undefined) out[key] = val;
        else if (Array.isArray(cur)) cur.push(val);
        else out[key] = [cur, val];
      }
      return out;
    }

    return {};
  }

  function attachNative() {
    if (nativeRegistered) return;
    nativeRegistered = true;

    // N-API / napi-rs style: callback signature is (err, rawParts)
    // rawParts is expected to be an array with the 9-tuple:
    // [ reqId, path, method, query, headersJson, body, ip, cookiesJson, metaJson ]
    registerJsCallback((_, rawParts) => {
      // Return empty string per napi-rs expectation
      if (!rawParts || !Array.isArray(rawParts)) {
        // nothing to do
        return '';
      }

      // Destructure tuple with safe fallbacks
      const [
        reqIdRaw,
        pathRaw,
        methodRaw,
        rawQueryRaw,
        headersJsonRaw,
        bodyRaw,
        ipRaw,
        cookiesJsonRaw,
        metaJsonRaw
      ] = rawParts;

      const reqId = reqIdRaw != null ? String(reqIdRaw) : '';
      const path = pathRaw ?? '/';
      const method = (methodRaw ?? 'GET').toString().toUpperCase();
      const rawQuery = rawQueryRaw ?? '';

      // headersJsonRaw may be array-of-pairs or an object or a stringified JSON — try to parse only when string
      let headersRaw = headersJsonRaw;
      try {
        if (typeof headersJsonRaw === 'string' && headersJsonRaw.length > 0) {
          headersRaw = JSON.parse(headersJsonRaw);
        }
      } catch (e) {
        headersRaw = [];
      }

      // body as-is (string expected from native tuple)
      const body = bodyRaw ?? '';

      // ip
      const ip = ipRaw ?? '';

      // cookies: may be string or object
      let cookiesObj = cookiesJsonRaw;
      try {
        if (typeof cookiesJsonRaw === 'string' && cookiesJsonRaw.length > 0) {
          cookiesObj = JSON.parse(cookiesJsonRaw);
        }
      } catch (e) {
        cookiesObj = {};
      }

      // meta: may be string or object
      let meta = metaJsonRaw;
      try {
        if (typeof metaJsonRaw === 'string' && metaJsonRaw.length > 0) {
          meta = JSON.parse(metaJsonRaw);
        }
      } catch (e) {
        meta = {};
      }

      if (shuttingDown) {
        try {
          respond(String(reqId), JSON.stringify({ status: 503, headers: { 'Content-Type': 'text/plain' }, body: 'Server is shutting down' }));
        } catch (e) { /* ignore */ }
        return '';
      }

      pending++;

      // normalize headers/cookies/meta
      let headers;
      try {
        headers = normalizeHeadersCandidate(headersRaw);
      } catch (e) { headers = {}; }

      let cookies = {};
      try {
        if (cookiesObj && typeof cookiesObj === 'object' && !Array.isArray(cookiesObj)) cookies = cookiesObj;
        else cookies = {};
      } catch (e) { cookies = {}; }

      let metaParsed = {};
      try { if (meta && typeof meta === 'object' && !Array.isArray(meta)) metaParsed = meta; } catch (e) { metaParsed = {}; }

      // parse query into object
      const query = {};
      if (rawQuery) for (const [k, v] of new URLSearchParams(rawQuery)) query[k] = v;

      const req = { reqId: String(reqId), path, method, headers, query, body, cookies, meta: metaParsed, remoteAddr: ip, params: {} };
      const res = createRes(String(reqId));

      // routing match
      let matched = null;
      for (const r of routes) {
        if (r.method !== req.method && r.method !== 'ALL') continue;
        const m = r.pathInfo.regex.exec(path);
        if (!m) continue;
        req.params = {};
        for (let i = 0; i < r.pathInfo.names.length; i++) req.params[r.pathInfo.names[i]] = decodeURIComponent(m[i + 1] || '');
        matched = r;
        break;
      }

      const matchedHandlers = matched ? [matched.handler] : [];
      const matchedMw = middleware.filter(mw => matchPrefix(mw.path, path)).map(mw => mw.fn);
      const chain = [...matchedMw, ...(matchedHandlers.length ? matchedHandlers : [(req, res) => res.text('Not Found', 404)])];

      let idx = 0;
      function next(err) {
        if (err) {
          if (!res._sent) res.text('Error: ' + (err && err.message ? err.message : String(err)), 500);
          return finish();
        }
        const fn = chain[idx++];
        if (!fn) return finish();
        try {
          const out = fn(req, res, next);
          if (out && typeof out.then === 'function') {
            out.then(maybe => {
              if (!res._sent && maybe && typeof maybe === 'object' && ('status' in maybe || 'body' in maybe || 'headers' in maybe || 'cookies' in maybe)) {
                res._sendObj(maybe);
              }
            }).catch(err => next(err));
          } else if (out && typeof out === 'object' && ('status' in out || 'body' in out || 'headers' in out || 'cookies' in out)) {
            res._sendObj(out);
          }
        } catch (e) { next(e); }
      }

      function finish() { if (pending > 0) pending--; if (shuttingDown && pending === 0) finalizeShutdown(); }
      try { next(); } catch (e) { next(e); }

      return ''; // napi callback string return
    });
  }

  function listen(host, port, cb) {
    try {
      if (host && port) {
        startServer(host, port);
      } else {
        startServer();
      }
    } catch (e) {
      throw e;
    }
    listening = true;
    attachNative();
    if (cb) cb();
    return app;
  }

  function close(timeoutMs = 10000) {
    if (!listening) return Promise.resolve();
    if (shuttingDown) return Promise.resolve();
    shuttingDown = true;
    return new Promise((resolve) => {
      resolveClose = resolve;
      forcedTimer = setTimeout(() => { finalizeShutdown(); resolve(); }, timeoutMs);
      if (pending === 0) { finalizeShutdown(); resolve(); }
    });
  }

  function finalizeShutdown() {
    if (forcedTimer) clearTimeout(forcedTimer);
    setImmediate(() => {
      try { process.exitCode = 0; } catch (_) { }
      try { process.exit(0); } catch (_) {
        if (resolveClose) resolveClose();
      }
      if (resolveClose) resolveClose();
    });
  }

  function finalizeShutdownImmediate(exitCode = 1) {
    if (forcedTimer) clearTimeout(forcedTimer);
    setImmediate(() => {
      try { process.exit(exitCode); } catch (_) { /* ignore */ }
      if (resolveClose) resolveClose();
    });
  }

  let signalsInstalled = false;
  function installSignals() {
    if (signalsInstalled || typeof process === 'undefined' || !process.on) return;
    signalsInstalled = true;
    let firstSignal = true;
    const handler = (sig) => {
      if (firstSignal) {
        firstSignal = false;
        if (!shuttingDown) {
          shuttingDown = true;
          close(10000).then(() => { });
        }
        setTimeout(() => { firstSignal = true; }, 11000);
      } else {
        finalizeShutdownImmediate(1);
      }
    };
    process.on('SIGINT', () => handler('SIGINT'));
    process.on('SIGTERM', () => handler('SIGTERM'));
  }

  function del(path, ...fns) { return addRouteImpl('DELETE', path, ...fns); }

  const app = {
    use,
    get: (p, ...f) => addRouteImpl('GET', p, ...f),
    post: (p, ...f) => addRouteImpl('POST', p, ...f),
    put: (p, ...f) => addRouteImpl('PUT', p, ...f),
    del,
    delete: del,
    listen,
    close,
    _internal: { middleware, routes }
  };

  installSignals();
  return app;
}


module.exports = { createApp };
