// Created by Shyam M (https://github.com/Shyam20001)
// License: MIT
// BrahmaJS — Ultra-fast Node.js framework powered by Rust (via NAPI-RS)

const { startServer, registerJsCallback, respond } = require('./brahma'); // native addon
const { URLSearchParams } = require('url');

function escapeRegExp(s){ return s.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&'); }

function compilePath(path){
  const names = [];
  if (!path || path === '*') return { regex: /^.*$/, names };
  const segments = (path||'/').split('/').filter(Boolean);
  if (segments.length === 0) return { regex: /^\/$/, names };
  const parts = segments.map(seg => {
    if (seg.startsWith(':')) { names.push(seg.slice(1)); return '([^/]+)'; }
    if (seg === '*') return '(.*)';
    return escapeRegExp(seg);
  }).join('\\/');
  return { regex: new RegExp('^\\/' + parts + '\\/?$'), names };
}

function matchPrefix(mountPath, reqPath){
  if (!mountPath || mountPath === '/') return true;
  if (mountPath === '*') return true;
  const normalized = mountPath.endsWith('/') ? mountPath.slice(0,-1) : mountPath;
  return reqPath === normalized || reqPath.startsWith(normalized + '/');
}

function createApp(){
  const middleware = [];
  const routes = [];
  let shuttingDown = false;
  let pending = 0;
  let forcedTimer = null;
  let listening = false;
  let resolveClose = null;
  let nativeRegistered = false;

  function use(pathOrFn, ...fns){
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

  function addRouteImpl(method, path, ...fns){
    if (fns.length === 0) throw new Error('route needs handler');
    const handler = fns.length === 1 ? fns[0] : (req,res,next) => {
      let i=0;
      function _n(err){
        if (err) return res.text(err.message||String(err),500);
        const fn = fns[i++];
        if (!fn) return;
        try { fn(req,res,_n); } catch(e){ _n(e); }
      }
      _n();
    };
    routes.push({ method: method.toUpperCase(), path, handler, pathInfo: compilePath(path) });
    return app;
  }

  function createRes(reqId){
    let sent = false;
    const headers = {};
    return {
      _sent: false,
      _sendObj(obj){
        if (sent) return;
        sent = true;
        const payload = { status: obj.status ?? 200, headers: Object.assign({}, headers, obj.headers || {}), body: obj.body ?? '' };
        try { respond(reqId, JSON.stringify(payload)); } catch(e) {}
        this._sent = true;
      },
      send(status=200, hdrs={}, body=''){ this._sendObj({ status, headers: hdrs, body }); },
      text(t, status=200){ this._sendObj({ status, headers: { 'Content-Type': 'text/plain' }, body: String(t) }); },
      html(h, status=200){ this._sendObj({ status, headers: { 'Content-Type': 'text/html' }, body: String(h) }); },
      json(o, status=200){ this._sendObj({ status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(o) }); },
      redirect(loc, status=302){ this._sendObj({ status, headers: { Location: loc }, body: 'Redirecting' }); },
      setHeader(k,v){ headers[k]=v; },
      appendHeader(k,v){ const cur = headers[k]; if (!cur) headers[k]=v; else if (Array.isArray(cur)) headers[k]=cur.concat(v); else headers[k]=[cur].concat(v); }
    };
  }

  function attachNative() {
    if (nativeRegistered) return;
    nativeRegistered = true;

    registerJsCallback((_, rawParts) => {
      if (!rawParts) return;
      const [reqId, path='/', method='GET', rawQuery='', headersStr='{}', body=''] = rawParts;

      if (shuttingDown) {
        respond(reqId, JSON.stringify({ status:503, headers:{ 'Content-Type':'text/plain' }, body:'Server is shutting down' }));
        return;
      }

      pending++;

      let headers = {};
      try { headers = JSON.parse(headersStr || '{}'); } catch(e){ headers = {}; }

      const query = {};
      if (rawQuery) for (const [k,v] of new URLSearchParams(rawQuery)) query[k]=v;

      const req = { reqId, path, method: method.toUpperCase(), headers, query, body, params: {} };
      const res = createRes(reqId);

      let matched = null;
      for (const r of routes) {
        if (r.method !== req.method && r.method !== 'ALL') continue;
        const m = r.pathInfo.regex.exec(path);
        if (!m) continue;
        req.params = {};
        for (let i=0;i<r.pathInfo.names.length;i++) req.params[r.pathInfo.names[i]] = decodeURIComponent(m[i+1]||'');
        matched = r;
        break;
      }

      const matchedHandlers = matched ? [matched.handler] : [];
      const matchedMw = middleware.filter(mw => matchPrefix(mw.path, path)).map(mw => mw.fn);
      const chain = [...matchedMw, ...(matchedHandlers.length ? matchedHandlers : [(req,res) => res.text('Not Found',404)])];

      let idx = 0;
      function next(err){
        if (err) {
          if (!res._sent) res.text('Error: '+(err && err.message?err.message:String(err)),500);
          return finish();
        }
        const fn = chain[idx++];
        if (!fn) return finish();
        try {
          const out = fn(req,res,next);
          if (out && typeof out.then === 'function') {
            out.then(maybe => {
              if (!res._sent && maybe && typeof maybe === 'object' && ('status' in maybe || 'body' in maybe || 'headers' in maybe)) {
                res._sendObj({ status: maybe.status ?? 200, headers: maybe.headers ?? { 'Content-Type':'text/plain' }, body: maybe.body ?? '' });
              }
            }).catch(err => next(err));
          } else if (out && typeof out === 'object' && ('status' in out || 'body' in out || 'headers' in out)) {
            res._sendObj({ status: out.status ?? 200, headers: out.headers ?? { 'Content-Type':'text/plain' }, body: out.body ?? '' });
          }
        } catch(e){ next(e); }
      }

      function finish(){ if (pending > 0) pending--; if (shuttingDown && pending === 0) finalizeShutdown(); }
      try { next(); } catch(e) { next(e); }
    });
  }

  // listen(host, port, cb) -> call startServer(host, port) if both supplied, else startServer()
  function listen(host, port, cb){
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

  function close(timeoutMs = 10000){
    if (!listening) return Promise.resolve();
    if (shuttingDown) return Promise.resolve();
    shuttingDown = true;
    return new Promise((resolve) => {
      resolveClose = resolve;
      forcedTimer = setTimeout(() => { finalizeShutdown(); resolve(); }, timeoutMs);
      if (pending === 0) { finalizeShutdown(); resolve(); }
    });
  }

  // finalizeShutdown now forces process.exit after closing
  function finalizeShutdown(){
    if (forcedTimer) clearTimeout(forcedTimer);
    // give a small tick so any remaining respond() can flush
    setImmediate(() => {
      try { process.exitCode = 0; } catch(_) {}
      try { process.exit(0); } catch(_) {
        if (resolveClose) resolveClose();
      }
      if (resolveClose) resolveClose();
    });
  }

  // safer: if finalizeShutdown is used elsewhere
  function finalizeShutdownImmediate(exitCode = 1) {
    if (forcedTimer) clearTimeout(forcedTimer);
    setImmediate(() => {
      try { process.exit(exitCode); } catch(_) { /* ignore */ }
      if (resolveClose) resolveClose();
    });
  }

  // install signal handlers once, with two-stage behavior
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
          // start graceful close; after timeout finalizeShutdown will call process.exit(0)
          close(10000).then(() => { /* resolved by finalizeShutdown */ });
        }
        // if user presses ctrl+c again within timeout, force immediate exit
        setTimeout(() => { firstSignal = true; }, 11000); // reset after timeout + small grace
      } else {
        // second ctrl+c -> force immediate exit
        finalizeShutdownImmediate(1);
      }
    };
    process.on('SIGINT', () => handler('SIGINT'));
    process.on('SIGTERM', () => handler('SIGTERM'));
  }

  // route helpers
  function del(path, ...fns) { return addRouteImpl('DELETE', path, ...fns); }
  function addRouteImpl(method, path, ...fns) { return addRoute(method, path, ...fns); }
  function addRoute(method, path, ...fns){
    if (fns.length === 0) throw new Error('route needs handler');
    const handler = fns.length === 1 ? fns[0] : (req,res,next) => {
      let i=0;
      function _n(err){ if (err) return res.text(err.message||String(err),500); const fn=fns[i++]; if(!fn) return; try{ fn(req,res,_n);}catch(e){ _n(e);} }
      _n();
    };
    routes.push({ method: method.toUpperCase(), path, handler, pathInfo: compilePath(path) });
    return app;
  }

  const app = {
    use,
    get: (p,...f) => addRoute('GET', p, ...f),
    post: (p,...f) => addRoute('POST', p, ...f),
    put: (p,...f) => addRoute('PUT', p, ...f),
    del,
    delete: del,
    listen,
    close,
    _internal: { middleware, routes }
  };

  // ensure signals installed when app is created
  installSignals();

  return app;
}

module.exports = { createApp };
