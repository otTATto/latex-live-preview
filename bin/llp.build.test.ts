import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { copyFixture } from '../server/fixtures/fixtures.ts';

const LLP = join(import.meta.dirname, 'llp.js');

// llp コマンドを、テスト用の一時ディレクトリで実行する
const runLlp = (args: string[], cwd: string) =>
  spawnSync(process.execPath, [LLP, ...args], { cwd, encoding: 'utf8' });

describe('llp build', { timeout: 120_000 }, () => {
  let dir: string;

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('ビルドに成功すると、.tex の横に PDF を置いて終了コード 0 で終わる', () => {
    const fixture = copyFixture('sample.tex');
    dir = fixture.dir;

    const result = runLlp(['build'], dir);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /build succeeded/);
    assert.ok(existsSync(join(dir, 'sample.pdf')));
  });

  it('ビルドに失敗すると、エラーの全文を出して終了コード 1 で終わる', () => {
    const fixture = copyFixture('error.tex');
    dir = fixture.dir;

    const result = runLlp(['build', 'error.tex'], dir);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /! Undefined control sequence\./);
    assert.match(result.stderr, /l\.5 \\undefinedcmd/);
    assert.equal(existsSync(join(dir, 'error.pdf')), false);
  });
});
