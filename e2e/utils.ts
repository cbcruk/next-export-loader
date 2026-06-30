import {
  createServer as createHttpServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { test as base, expect, type Page } from '@playwright/test';

/** Playwright runs from the directory holding playwright.config.ts (repo root). */
export const repoRoot = process.cwd();

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

function handleRequest(
  rootDir: string,
  req: IncomingMessage,
  res: ServerResponse,
): void {
  const rawPath = (req.url ?? '/').split('?')[0]?.split('#')[0] ?? '/';
  const candidates = resolveCandidates(rootDir, decodeURIComponent(rawPath));

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
}

export interface RunningExample {
  baseURL: string;
  stop: () => Promise<void>;
}

/**
 * Serves an example's pre-built static export (`out/`, built by global-setup)
 * over HTTP on a free port. Static-only: the loader runtime is client-side and
 * behaves identically under `next dev`, so the deterministic `output: 'export'`
 * build is the single source of truth for the e2e suite. Zero dependencies.
 */
export async function startExample(name: string): Promise<RunningExample> {
  const rootDir = join(repoRoot, 'examples', name, 'out');
  const server: Server = createHttpServer((req, res) =>
    handleRequest(rootDir, req, res),
  );

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    throw new Error('Failed to acquire a port for the static server');
  }

  return {
    baseURL: `http://127.0.0.1:${address.port}`,
    stop: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

export { expect };

/**
 * Asserts a navigation was *instant*: the loading fallback never appeared while
 * `action` ran (the library's core promise — on a cache hit the page mounts with
 * data and shows no loading frame of its own).
 *
 * Polling for absence is racy, so we install a MutationObserver in the page that
 * latches if any node containing `fallbackText` is ever added to the DOM. The
 * latch survives even a single frame the human eye would miss. `action` should
 * perform the navigation and await its settled result; `expectVisible` is then
 * checked to confirm the destination actually rendered (so a no-op can't pass).
 *
 * @param page - Playwright page.
 * @param fallbackText - Text rendered by the loading fallback (e.g. "Loading...").
 * @param action - Triggers the navigation and awaits the destination content.
 */
export async function expectInstantNavigation(
  page: Page,
  fallbackText: string,
  action: () => Promise<void>,
): Promise<void> {
  await page.evaluate((text) => {
    const w = window as unknown as { __nelFallbackSeen?: boolean };
    w.__nelFallbackSeen = false;
    const seen = (root: Node): boolean =>
      root instanceof HTMLElement && root.textContent
        ? root.textContent.includes(text)
        : false;
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (seen(node)) w.__nelFallbackSeen = true;
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // Also catch a fallback already on screen at the moment we start watching.
    if (document.body.textContent?.includes(text)) {
      w.__nelFallbackSeen = true;
    }
  }, fallbackText);

  await action();

  const fallbackSeen = await page.evaluate(() => {
    const w = window as unknown as { __nelFallbackSeen?: boolean };
    return w.__nelFallbackSeen === true;
  });

  expect(
    fallbackSeen,
    `Expected an instant navigation, but the "${fallbackText}" fallback appeared.`,
  ).toBe(false);
}

/** Playwright test with a `page` guard that fails on uncaught page errors. */
export const test = base.extend<Record<never, never>>({
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

/**
 * Returns a `test` bound to one example's static server, started once per worker
 * and stopped at teardown. Specs get the running server via the `app` fixture
 * (`async ({ page, app }) => …`) instead of repeating beforeAll/afterAll.
 */
export function describeExample(name: string) {
  return test.extend<Record<never, never>, { app: RunningExample }>({
    app: [
      async ({}, use) => {
        const app = await startExample(name);
        await use(app);
        await app.stop();
      },
      { scope: 'worker' },
    ],
  });
}
