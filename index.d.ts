// /* Created by https://github.com/Shyam20001 */
// /* eslint-disable */

/**
 * Represents an HTTP request object passed to handlers.
 * 
 * Similar to Express.js `Request`, but powered by Brahma-Firelight (v2).
 */
export interface Request {
  /** Unique request ID generated internally. */
  id: string;

  /** HTTP method used for the request (GET, POST, PUT, DELETE, etc.). */
  method: string;

  /** Path of the request (e.g. `/users/123`). */
  path: string;

  /** Key/value map of parsed query string parameters. */
  query: Record<string, string>;

  /** Key/value map of all request headers. */
  headers: Record<string, string>;

  /**
   * Request body.
   * - Parsed as JSON if content-type is JSON (done in Rust, before reaching JS).
   * - Otherwise returned as string.
   */
  body: any;

  /** Path parameters extracted from dynamic routes (e.g. `/users/:id`). */
  params: Record<string, string>;

  /** Original full request URL before modifications. */
  originalUrl: string;

  /** Current request URL. */
  url: string;

  /**
   * Optional: Use Rust SIMD accelerated JSON parser for ultra-fast parsing.
   * Returns parsed JSON object or `null` if parsing fails.
   */
  simdjson(): any | null;

  /**
   * Raw body as a Node.js `Buffer`.  
   * Data is already base64-decoded for convenience.
   */
  raw(): Buffer;
}

/**
 * Represents an HTTP response object passed to handlers.
 * 
 * Similar to Express.js `Response`.
 */
export interface Response {
  /**
   * Set HTTP status code (e.g. 200, 404, 500).
   * Returns the same `Response` object for chaining.
   */
  status(code: number): this;

  /**
   * Set a response header field/value pair.
   * Alias for `setHeader`.
   */
  set(field: string, value: string): this;

  /**
   * Set a response header (same as `set`).
   */
  setHeader(field: string, value: string): this;

  /**
   * Send a JSON response.  
   * Optionally set status code.
   */
  json(body: any, status?: number): void;

  /**
   * Send plain text response.  
   * Optionally set status code.
   */
  text(body: string, status?: number): void;

  /**
   * Send HTML response.  
   * Optionally set status code.
   */
  html(body: string, status?: number): void;

  /**
   * Redirect client to a different URL.
   * Optionally set redirect status code (default 302).
   */
  redirect(url: string, status?: number): void;

  /**
   * Send raw string or Buffer data as response.  
   * If `raw` is true, data will not be modified.
   */
  send(body: string | Buffer, raw?: boolean): void;
}

/**
 * A middleware/route handler function.
 * 
 * Works the same way as in Express:
 * - `(req, res)` for simple handlers
 * - `(req, res, next)` for middleware
 */
export type Handler = (req: Request, res: Response, next?: () => void) => void | Promise<void>;

/**
 * Main application class for Brahma-Firelight server.
 */
export class BrahmaApp {
  constructor();

  /**
   * Register middleware function.  
   * Called on every request before reaching routes.
   */
  use(middleware: Handler): void;

  /** Register GET route handler. */
  get(path: string, handler: Handler): void;

  /** Register POST route handler. */
  post(path: string, handler: Handler): void;

  /** Register PUT route handler. */
  put(path: string, handler: Handler): void;

  /** Register DELETE route handler. */
  delete(path: string, handler: Handler): void;

  /**
 * Start listening on given port/host.  
 * Defaults: host = "0.0.0.0", port = 3000.
 */
  listen(port?: number, host?: string): Promise<void>;


  /** Gracefully shut down the server. */
  shutdown(): Promise<void>;
}

/**
 * Utility: Read a file’s contents (UTF-8).  
 * Similar to `fs.readFileSync` but powered by Rust for speed.
 */
export declare function parseFile(path: string): string;

/**
 * Utility: Parse JSON string using Rust SIMD JSON parser.  
 * Much faster than `JSON.parse` for large payloads.
 */
export declare function parseJsonSimd(input: string): any;

/**
 * Low-level: Register a callback for handling incoming requests from Rust.  
 * Not usually needed unless writing custom framework extensions.
 */
export declare function registerJsCallback(cb: (err: Error | null, args: any[]) => string): void;

/**
 * Low-level: Send a response back to Rust runtime.  
 * Normally handled internally by `Response` methods.
 */
export declare function respond(reqId: string, payload: any): void;

/**
 * Stop the running server from JS side.  
 * Same as `BrahmaApp.shutdown()`.
 */
export declare function shutdownServer(): Promise<void>;

/**
 * Start the server manually from JS side.  
 * Same as `BrahmaApp.listen()`.
 */
export declare function startServer(host?: string | null, port?: number | null): Promise<void>;
