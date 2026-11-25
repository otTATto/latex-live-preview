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

3. プレビューしたい `.tex` ファイルが置かれている場所で、以下を実行する

   ```sh
   cd path/to/directory
   llp
   ```

4. ブラウザが開いて PDF [^output] が表示される
5. 以降は `.tex` を保存するたびに表示が更新される

[^npm]: 将来的には npm パッケージとして公開する予定なので、1 と 2 の手順はもっと簡単になります。

#### 補足① 特定の tex ファイルを指定してプレビューしたい

`llp` コマンドは、何も指定しない場合、カレントディレクトリを監視対象とし、その中からビルドする `.tex` ファイルを探します。

```sh
# カレントディレクトリを監視対象とする
llp
```

候補が複数あり、対話できる場合は、CLI に選択肢が表示され、ユーザーはビルドする対象を選択できます。

また、以下のように、あらかじめ特定の `.tex` ファイルやディレクトリのパスを渡して起動することもできます。

```sh
# 特定のディレクトリを監視対象とする
llp path/to/directory

#　特定の .tex ファイルを対象とする
llp path/to/specific.tex
```

#### 補足② `llp` コマンドを削除したい

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
