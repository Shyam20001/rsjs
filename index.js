// Created by Shyam M (https://github.com/Shyam20001)
// License: MIT
// BrahmaJS — Ultra-fast Node.js framework powered by Rust with SIMD-JSON (via NAPI-RS)
// Author: condensed for performance & clarity

const { startServer, registerJsCallback, respond } = require('./brahma');
const { URLSearchParams } = require('url'); // kept for compatibility in case used elsewhere

function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'); }
function compilePath(path) {
  const names = [];
  if (!path || path === '*') return { regex: /^.*$/, names };
  const segs = (path || '/').split('/').filter(Boolean);
  if (segs.length === 0) return { regex: /^\/$/, names };
  const parts = segs.map(seg => {
    if (seg.startsWith(':')) { names.push(seg.slice(1)); return '([^/]+)'; }
    if (seg === '*') return '(.*)';
    return escapeRegExp(seg);
  }).join('\\/');
  return { regex: new RegExp('^\\/' + parts + '\\/?$'), names };
}
function matchPrefix(mountPath, reqPath) {
  if (!mountPath || mountPath === '/' || mountPath === '*') return true;
  const n = mountPath.endsWith('/') ? mountPath.slice(0, -1) : mountPath;
  return reqPath === n || reqPath.startsWith(n + '/');
}

