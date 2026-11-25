import { spawn } from 'node:child_process';
import {
  copyFileSync,
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  watch,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, extname, join, normalize, sep } from 'node:path';
import {
  type BuildStatus,
  PDF_PATH,
  PDFJS_ASSETS_PATH,
  STATUS_EVENT,
  STATUS_PATH,
} from './protocol.ts';
import type { Plugin } from 'vite';

// latexmk の生成物が入るディレクトリ
const OUT_DIR_NAME = '.llp';

// エディタの 1 回の保存で複数の変更イベントが届くため、少し待ってから 1 回だけビルドする
const DEBOUNCE_MS = 150;

// Vite を通すと Worker に document を参照する HMR クライアントが注入され、
// Worker が起動しないため、pdf.js の Worker やフォントデータはVite を通さずにそのまま配信する
const PDFJS_DIR = dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json'));
const PDFJS_ASSET_DIRS = ['build', 'cmaps', 'standard_fonts', 'wasm', 'iccs'];
const CONTENT_TYPES: Record<string, string> = {
  '.mjs': 'text/javascript',
  '.wasm': 'application/wasm',
};

/**
 * @function .tex のあるディレクトリを監視し、変更のたびに latexmk でビルドして、
 *           結果をクライアントに通知する Vite プラグインを返す
 *
 * @param options.texPath ビルドする .tex ファイルの絶対パス
 * @returns PDF とビルドの状態を配信する Vite プラグイン
 *
 * NOTE:
 *   - latexmk は .tex のディレクトリで実行するので、そこにある latexmkrc が使われる
 *   - ビルドに成功したら、PDF だけを .tex と同じディレクトリに <ジョブ名>.pdf としてコピーする
 */
