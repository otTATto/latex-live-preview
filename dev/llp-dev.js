#!/usr/bin/env node
/**
 * @file 開発中の llp を llp-dev というコマンドとして動かす
 *
 * NOTE:
 *   - npm の bin にはパッケージの外のパスを書けないので、ビルドした dist/ の llp をここから起動する
 *   - プレビューは node --watch で起動し、npm run dev が dist/ をビルドし直したら自動で起動し直す
 *   - build・--help・--version はすぐ終わるので、--watch を付けずに 1 回だけ実行する
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseCliArgs } from '../dist/server/options.js';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const llp = fileURLToPath(new URL('../dist/bin/llp.js', import.meta.url));
const args = process.argv.slice(2);

/** @param {string[]} args */
const isPreview = (args) => {
  try {
    const cli = parseCliArgs(args);
    return cli.command === 'preview' && !cli.help && !cli.version;
  } catch {
    // 引数の誤りは llp 自身に伝えてもらう
    return false;
  }
};

// --watch-path: import したファイルすべてを見張ると node_modules の変化でも起動し直すので、dist/ だけを見張る
// --watch-preserve-output: 起動し直すときに、それまでのログを消さない
const nodeArgs = isPreview(args) ? [`--watch-path=${dist}`, '--watch-preserve-output'] : [];
const child = spawn(process.execPath, [...nodeArgs, llp, ...args], { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 1));
