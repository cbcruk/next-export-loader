import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildHub } from '@devframes/hub/build';
import { createUi } from '@devframes/hub-ui';
import { DEFAULT_HUB_OUT_DIR, HUB_BASE } from './constants';
import { createLoaderDevframe } from './create-loader-devframe';
import type {
  BuildLoaderHubOptions,
  CleanLoaderHubOptions,
} from './build-loader-hub.types';

/**
 * Bakes a static devframe hub with the loader panel into the app's `public/` directory.
 *
 * Next serves the result as plain files, so the hub needs no server or API
 * route and works under `output: 'export'`. The output is a development
 * artifact (about 1.3MB): run this before `next dev` and remove it with
 * {@link cleanLoaderHub} before a production build.
 *
 * @example Package scripts
 * ```json
 * {
 *   "predev": "next-export-loader-devframe build",
 *   "prebuild": "next-export-loader-devframe clean"
 * }
 * ```
 *
 * @example Programmatic build
 * ```ts
 * import { buildLoaderHub } from 'next-export-loader-devframe';
 *
 * await buildLoaderHub({ basePath: process.env.NEXT_BASE_PATH });
 * ```
 */
export async function buildLoaderHub(
  options: BuildLoaderHubOptions = {},
): Promise<string> {
  const cwd = options.cwd ?? process.cwd();
  const outDir = resolve(cwd, options.outDir ?? DEFAULT_HUB_OUT_DIR);
  const basePath = (options.basePath ?? '').replace(/\/+$/, '');

  await buildHub({
    outDir,
    base: `${basePath}${HUB_BASE}`,
    cwd,
    devframes: [createLoaderDevframe(), ...(options.devframes ?? [])],
    ui: createUi(),
  });
  return outDir;
}

/**
 * Removes a hub baked by {@link buildLoaderHub}, so it does not ship in a production export.
 *
 * @returns The absolute path that was removed.
 */
export async function cleanLoaderHub(
  options: CleanLoaderHubOptions = {},
): Promise<string> {
  const outDir = resolve(
    options.cwd ?? process.cwd(),
    options.outDir ?? DEFAULT_HUB_OUT_DIR,
  );
  await rm(outDir, { recursive: true, force: true });
  return outDir;
}
