// Created by Shyam M (https://github.com/Shyam20001)
// License: MIT
// BrahmaJS — Ultra-fast Node.js framework powered by Rust (via NAPI-RS)

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
          respond(reqId, JSON.stringify(payload));
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
  // - If headersStr is an array-of-pairs, this converts in-place to a plain object with lowercased keys.
  // - Duplicate headers are accumulated into arrays only when duplicates are present.
  // - Minimal allocations on fast path.
  function normalizeHeadersCandidate(parsed) {
    // If it's already an object (and not an array), lowercase keys and return a new object.
    if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') {
      const out = {};
      for (const k in parsed) {
        if (!Object.prototype.hasOwnProperty.call(parsed, k)) continue;
        out[String(k).toLowerCase()] = parsed[k];
      }
      return out;
    }

    // If it's an array, assume it's [ [name, value], ... ] and convert efficiently.
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

    // Unknown type -> return empty
    return {};
  }

  function attachNative() {
    if (nativeRegistered) return;
    nativeRegistered = true;

    registerJsCallback((_, rawParts) => {
      if (!rawParts) return;

      // full 9-element tuple supported
      const [
        reqId,
        path = '/',
        method = 'GET',
        rawQuery = '',
        headersStr = '{}',
        body = '',
        ip = '',
        cookiesStr = '{}',
        metaStr = '{}'
      ] = rawParts;

      if (shuttingDown) {
        respond(reqId, JSON.stringify({ status: 503, headers: { 'Content-Type': 'text/plain' }, body: 'Server is shutting down' }));
        return;
      }

      pending++;

      // -- parse headers/cookies/meta with minimal overhead and normalize --
      let headers = {};
      try {
        // Fast parse - if headersStr is already a JSON object string or array string, parse it.
        const parsedH = headersStr ? JSON.parse(headersStr) : {};
        headers = normalizeHeadersCandidate(parsedH);
      } catch (e) {
        headers = {};
      }

      let cookies = {};
      try {
        const parsedC = cookiesStr ? JSON.parse(cookiesStr) : {};
        // cookies are usually an object; keep as-is (but ensure it's an object)
        if (parsedC && typeof parsedC === 'object' && !Array.isArray(parsedC)) cookies = parsedC;
        else cookies = {};
      } catch (e) {
        cookies = {};
      }

      let meta = {};
      try {
        const parsedM = metaStr ? JSON.parse(metaStr) : {};
        if (parsedM && typeof parsedM === 'object' && !Array.isArray(parsedM)) meta = parsedM;
        else meta = {};
      } catch (e) {
        meta = {};
      }

      // parse query string into object
      const query = {};
      if (rawQuery) for (const [k, v] of new URLSearchParams(rawQuery)) query[k] = v;

      const req = { reqId, path, method: method.toUpperCase(), headers, query, body, cookies, meta, remoteAddr: ip, params: {} };
      const res = createRes(reqId);

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
