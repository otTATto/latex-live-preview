import assert from 'node:assert/strict';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { copyFixture } from './fixtures/fixtures.ts';
import { copyPdf, runLatexmk, summarizeError } from './latexmk.ts';

describe('runLatexmk', { timeout: 120_000 }, () => {
  let dir: string;

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('ビルドに成功すると、生成物を .llp/ にまとめ、.tex の横には何も出さない', async () => {
    const fixture = copyFixture('sample.tex');
    dir = fixture.dir;

    const result = await runLatexmk(fixture.texPath);

    assert.equal(result.ok, true);
    assert.ok(existsSync(join(dir, '.llp', 'sample.pdf')));
    assert.ok(existsSync(join(dir, '.llp', 'sample.aux')));
    assert.equal(existsSync(join(dir, 'sample.aux')), false);
    assert.equal(existsSync(join(dir, 'sample.pdf')), false);
  });

  it('.llp/ には、中身をすべて Git の管理から外す .gitignore を置く', async () => {
    const fixture = copyFixture('sample.tex');
    dir = fixture.dir;

    await runLatexmk(fixture.texPath);

    assert.equal(readFileSync(join(dir, '.llp', '.gitignore'), 'utf8'), '*\n');
  });

  it('copyPdf で、ビルドした PDF を .tex の横にコピーする', async () => {
    const fixture = copyFixture('sample.tex');
    dir = fixture.dir;
    await runLatexmk(fixture.texPath);

    const copied = copyPdf(fixture.texPath);

    assert.equal(copied, join(dir, 'sample.pdf'));
    assert.deepEqual(readFileSync(copied), readFileSync(join(dir, '.llp', 'sample.pdf')));
  });

  it('ビルドに失敗すると、LaTeX のエラーメッセージと行番号を返す', async () => {
    const fixture = copyFixture('error.tex');
    dir = fixture.dir;

    const result = await runLatexmk(fixture.texPath);

    if (result.ok) assert.fail('build should fail');
    assert.equal(summarizeError(result.error), '! Undefined control sequence. (l.5)');
  });
});
