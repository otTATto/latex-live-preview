import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { summarizeError } from './latexmk.ts';

describe('summarizeError', () => {
  it('LaTeX のエラーメッセージに行番号を添えて 1 行にする', () => {
    const error = [
      '! Undefined control sequence.',
      'l.77 現代人に\\undefinedcmd',
      '                          ',
    ].join('\n');

    assert.equal(summarizeError(error), '! Undefined control sequence. (l.77)');
  });

  it('行番号がなければ、最初の行だけを返す', () => {
    const error = ['! Emergency stop.', '*** (job aborted, no legal \\end found)'].join('\n');

    assert.equal(summarizeError(error), '! Emergency stop.');
  });

  it('先頭の空行は飛ばす', () => {
    assert.equal(
      summarizeError('\n  \nLatexmk: Could not find file'),
      'Latexmk: Could not find file',
    );
  });

  it('中身がなければ unknown error を返す', () => {
    assert.equal(summarizeError(''), 'unknown error');
  });
});
