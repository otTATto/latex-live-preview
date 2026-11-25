/**
 * @file .tex のディレクトリを監視し、ビルドに関係する変更があったときだけ知らせる
 */

import { statSync, watch } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';

// エディタの 1 回の保存で複数の変更イベントが届くため、少し待ってから 1 回だけ知らせる
const DEBOUNCE_MS = 150;

/**
 * @function 探索や監視の対象から外すファイル・ディレクトリかどうかを判定する
 *
 * @param name パスを区切ったうちの 1 つの名前
 * @returns 隠しファイル・隠しディレクトリ・node_modules なら true
 */
export const isIgnoredName = (name: string): boolean =>
  name.startsWith('.') || name === 'node_modules';

/**
 * @function .tex のディレクトリ以下を監視する
 *
 * @param texPath ビルドする .tex ファイルの絶対パス
 * @param onChange 変更があったときに呼ぶ関数
 * @returns 監視を止める関数
 *
 * NOTE:
 *   - 隠しディレクトリ (.llp/ を含む)、ディレクトリ自体のイベント、ジョブ名で始まる生成物は無視する
 */
export const watchTexDir = (texPath: string, onChange: () => void): (() => void) => {
  const dir = dirname(texPath);
  const texName = basename(texPath);
  const jobName = basename(texPath, extname(texPath));

  // コピーした PDF や、手元で latexmk を直接実行したときの生成物を拾わないよう、ジョブ名で見分ける
  // ただし、図として読み込む PDF の変更は拾いたいので、拡張子では見分けない
  const isGenerated = (file: string) => file.startsWith(`${jobName}.`) && file !== texName;
  const isHidden = (file: string) => file.split(/[\\/]/).some(isIgnoredName);
  // 中のファイルを読んだだけでもディレクトリ自体のイベントが届くため、ディレクトリは無視する
  const isDirectory = (file: string) =>
    statSync(join(dir, file), { throwIfNoEntry: false })?.isDirectory() ?? false;

  let timer: NodeJS.Timeout | undefined;
  const watcher = watch(dir, { recursive: true }, (_event, file) => {
    if (!file || isGenerated(file) || isHidden(file) || isDirectory(file)) return;
    clearTimeout(timer);
    timer = setTimeout(onChange, DEBOUNCE_MS);
  });
  return () => {
    clearTimeout(timer);
    watcher.close();
  };
};
