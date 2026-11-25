import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { resolveTexPath } from './root.ts';

const ROOT_TEX = '\\documentclass{article}\n\\begin{document}\nHello\n\\end{document}\n';
const CHAPTER_TEX = 'Hello\n';

describe('resolveTexPath', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'llp-root-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  // dir の中に、相対パスと中身の組でファイルを作る
  const write = (files: Record<string, string>) => {
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), content);
    }
  };

  it('ファイルを渡されたら、中身によらずそのファイルを返す', async () => {
    write({ 'chapters/intro.tex': CHAPTER_TEX });

    assert.equal(
      await resolveTexPath(join(dir, 'chapters/intro.tex')),
      join(dir, 'chapters/intro.tex'),
    );
  });

  it('ディレクトリを渡されたら、\\documentclass を含む .tex を返す', async () => {
    write({ 'main.tex': ROOT_TEX, 'chapters/intro.tex': CHAPTER_TEX });

    assert.equal(await resolveTexPath(dir), join(dir, 'main.tex'));
  });

  it('サブディレクトリにある .tex も探す', async () => {
    write({ 'paper/tex/main.tex': ROOT_TEX });

    assert.equal(await resolveTexPath(dir), join(dir, 'paper/tex/main.tex'));
  });

  it('コメントアウトされた \\documentclass は数えない', async () => {
    write({ 'main.tex': ROOT_TEX, 'old.tex': `% ${ROOT_TEX}` });

    assert.equal(await resolveTexPath(dir), join(dir, 'main.tex'));
  });

  it('隠しディレクトリと node_modules の中は探さない', async () => {
    write({
      'main.tex': ROOT_TEX,
      '.llp/main.tex': ROOT_TEX,
      'node_modules/pkg/sample.tex': ROOT_TEX,
    });

    assert.equal(await resolveTexPath(dir), join(dir, 'main.tex'));
  });

  it('候補が複数あって対話できなければ、候補を添えたエラーを投げる', async () => {
    write({ 'a/main.tex': ROOT_TEX, 'b/main.tex': ROOT_TEX });

    await assert.rejects(resolveTexPath(dir, { interactive: false }), (err: Error) => {
      assert.match(err.message, /multiple root \.tex files found/);
      assert.match(err.message, /a[\\/]main\.tex/);
      assert.match(err.message, /b[\\/]main\.tex/);
      return true;
    });
  });

  it('候補がなければエラーを投げる', async () => {
    write({ 'chapters/intro.tex': CHAPTER_TEX });

    await assert.rejects(resolveTexPath(dir), /no \.tex file with \\documentclass found/);
  });

  it('存在しないパスを渡されたらエラーを投げる', async () => {
    await assert.rejects(resolveTexPath(join(dir, 'nope')), /no such file or directory/);
  });
});
