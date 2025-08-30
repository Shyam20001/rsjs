// /* Created by https://github.com/Shyam20001 */
// /* eslint-disable */

/**
 * HTTP Request object.
 */
export interface Request {
  id: string;
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: any;                  // ✅ parsed (lazy JSON.parse)
  params: Record<string, string>;
  originalUrl: string;
  url: string;

  /**
   * SIMD accelerated JSON parser (optional use).
   */
  simdjson(): any | null;

  /**
   * Raw body as Buffer.
   */
  raw(): Buffer;
}

/**
 * HTTP Response object.
 */
export interface Response {
  /**
   * Set HTTP status code.
   */
  status(code: number): this;

  /**
   * Set a response header (Express-style).
   */
  set(field: string, value: string): this;

  /**
   * Set a response header (Node.js alias).
   */
  setHeader(field: string, value: string): this;

  json(body: any, status?: number): void;
  text(body: string, status?: number): void;
  html(body: string, status?: number): void;
  redirect(url: string, status?: number): void;
  file(path: string, status?: number): void;
  send(body: string | Buffer, raw?: boolean): void;
}

/**
 * Route handler / middleware type.
 */
export type Handler = (req: Request, res: Response, next?: () => void) => void | Promise<void>;

/**
 * Main BrahmaJS application class.
 */
export class BrahmaApp {
  constructor();

  /**
   * Register a global middleware.
   */
  use(middleware: Handler): void;

  get(path: string, handler: Handler): void;
  post(path: string, handler: Handler): void;
  put(path: string, handler: Handler): void;
  delete(path: string, handler: Handler): void;

  /**
   * Start listening for connections.
   */
  listen(port?: number, host?: string): Promise<void>;

  /**
   * Shut down the server.
   */
  shutdown(): Promise<void>;
}

// Native exports
export declare function parseFile(path: string): string;

/**
 * SIMD-accelerated JSON parser (returns JSON string).
 */
export declare function parseJsonSimd(input: string): string;
