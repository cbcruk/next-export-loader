#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { buildLoaderHub, cleanLoaderHub } from './build-loader-hub';

const USAGE = `Usage: next-export-loader-devframe <build|clean> [options]

Commands:
  build   Bake the devframe hub into public/__devframes
  clean   Remove the baked hub

Options:
  --out-dir <dir>     Output directory (default: public/__devframes)
  --base-path <path>  Next basePath (default: $NEXT_BASE_PATH or '')`;

async function main(): Promise<void> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      'out-dir': { type: 'string' },
      'base-path': { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  const [command] = positionals;

  if (values.help || command === undefined) {
    console.log(USAGE);
    return;
  }

  const outDir = values['out-dir'];
  if (command === 'build') {
    await buildLoaderHub({
      outDir,
      basePath: values['base-path'] ?? process.env.NEXT_BASE_PATH ?? '',
    });
    return;
  }
  if (command === 'clean') {
    await cleanLoaderHub({ outDir });
    return;
  }

  console.error(`Unknown command: ${command}\n\n${USAGE}`);
  process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
