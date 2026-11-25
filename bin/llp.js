#!/usr/bin/env node
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLogger, createServer } from 'vite';
import { llp } from '../server/plugin.ts';
import { resolveTexPath } from '../server/root.ts';

// Vite 自身のログもこのロガーを通るので、すべて [llp] として表示される
const logger = createLogger('info', { prefix: '[llp]' });

const target = process.argv[2];
if (target?.startsWith('-')) {
  logger.error(`unknown option: ${target}\nusage: llp [path]`, { timestamp: true });
  process.exit(2);
}

let texPath;
try {
  texPath = await resolveTexPath(target);
} catch (err) {
  logger.error(err instanceof Error ? err.message : String(err), { timestamp: true });
  process.exit(2);
}
if (!texPath) process.exit(130);

const pkgRoot = fileURLToPath(new URL('..', import.meta.url));

const server = await createServer({
  configFile: false,
  customLogger: logger,
  root: resolve(pkgRoot, 'client'),
  cacheDir: resolve(pkgRoot, 'node_modules/.vite'),
  // pdf.js は ESM のまま配信する (事前バンドルすると Worker の扱いが壊れやすいため)
  optimizeDeps: { exclude: ['pdfjs-dist'] },
  server: { open: true, fs: { allow: [pkgRoot] } },
  plugins: [llp({ texPath })],
});
await server.listen();
server.printUrls();
