// Created by Shyam M (https://github.com/Shyam20001)
// License: MIT

const { registerJsCallback, startServer } = require('./index'); // or './index.node'
const { URLSearchParams } = require('url');

/**
 * @typedef {Object} BrahmaRequest
 * @property {string} path
 * @property {string} body
 * @property {Object.<string, string>} headers
 * @property {Object.<string, string>} query
 *
 * @typedef {Object} BrahmaResponse
 * @property {number} [status]
 * @property {Object.<string, string>} [headers]
 * @property {string} [body]
 */

/**
 * Register your request handler with the Brahma runtime.
 * @param {(req: BrahmaRequest) => BrahmaResponse | Promise<BrahmaResponse>} handler
 */
function useBrahma(handler) {
  registerJsCallback((_, rawParts) => {
    // Defensive unpacking
    const path = rawParts?.[0] || '';
    const rawQuery = rawParts?.[1] || '';
    const headersStr = rawParts?.[2] || '{}';
    const body = rawParts?.[3] || '';

    // Parse headers safely
    let headers = {};
    try {
      headers = JSON.parse(headersStr);
    } catch (err) {
      console.warn("⚠️ Failed to parse headers JSON:", headersStr);
    }

    // Parse query string into object
    const query = {};
    for (const [key, value] of new URLSearchParams(rawQuery)) {
      query[key] = value;
    }

    const req = {
      path,
      body,
      headers,
      query
    };

    const res = handler(req);

    // Handle promise if async
    if (typeof res?.then === 'function') {
      return res.then(normalizeResponse);
    }

    return JSON.stringify(normalizeResponse(res));
  });
}

/**
 * Normalize the user response into a serializable object.
 * @param {BrahmaResponse} res
 * @returns {string}
 */
function normalizeResponse(res) {
  return {
    status: res?.status ?? 200,
    headers: res?.headers ?? { 'Content-Type': 'text/plain' },
    body: res?.body ?? ''
  };
}

module.exports = {
  startServer,
  useBrahma
};
