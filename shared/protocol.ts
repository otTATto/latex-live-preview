/**
 * @file サーバー (server/) とブラウザ (client/) の間でやり取りする型・イベント名・URL パス
 */

/**
 * ビルドの状態
 *
 * - state  : ビルド中・成功・失敗のいずれか
 * - error  : 失敗したときの LaTeX のエラーメッセージ
 * - version: ビルドに成功するたびに増える。クライアントはこれが変わったら PDF を読み込み直す
 */
export type BuildStatus = {
  state: 'building' | 'ok' | 'error';
  error?: string;
  version: number;
};

export const STATUS_EVENT = 'llp:status';
export const STATUS_PATH = '/llp/status';
export const PDF_PATH = '/llp/document.pdf';
export const PDFJS_ASSETS_PATH = '/llp/pdfjs';

declare module 'vite/types/customEvent.d.ts' {
  interface CustomEventMap {
    'llp:status': BuildStatus;
  }
}
