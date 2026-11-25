/**
 * @file Vite を通すと Worker に document を参照する HMR クライアントが注入され Worker が起動しないため
 *       pdf.js の Worker やフォントデータを Vite を通さずにそのまま配信する
 */

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join, normalize, sep } from 'node:path';
import type { Connect } from 'vite';

const PDFJS_DIR = dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json'));
const PDFJS_ASSET_DIRS = ['build', 'cmaps', 'standard_fonts', 'wasm', 'iccs'];
const CONTENT_TYPES: Record<string, string> = {
  '.mjs': 'text/javascript',
  '.wasm': 'application/wasm',
};

/**
 * @function pdfjs-dist の中のファイルを配信する middleware
 *
 * NOTE:
 *   - PDFJS_ASSET_DIRS の中にあるファイルだけを配信し、それ以外は次の middleware に任せる
 */
export const servePdfjsAssets: Connect.NextHandleFunction = (req, res, next) => {
  const path = normalize(join(PDFJS_DIR, decodeURIComponent((req.url ?? '').split('?')[0])));
  const inAssetDir = PDFJS_ASSET_DIRS.some((d) => path.startsWith(join(PDFJS_DIR, d) + sep));
  if (!inAssetDir || !existsSync(path) || !statSync(path).isFile()) return next();
  res.setHeader('Content-Type', CONTENT_TYPES[extname(path)] ?? 'application/octet-stream');
  createReadStream(path).pipe(res);
};
