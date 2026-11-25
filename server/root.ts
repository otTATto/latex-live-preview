/**
 * @file llp に渡されたパスから、ビルドの起点となる .tex ファイルを決める
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { isCancel, select } from '@clack/prompts';
import { isIgnoredName } from './watcher.ts';

// コメントアウトされた \documentclass は数えない
const DOCUMENTCLASS_PATTERN = /^[^%\n]*\\documentclass\b/m;

/**
 * @function llp に渡されたパスから、ビルドする .tex ファイルを決める
 *
 * @param target llp に渡されたパス（省略されたらカレントディレクトリ）
 * @returns ビルドする .tex ファイルの絶対パス または null
 *
 * NOTE:
 *   - ファイルならそれをそのまま使い、ディレクトリなら \documentclass を含む .tex を探す
 *   - 候補が複数あれば、
 *     - 対話できるとき: 選択肢を表示して選ばせる
 *     - そうでないとき: 候補を添えたエラーを投げる
 */
export const resolveTexPath = async (target = '.'): Promise<string | null> => {
  const path = resolve(target);
  const stat = statSync(path, { throwIfNoEntry: false });
  if (!stat) throw new Error(`no such file or directory: ${path}`);
  if (stat.isFile()) return path;

  const roots = findRootTexFiles(path);
  if (roots.length === 0) throw new Error(`no .tex file with \\documentclass found in ${path}`);
  if (roots.length === 1) return roots[0];

  const options = roots.map((root) => ({ value: root, label: relative(path, root) }));
  if (!isInteractive()) {
    const list = options.map(({ label }) => `  - ${label}`).join('\n');
    throw new Error(`multiple root .tex files found; specify one of them:\n${list}`);
  }
  const selected = await select({ message: 'Which .tex file to preview?', options });
  return isCancel(selected) ? null : selected;
};

/**
 * @function ディレクトリ以下から、\documentclass を含む .tex ファイルを探す
 *
 * @param dir 探すディレクトリの絶対パス
 * @returns 見つかった .tex ファイルの絶対パスの配列
 */
const findRootTexFiles = (dir: string): string[] => {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (isIgnoredName(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...findRootTexFiles(path));
    else if (entry.name.endsWith('.tex') && DOCUMENTCLASS_PATTERN.test(readFileSync(path, 'utf8')))
      found.push(path);
  }
  return found.sort();
};

// パイプや CI では選択肢を出しても答えられないので、対話できるかどうかを判定する
const isInteractive = (): boolean =>
  Boolean(process.stdin.isTTY && process.stdout.isTTY) && !process.env.CI;
