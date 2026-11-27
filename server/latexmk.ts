/**
 * @file latexmk で .tex をビルドし、その結果を返す
 *       生成物は .tex の横の .llp/ にまとめ、PDF だけを .tex の横にコピーする
 */

import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';

// latexmk の生成物が入るディレクトリ
const OUT_DIR_NAME = '.llp';

/**
 * ビルドの結果
 *
 * - ok     : 成功したかどうか
 * - seconds: ビルドにかかった秒数
 * - error  : 失敗したときの LaTeX のエラーメッセージ
 */
export type BuildResult =
  | { ok: true; seconds: number }
  | { ok: false; seconds: number; error: string };

/**
 * @function .tex から、生成物のパスを求める
 *
 * @param texPath ビルドする .tex ファイルの絶対パス
 * @returns .llp/ の中の PDF とログ、.tex の横にコピーする PDF のパス
 */
export const outputPaths = (texPath: string) => {
  const dir = dirname(texPath);
  const jobName = basename(texPath, extname(texPath));
  const outDir = join(dir, OUT_DIR_NAME);
  return {
    outDir,
    builtPdf: join(outDir, `${jobName}.pdf`),
    log: join(outDir, `${jobName}.log`),
    pdf: join(dir, `${jobName}.pdf`),
  };
};

/**
 * @function latexmk で .tex をビルドする
 *
 * @param texPath ビルドする .tex ファイルの絶対パス
 * @param options.force latexmk に -g を付け、前回の状態にかかわらずビルドし直すかどうか
 * @returns ビルドの結果
 *
 * NOTE:
 *   - latexmk は .tex のディレクトリで実行するので、そこにある latexmkrc が使われる
 *   - 出力先はコマンドラインで .llp/ に固定するので、latexmkrc の $out_dir と $aux_dir は効かない
 *   - latexmk は前回失敗すると、ソースが変わるまでビルドし直さない
 *     足りないパッケージを入れたあとなどは、force でビルドし直させる
 */
export const runLatexmk = (
  texPath: string,
  { force = false }: { force?: boolean } = {},
): Promise<BuildResult> => {
  const paths = outputPaths(texPath);
  prepareOutDir(paths.outDir);
  const args = [
    ...(force ? ['-g'] : []),
    '-interaction=nonstopmode',
    '-halt-on-error',
    `-auxdir=${OUT_DIR_NAME}`,
    `-outdir=${OUT_DIR_NAME}`,
    basename(texPath),
  ];
  const started = Date.now();
  const child = spawn('latexmk', args, {
    cwd: dirname(texPath),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => (output += String(chunk)));
  child.stderr.on('data', (chunk) => (output += String(chunk)));
  child.on('error', (err) => (output += String(err)));
  return new Promise((resolve) => {
    child.on('close', (code) => {
      const seconds = (Date.now() - started) / 1000;
      resolve(
        code === 0
          ? { ok: true, seconds }
          : { ok: false, seconds, error: extractError(paths.log, output) },
      );
    });
  });
};

/**
 * @function .llp/ の中の PDF を .tex の横にコピーする
 *
 * @param texPath ビルドした .tex ファイルの絶対パス
 * @returns コピー先のパス
 */
export const copyPdf = (texPath: string): string => {
  const { builtPdf, pdf } = outputPaths(texPath);
  copyFileSync(builtPdf, pdf);
  return pdf;
};

/**
 * @function extractError が返したエラーを、ターミナルに出す 1 行に縮める
 *
 * @param error ビルドに失敗したときの BuildResult の error
 * @returns 最初の空でない行。LaTeX の行番号 (l.77 など) があれば末尾に添える
 *
 * e.g.
 *   - @param error "! Undefined control sequence.\nl.77 ...現代人に\\undefinedcmd\n..."
 *     ↓
 *     @returns "! Undefined control sequence. (l.77)"
 */
export const summarizeError = (error: string): string => {
  const lines = error.split('\n').map((line) => line.trim());
  const first = lines.find((line) => line !== '') ?? 'unknown error';
  const lineNumber = lines.map((line) => line.match(/^l\.(\d+)/)?.[1]).find(Boolean);
  return lineNumber ? `${first} (l.${lineNumber})` : first;
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