export const llp = ({ texPath }: { texPath: string }): Plugin => {
  const dir = dirname(texPath);
  const texName = basename(texPath);
  const jobName = basename(texPath, extname(texPath));
  const outDir = join(dir, OUT_DIR_NAME);
  const builtPdfPath = join(outDir, `${jobName}.pdf`);
  const pdfPath = join(dir, `${jobName}.pdf`);
  const logPath = join(outDir, `${jobName}.log`);

  let status: BuildStatus = { state: 'building', version: 0 };

  return {
    name: 'llp',
    configureServer(server) {
      const { logger } = server.config;
      logger.info(`👀 watching: ${dir}`, { timestamp: true });

      const setStatus = (next: BuildStatus) => {
        status = next;
        server.ws.send(STATUS_EVENT, status);
      };

      let building = false;
      let pending = false;
      const build = () => {
        if (building) {
          pending = true;
          return;
        }
        building = true;
        setStatus({ ...status, state: 'building' });
        const started = Date.now();
        prepareOutDir(outDir);
        const args = [
          '-interaction=nonstopmode',
          '-halt-on-error',
          `-auxdir=${OUT_DIR_NAME}`,
          `-outdir=${OUT_DIR_NAME}`,
          texName,
        ];
        const child = spawn('latexmk', args, { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
        let output = '';
        child.stdout.on('data', (chunk) => (output += String(chunk)));
        child.stderr.on('data', (chunk) => (output += String(chunk)));
        child.on('error', (err) => (output += String(err)));
        child.on('close', (code) => {
          building = false;
          const seconds = ((Date.now() - started) / 1000).toFixed(1);
          if (code === 0) {
            logger.info(`✅ build succeeded in ${seconds}s`, { timestamp: true });
            try {
              copyFileSync(builtPdfPath, pdfPath);
            } catch (err) {
              // Windows では PDF ビューアが開いているファイルを上書きできないが、プレビューは続けられる
              logger.warn(`⚠️ could not copy PDF to ${pdfPath}: ${(err as Error).message}`, {
                timestamp: true,
              });
            }
            setStatus({ state: 'ok', version: status.version + 1 });
          } else {
            const error = extractError(logPath, output);
            logger.error(`❌ build failed in ${seconds}s: ${summarizeError(error)}`, {
              timestamp: true,
            });
            setStatus({ ...status, state: 'error', error });
          }
          if (pending) {
            pending = false;
            build();
          }
        });
      };

      const isGenerated = (file: string) => file.startsWith(`${jobName}.`) && file !== texName;
      const isHidden = (file: string) =>
        file.split(/[\\/]/).some((part) => part.startsWith('.') || part === 'node_modules');
      // 中のファイルを読んだだけでもディレクトリ自体のイベントが届くため、ディレクトリは無視する
      const isDirectory = (file: string) =>
        statSync(join(dir, file), { throwIfNoEntry: false })?.isDirectory() ?? false;

      let timer: NodeJS.Timeout | undefined;
      const watcher = watch(dir, { recursive: true }, (_event, file) => {
        if (!file || isGenerated(file) || isHidden(file) || isDirectory(file)) return;
        clearTimeout(timer);
        timer = setTimeout(build, DEBOUNCE_MS);
      });
      server.httpServer?.on('close', () => watcher.close());

      server.middlewares.use(STATUS_PATH, (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(status));
      });
      server.middlewares.use(PDF_PATH, (_req, res) => {
        if (!existsSync(builtPdfPath)) {
          res.statusCode = 404;
          res.end();
          return;
        }
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Cache-Control', 'no-store');
        createReadStream(builtPdfPath).pipe(res);
      });
      server.middlewares.use(PDFJS_ASSETS_PATH, (req, res, next) => {
        const path = normalize(join(PDFJS_DIR, decodeURIComponent((req.url ?? '').split('?')[0])));
        const inAssetDir = PDFJS_ASSET_DIRS.some((d) => path.startsWith(join(PDFJS_DIR, d) + sep));
        if (!inAssetDir || !existsSync(path) || !statSync(path).isFile()) return next();
        res.setHeader('Content-Type', CONTENT_TYPES[extname(path)] ?? 'application/octet-stream');
        createReadStream(path).pipe(res);
      });

      build();
    },
  };
};

/**
 * @function 生成物を置くディレクトリを用意する
 *
 * @param outDir 生成物を置くディレクトリのパス
 *
 * NOTE:
 *   - 中には「*」だけの .gitignore を置き、Git の管理から外す
 */
const prepareOutDir = (outDir: string): void => {
  mkdirSync(outDir, { recursive: true });
  const gitignorePath = join(outDir, '.gitignore');
  if (!existsSync(gitignorePath)) writeFileSync(gitignorePath, '*\n');
};

/**
 * @function LaTeX のログからエラー箇所を取り出す
 *
 * @param logPath LaTeX が出力した .log ファイルのパス
 * @param output latexmk の標準出力と標準エラー出力
 * @returns 「! 」で始まる最初のエラー行から 8 行分／見つからなければ output の末尾 20 行
 */
const extractError = (logPath: string, output: string): string => {
  if (existsSync(logPath)) {
    const lines = readFileSync(logPath, 'utf8').split(/\r?\n/);
    const i = lines.findIndex((line) => line.startsWith('! '));
    if (i >= 0) return lines.slice(i, i + 8).join('\n');
  }
  return output.split(/\r?\n/).slice(-20).join('\n');
};

/**
 * @function extractError が返したエラーを、ターミナルに出す 1 行に縮める
 *
 * @param error extractError の返り値
 * @returns 最初の空でない行。LaTeX の行番号 (l.77 など) があれば末尾に添える
 *
 * e.g.
 *   - @param error "! Undefined control sequence.\nl.77 ...現代人に\\undefinedcmd\n..."
 *     ↓
 *     @returns "! Undefined control sequence. (l.77)"
 */
const summarizeError = (error: string): string => {
  const lines = error.split('\n').map((line) => line.trim());
  const first = lines.find((line) => line !== '') ?? 'unknown error';
  const lineNumber = lines.map((line) => line.match(/^l\.(\d+)/)?.[1]).find(Boolean);
  return lineNumber ? `${first} (l.${lineNumber})` : first;
};
