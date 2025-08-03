// /* Created by https://github.com/Shyam20001 */
// /* eslint-disable */

// export declare function parseFile(path: string): string

// export declare function registerJsCallback(callback: ((err: Error | null, arg0: string, arg1: string, arg2: string, arg3: string) => string)): void

// export declare function startServer(host?: string | undefined | null, port?: number | undefined | null): Promise<void>


// brahma.d.ts

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
 * Starts the Rust-based HTTP server
 */
export declare function startServer(
  host?: string | null,
  port?: number | null
): Promise<void>;
