import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import {
  type BuildStatus,
  PDF_PATH,
  PDFJS_ASSETS_PATH,
  STATUS_EVENT,
  STATUS_PATH,
} from '../src/protocol.ts';

GlobalWorkerOptions.workerSrc = `${PDFJS_ASSETS_PATH}/build/pdf.worker.min.mjs`;

const requireElement = (id: string): HTMLElement => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Element #${id} not found`);
  return element;
};

const pagesEl = requireElement('pages');
const buildErrorEl = requireElement('build-error');

/**
 * 表示中の PDF
 *
 * - task: 読み込みタスク（次の版に差し替えるときに破棄する）
 * - pdf : 読み込んだ PDF
 * - gen : 読み込むたびに増える世代番号。各ページがどの世代で描かれたかの判定に使う
 */
type LoadedDocument = {
  task: PDFDocumentLoadingTask;
  pdf: PDFDocumentProxy;
  gen: number;
};

let doc: LoadedDocument | null = null;
let loadedVersion = -1;
let loading = false;
let reloadRequested = false;

/**
 * @function PDF を読み込み直し、ページの枠を新しい版のものに差し替える
 *
 * NOTE:
 *   - 各枠には前の版の描画を仮に入れておき、実際の描画は見えている枠から renderPage で行う
 *   - 枠の大きさは前の版とほぼ同じなので、差し替え前後でスクロール位置を保てる
 *   - 読み込み中に呼ばれたら、終わってからもう一度だけ読み込む
 */
const load = async (): Promise<void> => {
  if (loading) {
    reloadRequested = true;
    return;
  }
  loading = true;
  try {
    const res = await fetch(`${PDF_PATH}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const task = getDocument({
      data: new Uint8Array(await res.arrayBuffer()),
      // 和文フォント (CID フォント) は CMap がないと描画できない
      cMapUrl: `${PDFJS_ASSETS_PATH}/cmaps/`,
      standardFontDataUrl: `${PDFJS_ASSETS_PATH}/standard_fonts/`,
      wasmUrl: `${PDFJS_ASSETS_PATH}/wasm/`,
      iccUrl: `${PDFJS_ASSETS_PATH}/iccs/`,
    });
    const pdf = await task.promise;
    const previous = doc;
    doc = { task, pdf, gen: (previous?.gen ?? 0) + 1 };

    const oldSlots = [...pagesEl.children];
    const slots: HTMLElement[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const { width, height } = (await pdf.getPage(i)).getViewport({ scale: 1 });
      const slot = document.createElement('div');
      slot.className = 'page';
      slot.dataset.page = String(i);
      slot.style.aspectRatio = `${width} / ${height}`;
      const oldCanvas = oldSlots[i - 1]?.querySelector('canvas');
      if (oldCanvas) slot.append(oldCanvas);
      slots.push(slot);
    }

    observer.disconnect();
    const { scrollX, scrollY } = window;
    pagesEl.replaceChildren(...slots);
    window.scrollTo(scrollX, scrollY);
    for (const slot of slots) observer.observe(slot);

    await previous?.task.destroy();
  } finally {
    loading = false;
    if (reloadRequested) {
      reloadRequested = false;
      void load();
    }
  }
};

/**
 * @function ページの枠に、表示中の版の PDF でそのページを描画する
 *
 * @param slot load が作ったページの枠
 *
 * NOTE:
 *   - すでに表示中の版で描画済みの枠は何もしない
 *   - 描画中に次の版へ差し替わった場合は、描画結果を捨てる
 */
const renderPage = async (slot: HTMLElement): Promise<void> => {
  const current = doc;
  if (!current || slot.dataset.gen === String(current.gen)) return;
  slot.dataset.gen = String(current.gen);
  try {
    const page = await current.pdf.getPage(Number(slot.dataset.page));
    const scale = (slot.clientWidth / page.getViewport({ scale: 1 }).width) * (window.devicePixelRatio || 1);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    await page.render({ canvas, viewport }).promise;
    if (current === doc) slot.replaceChildren(canvas);
  } catch (err) {
    // 古い版の PDF は差し替え時に破棄されるので、その描画の失敗は無視してよい
    if (current === doc) throw err;
  }
};

// 見えている枠と、その上下 1 画面分にある枠だけを描画する
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting && entry.target instanceof HTMLElement) void renderPage(entry.target);
    }
  },
  { rootMargin: '100% 0px' },
);

const applyStatus = (status: BuildStatus): void => {
  document.body.dataset.state = status.state;
  buildErrorEl.textContent = status.error ?? '';
  if (status.version !== loadedVersion) {
    loadedVersion = status.version;
    void load();
  }
};

import.meta.hot?.on(STATUS_EVENT, applyStatus);
applyStatus(await (await fetch(STATUS_PATH)).json());
