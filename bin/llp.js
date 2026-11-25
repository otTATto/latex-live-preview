#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLogger, createServer } from 'vite';
import { llp } from '../src/plugin.ts';

// Vite 自身のログもこのロガーを通るので、すべて [llp] として表示される
const logger = createLogger('info', { prefix: '[llp]' });

const texArg = process.argv[2];
if (!texArg) {
  logger.error('usage: llp <file.tex>', { timestamp: true });
  process.exit(2);
}
const texPath = resolve(texArg);
if (!existsSync(texPath)) {
  logger.error(`file not found: ${texPath}`, { timestamp: true });
  process.exit(2);
}

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
