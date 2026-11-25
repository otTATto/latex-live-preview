import assert from 'node:assert/strict';
import { createServer, get, type Server } from 'node:http';
import { after, before, describe, it } from 'node:test';
import { servePdfjsAssets } from './pdfjs.ts';
import type { AddressInfo } from 'node:net';

describe('servePdfjsAssets', () => {
  let server: Server;
  let port: number;

  // Vite と同じく、配信しないリクエストは次の middleware に回され、ここでは 404 になる
  before(async () => {
    server = createServer((req, res) =>
      servePdfjsAssets(req, res, () => {
        res.statusCode = 404;
        res.end();
      }),
    );
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as AddressInfo).port;
  });

  after(() => {
    server.close();
  });

  // fetch は送る前にパスの .. を解決してしまうため、パスをそのまま送れる http.get を使う
  const request = (path: string) =>
    new Promise<{ status?: number; contentType?: string }>((resolve, reject) => {
      get({ host: '127.0.0.1', port, path }, (res) => {
        res.resume();
        resolve({ status: res.statusCode, contentType: res.headers['content-type'] });
      }).on('error', reject);
    });

  it('Worker を JavaScript として配信する', async () => {
    const res = await request('/build/pdf.worker.min.mjs');

    assert.equal(res.status, 200);
    assert.equal(res.contentType, 'text/javascript');
  });

  it('和文フォントの描画に必要な CMap を配信する', async () => {
    const res = await request('/cmaps/UniJIS-UTF16-H.bcmap');

    assert.equal(res.status, 200);
  });

  it('pdfjs-dist の中でも、配信用のディレクトリの外にあるファイルは配信しない', async () => {
    const res = await request('/package.json');

    assert.equal(res.status, 404);
  });

  it('パスに .. を含めても、pdfjs-dist の外のファイルは配信しない', async () => {
    assert.equal((await request('/build/../../vite/package.json')).status, 404);
    assert.equal((await request('/build/%2e%2e/%2e%2e/vite/package.json')).status, 404);
  });
});
