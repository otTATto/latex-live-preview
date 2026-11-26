/**
 * @file コマンドライン引数と設定ファイル (llp.toml) を読み、llp の設定にまとめる
 *
 * 優先順位は コマンドライン引数 → llp.toml → 既定値 の順
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';
import { parse as parseToml } from 'smol-toml';

export const CONFIG_FILE_NAME = 'llp.toml';

/**
 * llp の設定
 *
 * - port      : 開発サーバーのポート番号
 * - strictPort: ポートが使われていたら、次の番号を試さずにエラーで終える
 * - open      : 起動時にブラウザを開く
 */
export type Options = {
  port: number;
  strictPort: boolean;
  open: boolean;
};

export const DEFAULT_OPTIONS: Options = { port: 1984, strictPort: false, open: true };

export const USAGE = `usage:
  llp [path] [options]  start the preview server
  llp build [path]      build once and exit

options:
  -p, --port <number>  port of the preview server (default: ${DEFAULT_OPTIONS.port})
      --strict-port    exit if the port is in use instead of trying the next one
      --no-open        do not open the browser
  -h, --help           show this help
  -v, --version        show the version`;

/**
 * コマンドライン引数を読んだ結果
 *
 * - command:
 *   - preview: プレビュー用のサーバーを立てる
 *   - build  : 1 回だけビルドして終了する
 * - target : ビルドする .tex ファイルか、それを探すディレクトリ
 * - options: 引数で指定された設定だけを持つ
 */
export type CliArgs = {
  command: 'preview' | 'build';
  target?: string;
  options: Partial<Options>;
  help: boolean;
  version: boolean;
};

/**
 * @function コマンドライン引数を読む
 *
 * @param args process.argv から node と bin のパスを除いたもの
 * @throws 知らないオプションや不正な値があるとき
 */
export const parseCliArgs = (args: string[]): CliArgs => {
  const { values, positionals } = parseArgs({
    args,
    options: {
      'port': { type: 'string', short: 'p' },
      'strict-port': { type: 'boolean' },
      'open': { type: 'boolean' },
      'help': { type: 'boolean', short: 'h' },
      'version': { type: 'boolean', short: 'v' },
    },
    allowPositionals: true,
    allowNegative: true,
  });
  // build という名前のディレクトリを渡したいときは ./build などと書けばよい
  const command = positionals[0] === 'build' ? 'build' : 'preview';
  const paths = command === 'build' ? positionals.slice(1) : positionals;
  if (paths.length > 1) throw new Error(`too many paths: ${paths.join(' ')}`);

  const options: Partial<Options> = {};
  if (values.port !== undefined) {
    const port = /^\d+$/.test(values.port) ? Number(values.port) : NaN;
    if (!isValidPort(port)) throw new Error(`invalid port: ${values.port}`);
    options.port = port;
  }
  if (values['strict-port'] !== undefined) options.strictPort = values['strict-port'];
  if (values.open !== undefined) options.open = values.open;

  return {
    command,
    target: paths[0],
    options,
    help: values.help ?? false,
    version: values.version ?? false,
  };
};

/**
 * 読み込んだ llp.toml
 *
 * - path    : 読み込んだファイルのパス
 * - options : ファイルに書かれていた設定だけを持つ
 * - warnings: 知らないキーなど、続行はできる問題
 */
export type LoadedConfig = {
  path: string;
  options: Partial<Options>;
  warnings: string[];
};

/**
 * @function .tex ファイルのディレクトリから親へさかのぼって llp.toml を探し、読み込む
 *
 * @returns 見つからなければ null
 * @throws TOML として読めない、または値の型が誤っているとき
 */
export const loadConfig = (texPath: string): LoadedConfig | null => {
  const path = findConfig(dirname(texPath));
  if (!path) return null;

  let table: Record<string, unknown>;
  try {
    table = parseToml(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new Error(`invalid ${path}: ${err instanceof Error ? err.message : String(err)}`, {
      cause: err,
    });
  }

  const options: Partial<Options> = {};
  const warnings: string[] = [];
  for (const [key, value] of Object.entries(table)) {
    switch (key) {
      case 'port':
        if (typeof value !== 'number' || !isValidPort(value))
          throw new Error(`invalid ${path}: port must be an integer from 1 to 65535`);
        options.port = value;
        break;
      case 'strict-port':
        if (typeof value !== 'boolean')
          throw new Error(`invalid ${path}: strict-port must be true or false`);
        options.strictPort = value;
        break;
      case 'open':
        if (typeof value !== 'boolean')
          throw new Error(`invalid ${path}: open must be true or false`);
        options.open = value;
        break;
      default:
        warnings.push(`unknown key in ${path}: ${key}`);
    }
  }
  return { path, options, warnings };
};

const findConfig = (startDir: string): string | null => {
  for (let dir = startDir; ; dir = dirname(dir)) {
    const path = join(dir, CONFIG_FILE_NAME);
    if (existsSync(path)) return path;
    if (dirname(dir) === dir) return null;
  }
};

const isValidPort = (port: number): boolean => Number.isInteger(port) && port >= 1 && port <= 65535;
