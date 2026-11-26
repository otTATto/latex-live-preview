#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLogger, createServer } from 'vite';
import { DEFAULT_OPTIONS, loadConfig, parseCliArgs, USAGE } from '../server/options.ts';
import { llp } from '../server/plugin.ts';
import { resolveTexPath } from '../server/root.ts';

// Vite 自身のログもこのロガーを通るので、すべて [llp] として表示される
const logger = createLogger('info', { prefix: '[llp]' });

/** @param {unknown} err */
const messageOf = (err) => (err instanceof Error ? err.message : String(err));

let cli;
try {
  cli = parseCliArgs(process.argv.slice(2));
} catch (err) {
  logger.error(`${messageOf(err)}\n${USAGE}`, { timestamp: true });
  process.exit(2);
}

const pkgRoot = fileURLToPath(new URL('..', import.meta.url));

if (cli.help) {
  process.stdout.write(`${USAGE}\n`);
  process.exit(0);
}
if (cli.version) {
  const { version } = JSON.parse(readFileSync(resolve(pkgRoot, 'package.json'), 'utf8'));
  process.stdout.write(`${version}\n`);
  process.exit(0);
}

let texPath;
let config;
try {
  texPath = await resolveTexPath(cli.target);
  if (texPath) config = loadConfig(texPath);
} catch (err) {
  logger.error(messageOf(err), { timestamp: true });
  process.exit(2);
}
if (!texPath) process.exit(130);

if (config) {
  logger.info(`⚙️ config: ${config.path}`, { timestamp: true });
  for (const warning of config.warnings) logger.warn(`⚠️ ${warning}`, { timestamp: true });
}
const options = { ...DEFAULT_OPTIONS, ...config?.options, ...cli.options };

const server = await createServer({
  configFile: false,
  customLogger: logger,
  root: resolve(pkgRoot, 'client'),
  cacheDir: resolve(pkgRoot, 'node_modules/.vite'),
  // pdf.js は ESM のまま配信する (事前バンドルすると Worker の扱いが壊れやすいため)
  optimizeDeps: { exclude: ['pdfjs-dist'] },
  server: {
    port: options.port,
    strictPort: options.strictPort,
    open: options.open,
    fs: { allow: [pkgRoot] },
  },
  plugins: [llp({ texPath })],
});
try {
  await server.listen();
} catch (err) {
  // strictPort でポートが使われていたときなど
  logger.error(messageOf(err), { timestamp: true });
  await server.close();
  process.exit(1);
}
server.printUrls();
