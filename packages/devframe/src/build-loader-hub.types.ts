import type { DevframeDefinition } from 'devframe/types';

/** Options for {@link buildLoaderHub}. */
export interface BuildLoaderHubOptions {
  /**
   * Directory the hub is written into, resolved against `cwd`.
   * Default `public/__devframes`, which Next serves at `/__devframes/`.
   */
  outDir?: string;
  /**
   * The app's Next `basePath` (for example `/docs`), baked into the hub's
   * absolute URLs. Default `''`.
   */
  basePath?: string;
  /** Additional devframes to dock next to the loader panel. */
  devframes?: DevframeDefinition[];
  /** Working directory `outDir` is resolved against. Default `process.cwd()`. */
  cwd?: string;
}

/** Options for {@link cleanLoaderHub}. */
export type CleanLoaderHubOptions = Pick<BuildLoaderHubOptions, 'outDir' | 'cwd'>;
