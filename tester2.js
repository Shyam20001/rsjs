// FINAL 08242025 Async Support 
let summaId 

// tester.js
const { startServer, registerJsCallback, respond, shutdownServer, parseFile } = require('./index');
//setStaticDir(require('path').join(__dirname, '08092025'));

// ---------- utils ----------
const parseJSON = (s, fallback = {}) => { try { return s ? JSON.parse(s) : fallback; } catch { return fallback; } };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// If you're on Node 18+, global fetch exists; otherwise: const fetch = (...a) => import('node-fetch').then(({default:f}) => f(...a));

// ---------- background job store ----------
const jobs = new Map(); // id -> { status: 'pending'|'done'|'error', result?: any, error?: string }

// kick off a fake long job
async function runLongJob(id, payload) {
  try {
    jobs.set(id, { status: 'pending' });
    // simulate work
    await sleep(2000);
    // could do DB, queue, compute, etc.
    jobs.set(id, { status: 'done', result: { ok: true, received: payload ?? null } });
  } catch (e) {
    jobs.set(id, { status: 'error', error: String(e?.message || e) });
  }
}

// ---------- router (async) ----------
async function route({ method, path, query, headers, body }) {
  // parse JSON if content-type indicates
  const ct = (headers['content-type'] || headers['Content-Type'] || '').toLowerCase();
  const jsonBody = ct.includes('application/json') ? parseJSON(body, null) : null;

  // 1) trivial async
  if (path === '/hi') {
    //   console.log(method, path, query, headers, body)
    // await sleep(2000); // simulate I/O
    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'poda punda', summaId}),
    };
  }

  // 2) HTML response
  if (path === '/bye') {
    //  await sleep(1000);
    return {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
      body: `<h1>Hello, ${path}</h1>`,
    };
  }

  // 3) external API call
  if (path === '/github') {
    const r = await fetch('https://api.github.com/rate_limit', { headers: { 'User-Agent': 'brahma-js-demo' } });
    const data = await r.json();
    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, data }),
    };
  }

  // 4) simulate slow route with per-route timeout guard
  if (path === '/slow') {
    // soft timeout pattern in JS (your Rust already has a 30s hard timeout)
    const guard = new Promise((_, rej) => setTimeout(() => rej(new Error('JS soft timeout 1s')), 1000));
    const work = (async () => {
      await sleep(1500); // slower than 1s -> will trigger
      return { status: 200, headers: { 'Content-Type': 'text/plain' }, body: 'done' };
    })();
    try {
      return await Promise.race([guard, work]);
    } catch (e) {
      return { status: 504, headers: { 'Content-Type': 'text/plain' }, body: 'Gateway Timeout (JS)' };
    }
  }

  // 5) background job creation (returns 202 immediately)
  if (path === '/start-job' && method === 'POST') {
    const id = uid();
    runLongJob(id, jsonBody); // fire & forget
    return {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: id, status: 'accepted' }),
    };
  }

  // 6) poll job status
  if (path.startsWith('/job/')) {
    const id = path.split('/').pop();
    const state = jobs.get(id);
    if (!state) {
      return { status: 404, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'unknown job id' }) };
    }
    return { status: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...state }) };
  }

  // 7) echo JSON body back (useful for testing POST)
  if (path === '/echo' && method === 'POST') {
    // console.log(body, jsonBody)
    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ you_sent: jsonBody, raw: body, query, headers, method }),
    };
  }

  // default 404
  return {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invalid: '404 - Not Found', path }),
  };
}


// ---------- napi callback plumbing ----------
// With napi-rs tuple TSFN, you receive ONE argument which is an array: [reqId, path, query, headersJson, body]
registerJsCallback(async (_, args) => {
  const [reqIdRaw, path, queryStr, headersJson, body] = Array.isArray(args) ? args : [];
  //  console.log(args)
  const reqId = (reqIdRaw ?? '').toString();
  if (!reqId) {
    console.error('Missing reqId from native callback. Make sure Rust sends (req_id, path, query, headers_json, body).');
    return;
  }

  // You can parse method from headers (hyper gives it in `:method` header if you forward it),
  // or tack it onto the query/body from Rust. For now we infer method as GET if no body else POST.
  const headers = parseJSON(headersJson, {});
  const method = headers[':method'] || (body && body.length ? 'POST' : 'GET');

  try {
    const resp = await route({
      method,
      path,
      query: queryStr || '',
      headers,
      body: body || '',
    });
    //   console.log(resp)
    respond(reqId, JSON.stringify(resp));
    summaId = reqId
  } catch (err) {
    console.error('Route error:', err);
    respond(reqId, JSON.stringify({
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Internal Server Error',
    }));
  }
});

// ---------- start ----------
startServer('0.0.0.0', 2000)
  .then(() => console.log('Rust HTTP server started on http://0.0.0.0:3000'))
  .catch((e) => { console.error('Failed to start server:', e); process.exit(1); });

// ---------- graceful shutdown ----------
let shuttingDown = false;

async function gracefulExit(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    console.log('→ Graceful shutdown: notifying Rust…');
    await shutdownServer();          // IMPORTANT: await
    console.log('✓ Rust shut down. Exiting.');
  } catch (e) {
    console.error('Shutdown error:', e);
  } finally {
    process.exit(code);
  }
}

// Handle Ctrl+C / kill
process.on('SIGINT', () => gracefulExit(0));
process.on('SIGTERM', () => gracefulExit(0));

// Optional: clean up on Node “beforeExit”
process.on('beforeExit', () => gracefulExit(0));

// Optional: catch unhandled errors and try to shut down cleanly
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  gracefulExit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  gracefulExit(1);
});

//console.log(parseFile('./yarn.lock'))