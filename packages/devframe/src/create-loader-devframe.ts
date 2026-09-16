import { fileURLToPath } from 'node:url';
import { defineDevframe } from 'devframe';
import type { DevframeDefinition } from 'devframe/types';
import { LOADER_DEVFRAME_ID } from 'next-export-loader/devframe';

const PANEL_DIST = fileURLToPath(new URL('./panel', import.meta.url));

/**
 * Creates the devframe that docks the next-export-loader navigation panel into a hub.
 *
 * The definition carries no RPC. The panel reads everything from the page
 * script (`mountLoaderPageScript` in `next-export-loader/devframe`) over the
 * in-page channel, so the same built panel works in a live hub and in a static
 * {@link buildLoaderHub} build alike.
 *
 * @example Mount into a custom hub build
 * ```ts
 * import { buildHub } from '@devframes/hub/build';
 * import { createLoaderDevframe } from 'next-export-loader-devframe';
 *
 * await buildHub({ outDir: 'public/__devframes', devframes: [createLoaderDevframe()] });
 * ```
 */
export function createLoaderDevframe(): DevframeDefinition {
  return defineDevframe({
    id: LOADER_DEVFRAME_ID,
    name: 'next-export-loader',
    version: '0.1.0',
    packageName: 'next-export-loader-devframe',
    homepage: 'https://github.com/cbcruk/next-export-loader',
    description:
      'Loader navigations: phase, duration, redirect chain, and errors.',
    icon: 'ph:path-duotone',
    importMetaUrl: import.meta.url,
    clientAssets: PANEL_DIST,
    setup() {},
  });
}
