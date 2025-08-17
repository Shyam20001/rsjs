// /* Created by https://github.com/Shyam20001 */
// /* eslint-disable */

// export declare function parseFile(path: string): string

// export declare function registerJsCallback(callback: ((err: Error | null, arg0: string, arg1: string, arg2: string, arg3: string) => string)): void

// export declare function startServer(host?: string | undefined | null, port?: number | undefined | null): Promise<void>


// brahma.d.ts

// export interface BrahmaRequest {
//   path: string;
//   body: string;
//   headers: Record<string, string>;
//   query: string;
// }

// export interface BrahmaResponse {
//   status?: number;
//   headers?: Record<string, string>;
//   body: string;
// }

// export type BrahmaHandler = (req: BrahmaRequest) => BrahmaResponse | Promise<BrahmaResponse>;

// /**
//  * Parses a static file from disk (if supported)
//  */
// export declare function parseFile(path: string): string;

// /**
//  * Internal hook for Rust to call JS handler
//  * Do NOT use directly; wrap it via `useBrahma()` in JS.
//  */
// export declare function registerJsCallback(
//   callback: (path: string, body: string, headers: string, query: string) => string | Promise<string>
// ): void;

// /**
//  * Starts the Rust-based HTTP server
//  */
// export declare function startServer(
//   host?: string | null,
//   port?: number | null
// ): Promise<void>;

///////////////////////////////// 08172025
// /* Created by https://github.com/Shyam20001 */
// /* eslint-disable */

export interface BrahmaRequest {
  path: string;
  body: string;
  headers: Record<string, string>;
  query: string;
}

export interface BrahmaResponse {
  status?: number;
  headers?: Record<string, string>;
  body: string;
}

export type BrahmaHandler = (req: BrahmaRequest) => BrahmaResponse | Promise<BrahmaResponse>;

/**
 * Parses a static file from disk (if supported)
 */
export declare function parseFile(path: string): string;

/**
 * Internal hook for Rust to call JS handler
 * Do NOT use directly; wrap it via `useBrahma()` in JS.
 */
export declare function registerJsCallback(
  callback: (path: string, body: string, headers: string, query: string) => string | Promise<string>
): void;

/**
 * Register a synchronous handler with the Brahma runtime.
 * @param handler - Function that handles requests and returns a BrahmaResponse
 */
export declare function useBrahma(handler: BrahmaHandler): void;

/**
 * Normalize a response to ensure all fields exist.
 * @param res - Partial or full BrahmaResponse
 * @returns A complete BrahmaResponse
 */
export declare function normalizeResponse(res: BrahmaResponse): BrahmaResponse;

/**
 * Create a redirect response.
 * @param location - Redirect URL
 * @param status - HTTP status code (default 302)
 * @returns A BrahmaResponse representing a redirect
 */
export declare function redirect(location: string, status?: number): BrahmaResponse;

/**
 * Parse a static file from disk (if supported)
 * @param path - Path to the file or site
 * @returns File contents as string
 */

/**
 * Starts the Rust-based HTTP server
 */
export declare function startServer(
  host?: string | null,
  port?: number | null
): Promise<void>;
