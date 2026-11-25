/**
 * @file llp の本体となる Vite プラグイン
 *       .tex のディレクトリを監視して latexmk でビルドし、PDF とビルドの状態をブラウザに配信する
 */

import { createReadStream, existsSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import {
  type BuildStatus,
  PDF_PATH,
  PDFJS_ASSETS_PATH,
  STATUS_EVENT,
  STATUS_PATH,
} from '../shared/protocol.ts';
import { copyPdf, outputPaths, runLatexmk, summarizeError } from './latexmk.ts';
import { servePdfjsAssets } from './pdfjs.ts';
import { watchTexDir } from './watcher.ts';
import type { Plugin } from 'vite';

/**
 * @function .tex のあるディレクトリを監視し、変更のたびに latexmk でビルドして、
 *           結果をクライアントに通知する Vite プラグインを返す
 *
 * @param options.texPath ビルドする .tex ファイルの絶対パス
 * @returns PDF とビルドの状態を配信する Vite プラグイン
 */
export const llp = ({ texPath }: { texPath: string }): Plugin => {
  const { builtPdf } = outputPaths(texPath);
  let status: BuildStatus = { state: 'building', version: 0 };

  return {
    name: 'llp',
    configureServer(server) {
      const { logger } = server.config;
      logger.info(`👀 watching: ${dirname(texPath)}`, { timestamp: true });
      logger.info(`📄 target: ${basename(texPath)}`, { timestamp: true });

      const setStatus = (next: BuildStatus) => {
        status = next;
        server.ws.send(STATUS_EVENT, status);
      };

      // ビルド中に変更があったら、終わってからもう 1 回だけビルドする
      let building = false;
      let pending = false;
      const build = async () => {
        if (building) {
          pending = true;
          return;
        }
        building = true;
        setStatus({ ...status, state: 'building' });
        const result = await runLatexmk(texPath);
        const seconds = result.seconds.toFixed(1);
        if (result.ok) {
          logger.info(`✅ build succeeded in ${seconds}s`, { timestamp: true });
          try {
            copyPdf(texPath);
          } catch (err) {
            // Windows では PDF ビューアが開いているファイルを上書きできないが、プレビューは続けられる
            logger.warn(`⚠️ could not copy PDF: ${(err as Error).message}`, { timestamp: true });
          }
          setStatus({ state: 'ok', version: status.version + 1 });
        } else {
          logger.error(`❌ build failed in ${seconds}s: ${summarizeError(result.error)}`, {
            timestamp: true,
          });
          setStatus({ ...status, state: 'error', error: result.error });
        }
        building = false;
        if (pending) {
          pending = false;
          void build();
        }
      };

      const stopWatching = watchTexDir(texPath, () => void build());
      server.httpServer?.on('close', stopWatching);

      server.middlewares.use(STATUS_PATH, (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(status));
      });
      server.middlewares.use(PDF_PATH, (_req, res) => {
        if (!existsSync(builtPdf)) {
          res.statusCode = 404;
          res.end();
          return;
        }
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Cache-Control', 'no-store');
        createReadStream(builtPdf).pipe(res);
      });
      server.middlewares.use(PDFJS_ASSETS_PATH, servePdfjsAssets);

      void build();
    },
  };
};
