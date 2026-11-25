# LaTeX Live Preview

$\LaTeX$ の PDF をブラウザで（ほぼほぼ）リアルタイムにプレビューするためのコマンドラインツールです。

## 🚀 使い方

> [!IMPORTANT]
> あらかじめ TeX Live（ref: [otTATto/tex-setup](https://github.com/otTATto/tex-setup)）と Node.js（`.node-version` で指定しているバージョン）が必要になります。

1. このリポジトリを Clone する
2. 以下を実行して、端末の任意の場所から `llp` コマンドを使えるようにする [^npm]

   ```sh
   npm install
   npm link
   ```

3. 以下のように、プレビューしたい `.tex` ファイルを指定して実行する

   ```sh
   llp path/to/main.tex
   ```

4. ブラウザが開いて PDF [^output] が表示される
5. 以降は `.tex` を保存するたびに表示が更新される

[^npm]: 将来的には npm パッケージとして公開する予定なので、1 と 2 の手順はもっと簡単になります。

#### ［補足］`llp` コマンドを削除したい

端末の任意の場所で以下を実行します。

```sh
npm rm -g @ottatto/llp
```

## 🧩 仕組み

`llp` は、以下の流れで PDF を更新します。

1. `.tex` のあるディレクトリ以下を監視し、ファイルの変更を検知する
2. `.tex` のあるディレクトリで [Latexmk](https://texwiki.texjp.org/?Latexmk) を実行する
3. コンパイルの結果を、[Vite](https://ja.vite.dev/) の WebSocket でブラウザに通知する
4. ブラウザは [PDF.js](https://mozilla.github.io/pdf.js/) で PDF [^output] を読み込み直し、見えているページから描画する

[^output]: PDF は `.tex` と同じ場所に生成され、中間ファイルは `.llp/` 内に生成されます。したがって、`latexmkrc` に書いた `'$out_dir` や `$aux_dir` は**無視されます**。

## 📖 ライセンス

MIT（ref: [LICENSE](LICENSE)）
