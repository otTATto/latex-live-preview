import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { waitForReconnect } from './browser.ts';
import type { AddressInfo } from 'node:net';

describe('waitForReconnect', () => {
  let server: Server;

  beforeEach(() => {
    server = createServer();
    // 届いた WebSocket の接続は、確かめたらすぐ切る
    server.on('upgrade', (_req, socket) => socket.destroy());
  });

  afterEach(() => {
    server.close();
  });

  const listen = () =>
    new Promise<string>((resolve) =>
      server.listen(0, '127.0.0.1', () =>
        resolve(`ws://127.0.0.1:${(server.address() as AddressInfo).port}/`),
      ),
    );

  // ブラウザのタブの代わりに、指定したプロトコルで WebSocket の接続を送る
  const connect = (url: string, protocol?: string) => {
    const socket = new WebSocket(url, protocol);
    socket.addEventListener('error', () => {});
  };

  it('残っているタブの ping (vite-ping) が届けば true を返す', async () => {
    const reconnected = waitForReconnect(server, 1000);
    connect(await listen(), 'vite-ping');

    assert.equal(await reconnected, true);
  });

  it('読み込み直したタブの接続 (vite-hmr) が届いても true を返す', async () => {
    const reconnected = waitForReconnect(server, 1000);
    connect(await listen(), 'vite-hmr');

    assert.equal(await reconnected, true);
  });

  it('待っても何も届かなければ false を返す', async () => {
    const reconnected = waitForReconnect(server, 100);
    await listen();

    assert.equal(await reconnected, false);
  });

  it('Vite のクライアント以外の WebSocket は無視する', async () => {
    const reconnected = waitForReconnect(server, 300);
    connect(await listen());

    assert.equal(await reconnected, false);
  });

  it('待つ時間は listen してから数える', async () => {
    const reconnected = waitForReconnect(server, 100);
    await new Promise((resolve) => setTimeout(resolve, 200));
    connect(await listen(), 'vite-ping');

    assert.equal(await reconnected, true);
  });
});
