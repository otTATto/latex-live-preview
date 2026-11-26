import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { loadConfig, parseCliArgs } from './options.ts';

describe('parseCliArgs', () => {
  it('何も指定しなければ、設定は空で target もない', () => {
    assert.deepEqual(parseCliArgs([]), {
      target: undefined,
      options: {},
      help: false,
      version: false,
    });
  });

  it('パスとオプションを読む', () => {
    assert.deepEqual(parseCliArgs(['thesis', '-p', '3000', '--strict-port', '--no-open']), {
      target: 'thesis',
      options: { port: 3000, strictPort: true, open: false },
      help: false,
      version: false,
    });
  });

  it('--port=N の形も読める', () => {
    assert.equal(parseCliArgs(['--port=8080']).options.port, 8080);
  });

  it('ポート番号として正しくない値はエラーにする', () => {
    for (const port of ['abc', '0', '65536', '1.5', '-1'])
      assert.throws(() => parseCliArgs([`--port=${port}`]), /invalid port/, port);
  });

  it('知らないオプションはエラーにする', () => {
    assert.throws(() => parseCliArgs(['--unknown']));
  });

  it('パスが 2 つ以上あればエラーにする', () => {
    assert.throws(() => parseCliArgs(['a.tex', 'b.tex']), /too many paths/);
  });
});

describe('loadConfig', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'llp-options-'));
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

  it('llp.toml がなければ null を返す', () => {
    write({ 'main.tex': '' });

    assert.equal(loadConfig(join(dir, 'main.tex')), null);
  });

  it('設定を読む', () => {
    write({ 'main.tex': '', 'llp.toml': 'port = 3000\nstrict-port = true\nopen = false\n' });

    assert.deepEqual(loadConfig(join(dir, 'main.tex')), {
      path: join(dir, 'llp.toml'),
      options: { port: 3000, strictPort: true, open: false },
      warnings: [],
    });
  });

  it('.tex のディレクトリから親へさかのぼり、一番近い llp.toml を使う', () => {
    write({
      'llp.toml': 'port = 3000\n',
      'chapters/llp.toml': 'port = 4000\n',
      'chapters/intro/intro.tex': '',
      'appendix/appendix.tex': '',
    });

    assert.equal(loadConfig(join(dir, 'chapters/intro/intro.tex'))?.options.port, 4000);
    assert.equal(loadConfig(join(dir, 'appendix/appendix.tex'))?.options.port, 3000);
  });

  it('知らないキーは警告にとどめる', () => {
    write({ 'main.tex': '', 'llp.toml': 'port = 3000\nhost = "0.0.0.0"\n' });

    const config = loadConfig(join(dir, 'main.tex'));
    assert.deepEqual(config?.options, { port: 3000 });
    assert.equal(config?.warnings.length, 1);
    assert.match(config?.warnings[0] ?? '', /unknown key .*: host/);
  });

  it('値の型が誤っていればエラーにする', () => {
    write({ 'main.tex': '' });
    for (const toml of ['port = "3000"', 'port = 0', 'strict-port = "yes"', 'open = 1']) {
      write({ 'llp.toml': `${toml}\n` });
      assert.throws(() => loadConfig(join(dir, 'main.tex')), /invalid .*llp\.toml/, toml);
    }
  });

  it('TOML として読めなければエラーにする', () => {
    write({ 'main.tex': '', 'llp.toml': 'port = \n' });

    assert.throws(() => loadConfig(join(dir, 'main.tex')), /invalid .*llp\.toml/);
  });
});
