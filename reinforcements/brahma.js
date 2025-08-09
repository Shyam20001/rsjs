// // Created by Shyam M (https://github.com/Shyam20001)
// // License: MIT

// const { registerJsCallback, startServer, parseFile } = require('./index'); // or './index.node'
// const { URLSearchParams } = require('url');

// /**
//  * @typedef {Object} BrahmaRequest
//  * @property {string} path
//  * @property {string} body
//  * @property {Object.<string, string>} headers
//  * @property {Object.<string, string>} query
//  *
//  * @typedef {Object} BrahmaResponse
//  * @property {number} [status]
//  * @property {Object.<string, string>} [headers]
//  * @property {string} [body]
//  */

// /**
//  * Register your request handler with the Brahma runtime.
//  * @param {(req: BrahmaRequest) => BrahmaResponse | Promise<BrahmaResponse>} handler
//  */
// function useBrahma(handler) {
//   registerJsCallback((_, rawParts) => {
//     // Defensive unpacking
//     const path = rawParts?.[0] || '';
//     const rawQuery = rawParts?.[1] || '';
//     const headersStr = rawParts?.[2] || '{}';
//     const body = rawParts?.[3] || '';

//     // Parse headers safely
//     let headers = {};
//     try {
//       headers = JSON.parse(headersStr);
//     } catch (err) {
//       console.warn("⚠️ Failed to parse headers JSON:", headersStr);
//     }

//     // Parse query string into object
//     const query = {};
//     for (const [key, value] of new URLSearchParams(rawQuery)) {
//       query[key] = value;
//     }

//     const req = {
//       path,
//       body,
//       headers,
//       query
//     };

//     const res = handler(req);

//     // Handle promise if async
//     if (typeof res?.then === 'function') {
//       return res.then(normalizeResponse);
//     }

//     return JSON.stringify(normalizeResponse(res));
//   });
// }

// /**
//  * Normalize the user response into a serializable object.
//  * @param {BrahmaResponse} res
//  * @returns {string}
//  */
// function normalizeResponse(res) {
//   return {
//     status: res?.status ?? 200,
//     headers: res?.headers ?? { 'Content-Type': 'text/plain' },
//     body: res?.body ?? ''
//   };
// }

// module.exports = {
//   startServer,
//   useBrahma,
//   parseFile
// };


////////////////////////  08092025
const { registerJsCallback, startServer, parseFile } = require('./index'); // or './index.node'
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
 * @param {(req: BrahmaRequest) => BrahmaResponse} handler
 */
function useBrahma(handler) {
  registerJsCallback((_, rawParts) => {
    const path = rawParts?.[0] || '';
    const rawQuery = rawParts?.[1] || '';
    const headersStr = rawParts?.[2] || '{}';
    const body = rawParts?.[3] || '';

    // Parse headers safely
    let headers = {};
    try {
      headers = JSON.parse(headersStr);
    } catch {
      console.warn("⚠️ Failed to parse headers JSON:", headersStr);
    }

    // Parse query string
    const query = {};
    for (const [key, value] of new URLSearchParams(rawQuery)) {
      query[key] = value;
    }

    // Call handler and enforce sync return
    const result = handler({ path, body, headers, query });
    if (result && typeof result.then === "function") {
      throw new Error("BrahmaJS handler must return synchronously (No Promise Allowed). Since its a fire and forget framework");
    }

    return JSON.stringify(normalizeResponse(result));
  });
}

/**
 * Normalize the user response into a serializable object.
 * @param {BrahmaResponse} res
 * @returns {BrahmaResponse}
 */
function normalizeResponse(res) {
  return {
    status: res?.status ?? 200,
    headers: res?.headers ?? { 'Content-Type': 'text/plain' },
    body: res?.body ?? ''
  };
}

/**
 * Helper to create a redirect response.
 * @param {string} location - Redirect URL
 * @param {number} [status=302] - Redirect status code
 * @returns {BrahmaResponse}
 */
function redirect(location, status = 302) {
  return {
    status,
    headers: { Location: location },
    body: ''
  };
}

module.exports = {
  startServer,
  useBrahma,
  parseFile,
  redirect
};
