/**
 * @file ビルドのテストで使う文書 (フィクスチャ) を、一時ディレクトリにコピーして使えるようにする
 *       ビルドの生成物やテストでの書き換えでリポジトリを汚さないよう、フィクスチャは直接使わない
 */

import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export type FixtureName = 'sample.tex' | 'error.tex' | 'missing.tex';

/**
 * @function フィクスチャのパスを返す
 *
 * @param name フィクスチャのファイル名
 * @returns フィクスチャの絶対パス
 */
export const fixturePath = (name: FixtureName | 'latexmkrc'): string =>
  join(import.meta.dirname, name);

/**
 * @function latexmkrc と .tex を、新しく作った一時ディレクトリにコピーする
 *
 * @param name コピーする .tex のファイル名
 * @returns 一時ディレクトリと、コピーした .tex の絶対パス
 *
 * NOTE:
 *   - 一時ディレクトリはテストの後片付けで消すこと
 */
export const copyFixture = (name: FixtureName): { dir: string; texPath: string } => {
  const dir = mkdtempSync(join(tmpdir(), 'llp-'));
  copyFileSync(fixturePath('latexmkrc'), join(dir, 'latexmkrc'));
  copyFileSync(fixturePath(name), join(dir, name));
  return { dir, texPath: join(dir, name) };
};
