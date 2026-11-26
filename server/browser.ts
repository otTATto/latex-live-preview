/**
 * @file 起動時にブラウザを開くかどうかを決める
 *       前回の llp で開いたタブが残っていれば、新しいタブは開かずにそのタブを使ってもらう
 */

import type { IncomingMessage } from 'node:http';
import type { Server } from 'node:net';

// 残っているタブは 1 秒ごとに ping を送ってくるので、それより少し長く待つ
export const RECONNECT_TIMEOUT_MS = 1500;

// Vite のクライアントが WebSocket の接続に使うプロトコル
const CLIENT_PROTOCOLS = new Set(['vite-ping', 'vite-hmr']);

/**
 * @function 前回の llp で開いたタブが、つなぎ直してくるのを待つ
 *
 * @param httpServer Vite の開発サーバーの HTTP サーバー
 * @param timeoutMs listen してから待つ時間
 * @returns つなぎ直してきたら true、timeoutMs 待っても来なければ false
 *
 * NOTE:
 *   - Vite のクライアントはサーバーとの接続が切れると、1 秒ごとに vite-ping という WebSocket で
 *     サーバーが戻ったかを確かめ、戻ったらページを読み込み直す。この接続をタブが残っている印とみなす
 *   - 別のタブがアクティブになっている場合・ウィンドウが最小化されている場合など、
 *     非表示のタブは ping を止めるので、その場合は新しいタブを開くことになる
 *   - listen の直後に届く ping を取りこぼさないよう、listen する前に呼ぶこと
 */
export const waitForReconnect = (
  httpServer: Server,
  timeoutMs = RECONNECT_TIMEOUT_MS,
): Promise<boolean> =>
  new Promise((resolve) => {
    let timer: NodeJS.Timeout | undefined;
    const finish = (reconnected: boolean) => {
      clearTimeout(timer);
      httpServer.off('upgrade', onUpgrade);
      httpServer.off('listening', startTimer);
      resolve(reconnected);
    };
    const onUpgrade = (req: IncomingMessage) => {
      if (CLIENT_PROTOCOLS.has(req.headers['sec-websocket-protocol'] ?? '')) finish(true);
    };
    const startTimer = () => {
      timer = setTimeout(() => finish(false), timeoutMs);
    };

    httpServer.on('upgrade', onUpgrade);
    if (httpServer.listening) startTimer();
    else httpServer.once('listening', startTimer);
  });