function createApp() {
  const middleware = [];
  const routes = [];
  // routeMap per method: exact map and param array
  const routeMap = {}; // e.g. routeMap["GET"] = Map of exact, routeMap["GET_param"] = []

  let shuttingDown = false, pending = 0;
  let nativeAttached = false, listening = false;

  function ensureRouteBuckets(method) {
    if (!routeMap[method]) routeMap[method] = new Map();
    if (!routeMap[method + '_param']) routeMap[method + '_param'] = [];
  }

  function use(pathOrFn, ...fns) {
    if (typeof pathOrFn === 'function') { middleware.push({ path: '/', fn: pathOrFn }); return app; }
    const path = pathOrFn || '/';
    if (fns.length === 0) throw new TypeError('middleware must be a function');
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
        const fn = fns[i++]; if (!fn) return;
        try { fn(req, res, _n); } catch (e) { _n(e); }
      }
      _n();
    };

    const route = { method: method.toUpperCase(), path, handler, pathInfo: compilePath(path) };
    routes.push(route);

    // maintain routeMap
    const m = route.method;
    ensureRouteBuckets(m);
    // static path: no params and no wildcard
    const isParam = route.pathInfo.names.length > 0 || path.includes('*');
    if (!isParam) {
      // normalize key: ensure leading slash
      const key = (path === '' || path === '/') ? '/' : (path.startsWith('/') ? path : '/' + path);
      routeMap[m].set(key, route);
    } else {
      routeMap[m + '_param'].push(route);
    }

    return app;
  }

  function createRes(reqId) {
    let sent = false;
    const headers = {};
    return {
      _sent: false,
      _sendObj(obj) {
        if (sent) return; sent = true;
        const cookies = Array.isArray(obj.cookies) ? obj.cookies : (obj.cookies ? [obj.cookies] : []);
        const payload = {
          status: obj.status ?? 200,
          headers: Object.assign({}, headers, obj.headers || {}),
          cookies,
          body: obj.body ?? ''
        };
        try { respond(String(reqId), JSON.stringify(payload)); } catch (e) { console.error('respond failed', e); }
        this._sent = true;
      },
      send(a = 200, b = {}, c = [], d = '') {
        if (a && typeof a === 'object' && !Array.isArray(a)) return this._sendObj(a);
        return this._sendObj({ status: a, headers: b, cookies: Array.isArray(c) ? c : (c ? [c] : []), body: d });
      },
      text(t, status = 200, cookies = []) { this._sendObj({ status, headers: { 'Content-Type': 'text/plain' }, cookies, body: String(t) }); },
      html(h, status = 200, cookies = []) { this._sendObj({ status, headers: { 'Content-Type': 'text/html' }, cookies, body: String(h) }); },
      json(o, status = 200, cookies = []) { this._sendObj({ status, headers: { 'Content-Type': 'application/json' }, cookies, body: JSON.stringify(o) }); },
      redirect(loc, status = 302) { this._sendObj({ status, headers: { Location: loc }, cookies: [], body: 'Redirecting' }); },
      setHeader(k, v) { headers[k] = v; },
      appendHeader(k, v) {
        const cur = headers[k];
        if (!cur) headers[k] = v;
        else if (Array.isArray(cur)) headers[k] = cur.concat(v);
        else headers[k] = [cur].concat(v);
      }
    };
  }

  // fast robust header parser: accepts object or array-of-pairs
  function normalizeHeadersCandidate(parsed) {
    if (!parsed) return {};
    if (!Array.isArray(parsed) && typeof parsed === 'object') {
      const out = {};
      for (const k of Object.keys(parsed)) { out[String(k).toLowerCase()] = parsed[k]; }
      return out;
    }
    if (Array.isArray(parsed)) {
      const out = {};
      for (let i = 0; i < parsed.length; i++) {
        const pair = parsed[i];
        if (!pair || pair.length === 0) continue;
        const key = String(pair[0]).toLowerCase();
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
    if (nativeAttached) return; nativeAttached = true;

    // callback shape expected from Rust:
    // [ reqId, path, method, query, headersJson, body, peerAddr, cookieHeader ]
    registerJsCallback((_, rawParts) => {
      if (!rawParts || !Array.isArray(rawParts)) return '';

      const [
        reqIdRaw, pathRaw, methodRaw, rawQueryRaw,
        headersJsonRaw, bodyRaw, peerAddrRaw, cookieHeaderRaw
      ] = rawParts;

      const reqId = reqIdRaw != null ? String(reqIdRaw) : '';
      const path = pathRaw ?? '/';
      const method = (methodRaw ?? 'GET').toString().toUpperCase();
      const rawQuery = rawQueryRaw ?? '';

      // headersJsonRaw may be a string or object/array already — parse only if string
      let headersRaw = headersJsonRaw;
      if (typeof headersJsonRaw === 'string' && headersJsonRaw.length > 0) {
        try { headersRaw = JSON.parse(headersJsonRaw); } catch (e) { headersRaw = []; }
      }

      const headers = normalizeHeadersCandidate(headersRaw);

      const body = bodyRaw ?? '';

      // parse cookie header cheaply (prefers cookieHeaderRaw)
      const cookies = {};
      const cookieStr = (typeof cookieHeaderRaw === 'string' && cookieHeaderRaw) ? cookieHeaderRaw : (headers['cookie'] || '');
      if (cookieStr) {
        const parts = cookieStr.split(/; */);
        for (let i = 0; i < parts.length; i++) {
          const pair = parts[i];
          if (!pair) continue;
          const idx = pair.indexOf('=');
          if (idx > 0) {
            const k = pair.slice(0, idx).trim();
            const v = pair.slice(idx + 1).trim();
            if (k) cookies[k] = v;
          }
        }
      }

      // parse peerAddr into ip/port (IPv6-aware by splitting at last colon)
      const peerAddr = (typeof peerAddrRaw === 'string') ? peerAddrRaw : (peerAddrRaw ? String(peerAddrRaw) : '');
      let remoteIp = '', remotePort = '', remoteAddr = '';
      if (peerAddr) {
        remoteAddr = peerAddr;
        const lastColon = peerAddr.lastIndexOf(':');
        if (lastColon > 0) {
          remotePort = peerAddr.slice(lastColon + 1);
          remoteIp = peerAddr.slice(0, lastColon);
          if (remoteIp.startsWith('[') && remoteIp.endsWith(']')) remoteIp = remoteIp.slice(1, -1);
        } else {
          remoteIp = peerAddr;
        }
      }

      if (shuttingDown) {
        try {
          respond(String(reqId), JSON.stringify({ status: 503, headers: { 'Content-Type': 'text/plain' }, body: 'Server shutting down' }));
        } catch (_) { }
        return '';
      }

      pending++;

      // parse query (faster small parser, behavior-preserving for simple queries)
      const query = {};
      if (rawQuery) {
        const parts = String(rawQuery).split('&');
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          if (!p) continue;
          const idx = p.indexOf('=');
          if (idx === -1) {
            try { query[decodeURIComponent(p)] = ''; } catch (e) { query[p] = ''; }
          } else {
            const key = p.slice(0, idx);
            const val = p.slice(idx + 1);
            try { query[decodeURIComponent(key)] = decodeURIComponent(val); } catch (e) { query[key] = val; }
          }
        }
      }

      const req = {
        reqId: String(reqId),
        path,
        method,
        headers,
        query,
        body,
        cookies,
        rawCookies: cookieStr,
        remoteAddr,
        remoteIp,
        remotePort,
        params: {}
      };

      const res = createRes(String(reqId));

      // routing: fast exact-map then param arrays
      let matched = null;

      // fast exact match for method
      const methodMap = routeMap[req.method];
      if (methodMap && methodMap.has(path)) {
        matched = methodMap.get(path);
      } else {
        // check method param routes then ALL param routes
        const methodParam = routeMap[req.method + '_param'] || [];
        const allParam = routeMap['ALL_param'] || [];
        const paramLists = methodParam.length ? methodParam : [];
        // concat with ALL_param without allocating a new array when possible
        let found = false;
        for (let i = 0; i < methodParam.length && !found; i++) {
          const r = methodParam[i];
          const m = r.pathInfo.regex.exec(path);
          if (!m) continue;
          req.params = {};
          for (let j = 0; j < r.pathInfo.names.length; j++) req.params[r.pathInfo.names[j]] = decodeURIComponent(m[j + 1] || '');
          matched = r; found = true; break;
        }
        if (!matched) {
          for (let i = 0; i < allParam.length; i++) {
            const r = allParam[i];
            const m = r.pathInfo.regex.exec(path);
            if (!m) continue;
            req.params = {};
            for (let j = 0; j < r.pathInfo.names.length; j++) req.params[r.pathInfo.names[j]] = decodeURIComponent(m[j + 1] || '');
            matched = r; break;
          }
        }
      }

      // build chain without intermediate arrays
      const chain = [];
      for (let i = 0; i < middleware.length; i++) {
        const mw = middleware[i];
        if (matchPrefix(mw.path, path)) chain.push(mw.fn);
      }
      chain.push(matched ? matched.handler : ((rq, rs) => rs.text('Not Found', 404)));

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
            out.then(resObj => {
              if (!res._sent && resObj && typeof resObj === 'object' && ('status' in resObj || 'body' in resObj || 'headers' in resObj || 'cookies' in resObj)) {
                res._sendObj(resObj);
              }
            }).catch(err => next(err));
          } else if (out && typeof out === 'object' && ('status' in out || 'body' in out || 'headers' in out || 'cookies' in out)) {
            res._sendObj(out);
          }
        } catch (e) { next(e); }
      }

      function finish() { if (pending > 0) pending--; /* shutdown handled elsewhere */ }
      try { next(); } catch (e) { next(e); }

      return ''; // napi callback string return
    });
  }

  function listen(host, port, cb) {
    if (host && port) startServer(host, port);
    else startServer();
    listening = true;
    attachNative();
    if (cb) cb();
    return app;
  }

  function close(timeoutMs = 10000) {
    if (!listening) return Promise.resolve();
    shuttingDown = true;
    return new Promise(resolve => {
      const t = setTimeout(() => { resolve(); }, timeoutMs);
      // simple graceful: resolve immediately if no pending
      if (pending === 0) { clearTimeout(t); resolve(); }
    });
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
    _internal: { middleware, routes, routeMap }
  };

  return app;
}

module.exports = { createApp }; 3