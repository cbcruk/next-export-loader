import { spawn, type ChildProcess } from 'node:child_process';
import { exec } from 'node:child_process';
import { createConnection, createServer } from 'node:net';
import {
  createServer as createHttpServer,
  get as httpGet,
  type IncomingMessage,
  type Server,
} from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { promisify } from 'node:util';
import {
  test as base,
  expect,
  type Page,
} from '@playwright/test';

const execAsync = promisify(exec);

/** Playwright runs from the directory holding playwright.config.ts (repo root). */
export const repoRoot = process.cwd();

/** Server mode: `next dev` vs. a static-export build served from `out/`. */
export type Mode = 'dev' | 'static';

const PORT_WAIT_TIMEOUT_MS = 60_000;

/** Reserves a free TCP port by binding to port 0 and reading the assignment. */
export async function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, () => {
      const address = server.address();
      if (address === null || typeof address === 'string') {
        server.close();
        reject(new Error('Failed to acquire a port'));
        return;
      }
      const { port } = address;
      server.close(() => resolve(port));
    });
  });
}

/** Polls a port until something accepts connections, or times out. */
export async function waitForPort(port: number): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryConnect = (): void => {
      const socket = createConnection(port, '127.0.0.1');
      socket.once('connect', () => {
        socket.end();
        resolve();
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - start >= PORT_WAIT_TIMEOUT_MS) {
          reject(new Error(`Timeout waiting for port ${port}`));
          return;
        }
        setTimeout(tryConnect, 200);
      });
    };
    tryConnect();
  });
}

/**
 * Polls `GET <url>` until it returns 2xx. `next dev` accepts connections before
 * routes are compiled, so a bare port check isn't enough — this warms the home
 * route and confirms the server actually serves before tests start.
 */
async function waitForHttp200(url: string): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = (): void => {
      const req = httpGet(url, (res: IncomingMessage) => {
        res.resume();
        const status = res.statusCode ?? 0;
        if (status >= 200 && status < 400) {
          resolve();
          return;
        }
        retry();
      });
      req.on('error', retry);
    };
    const retry = (): void => {
      if (Date.now() - start >= PORT_WAIT_TIMEOUT_MS) {
        reject(new Error(`Timeout waiting for 200 from ${url}`));
        return;
      }
      setTimeout(attempt, 250);
    };
    attempt();
  });
}

function runShell(command: string, cwd: string): ChildProcess {
  return spawn(command, {
    cwd,
    shell: true,
    detached: process.platform !== 'win32',
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function terminate(cp: ChildProcess): Promise<void> {
  if (cp.exitCode !== null || cp.pid === undefined) return;
  if (process.platform === 'win32') {
    await execAsync(`taskkill /pid ${cp.pid} /t /f`).catch(() => {});
  } else {
    try {
      process.kill(-cp.pid, 'SIGTERM');
    } catch {
      // already exited
    }
  }
}

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

/**
 * Maps a request path to candidate files inside a `next export` `out/` dir,
 * matching Next's default (no trailing slash) routing: `/items` → `items.html`,
 * `/posts` → `posts/index.html`, asset paths served verbatim.
 */
function resolveCandidates(rootDir: string, urlPath: string): string[] {
  const safe = normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, '');
  if (safe === '/' || safe === '' || safe === '.') {
    return [join(rootDir, 'index.html')];
  }
  const base = join(rootDir, safe);
  if (extname(safe) !== '') return [base];
  return [`${base}.html`, join(base, 'index.html')];
}

/** Serves a `next export` output directory over HTTP. Zero dependencies. */
async function serveStatic(
  rootDir: string,
  port: number,
): Promise<{ close: () => Promise<void> }> {
  const server: Server = createHttpServer((req, res) => {
    const rawPath = (req.url ?? '/').split('?')[0]?.split('#')[0] ?? '/';
    const urlPath = decodeURIComponent(rawPath);
    const candidates = resolveCandidates(rootDir, urlPath);

    const tryNext = (index: number): void => {
      if (index >= candidates.length) {
        readFile(join(rootDir, '404.html'))
          .then((data) => {
            res.writeHead(404, { 'content-type': CONTENT_TYPES['.html'] });
            res.end(data);
          })
          .catch(() => {
            res.writeHead(404);
            res.end('Not found');
          });
        return;
      }
      const file = candidates[index] as string;
      readFile(file)
        .then((data) => {
          res.writeHead(200, {
            'content-type':
              CONTENT_TYPES[extname(file)] ?? 'application/octet-stream',
          });
          res.end(data);
        })
        .catch(() => tryNext(index + 1));
    };

    tryNext(0);
  });

  await new Promise<void>((resolve) => server.listen(port, resolve));
  return {
    close: () =>
      new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

export interface RunningExample {
  port: number;
  baseURL: string;
  stop: () => Promise<void>;
}

/**
 * Boots an example app and resolves once it accepts connections.
 *
 * - `dev` runs `next dev` on a free port.
 * - `static` serves the pre-built `out/` directory (built by global-setup).
 */
export async function startExample(
  name: string,
  mode: Mode,
): Promise<RunningExample> {
  const cwd = join(repoRoot, 'examples', name);
  const port = await getAvailablePort();
  const baseURL = `http://127.0.0.1:${port}`;

  if (mode === 'dev') {
    const cp = runShell(`npx next dev --port ${port}`, cwd);
    await waitForPort(port);
    await waitForHttp200(`${baseURL}/`);
    return { port, baseURL, stop: () => terminate(cp) };
  }

  const server = await serveStatic(join(cwd, 'out'), port);
  return { port, baseURL, stop: () => server.close() };
}

export { expect };

/**
 * Playwright test extended with:
 * - a worker-scoped `mode` option (set per project), and
 * - a `page` guard that fails the test on uncaught page errors.
 */
export const test = base.extend<
  Record<never, never>,
  { mode: Mode }
>({
  mode: ['dev', { option: true, scope: 'worker' }],
  page: async ({ page }: { page: Page }, use) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });
    await use(page);
    expect(
      pageErrors,
      `Uncaught page errors:\n${pageErrors.join('\n')}`,
    ).toEqual([]);
  },
});
