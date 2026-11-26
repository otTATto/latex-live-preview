import assert from 'node:assert/strict';
import { appendFileSync, copyFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';
import { createServer, type ViteDevServer } from 'vite';
import { PDF_PATH, STATUS_PATH, type BuildStatus } from '../shared/protocol.ts';
import { copyFixture, fixturePath } from './fixtures/fixtures.ts';
import { llp } from './plugin.ts';

// 1 回の保存で余計なビルドが走らないことを確かめるために、ビルドが終わってから待つ時間
const SETTLE_MS = 1_000;

describe('llp プラグイン', { timeout: 120_000 }, () => {
  let dir: string;
  let texPath: string;
  let server: ViteDevServer;
  let baseUrl: string;

  const fetchStatus = async (): Promise<BuildStatus> =>
    (await fetch(`${baseUrl}${STATUS_PATH}`)).json() as Promise<BuildStatus>;

  // 状態が条件を満たすまで待ち、そのときの状態を返す (待ちすぎたらテストのタイムアウトで落ちる)
  const waitForStatus = async (isDone: (status: BuildStatus) => boolean): Promise<BuildStatus> => {
    for (;;) {
      const status = await fetchStatus();
      if (isDone(status)) return status;
      await sleep(100);
    }
  };

  before(async () => {
    ({ dir, texPath } = copyFixture('sample.tex'));

    server = await createServer({
      configFile: false,
      logLevel: 'silent',
      root: join(import.meta.dirname, '..', 'client'),
      server: { port: 0, open: false },
      plugins: [llp({ texPath })],
    });
    await server.listen();
    const url = server.resolvedUrls?.local[0];
    if (!url) throw new Error('dev server URL is not resolved');
    baseUrl = url.replace(/\/$/, '');
  });

  after(async () => {
    await server.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('起動するとビルドし、PDF を配信する', async () => {
    const status = await waitForStatus(({ state }) => state !== 'building');
    const res = await fetch(`${baseUrl}${PDF_PATH}`);

    assert.deepEqual(status, { state: 'ok', version: 1 });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'application/pdf');
  });

  it('.tex を保存するとビルドし直し、version を 1 つだけ進める', async () => {
    appendFileSync(texPath, '% 保存した\n');
    await waitForStatus(({ version }) => version === 2);
    await sleep(SETTLE_MS);

    assert.deepEqual(await fetchStatus(), { state: 'ok', version: 2 });
  });

  it('ビルドに失敗すると、version はそのままでエラーを返す', async () => {
    copyFileSync(fixturePath('error.tex'), texPath);
    const status = await waitForStatus(({ state }) => state === 'error');

    assert.equal(status.version, 2);
    assert.match(status.error ?? '', /^! Undefined control sequence\./);
  });
});
