<h1 align="center">LaTeX Live Preview</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/@ottatto/llp"><img src="https://img.shields.io/npm/v/@ottatto/llp?logo=npm&style=for-the-badge" alt="npm"></a>
  <img src="https://img.shields.io/node/v/@ottatto/llp?logo=nodedotjs&style=for-the-badge" alt="Node.js">
  <a href="https://github.com/otTATto/latex-live-preview/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@ottatto/llp?style=for-the-badge" alt="License"></a>
</p>
<p align="center">
  <a href="https://vite.dev/"><img src="https://img.shields.io/npm/dependency-version/@ottatto/llp/vite?logo=vite&style=for-the-badge" alt="Vite"></a>
  <a href="https://mozilla.github.io/pdf.js/"><img src="https://img.shields.io/npm/dependency-version/@ottatto/llp/pdfjs-dist?label=pdf.js&logo=mozilla&style=for-the-badge" alt="PDF.js"></a>
</p>

$\LaTeX$ の PDF をブラウザで（ほぼほぼ）リアルタイムにプレビューするためのコマンドラインツールです。

## 🚀 使い方

> [!IMPORTANT]
> あらかじめ [TeX Live のセットアップ](https://github.com/otTATto/setup-tex) と Node.js（22.13 以降）が必要になります。

1. 以下を実行して、端末の任意の場所から `llp` コマンドを使えるようにします

   ```sh
   npm install -g @ottatto/llp
   ```

2. プレビューしたい `.tex` ファイルが置かれている場所で、以下のように `llp` コマンドを実行します

   ```sh
   cd path/to/directory
   llp
   ```

3. ブラウザが開いて PDF が表示されます
4. 以降は `.tex` を保存するたびに表示が更新されます

<details>
<summary><strong>補足① インストールせずに試してみたい</strong></summary>

- 以下のように `npx` を使えば、インストールせずに `llp` コマンドを試せます

  ```sh
  cd path/to/directory
  npx @ottatto/llp
  ```

- ただし、以降の説明における `llp` を `npx @ottatto/llp` に読み替えれて実行する必要があります

</details>

<details>

<summary><strong>補足② 特定の tex ファイルを指定してプレビューしたい</strong></summary>

- `llp` コマンドは、何も指定しない場合、カレントディレクトリを監視対象とし、その中からビルドする `.tex` ファイルを探します

  ```sh
  # カレントディレクトリを監視対象とする
  llp
  ```

- 候補が複数あり、対話できる場合は、CLI に選択肢が表示され、ユーザーはビルドする対象を選択できます

- また、以下のように、あらかじめ特定の `.tex` ファイルやディレクトリのパスを渡して起動することもできます

  ```sh
  # 特定のディレクトリを監視対象とする
  llp path/to/directory

  # 特定の .tex ファイルを対象とする
  llp path/to/specific.tex
  ```

</details>

<details>
<summary><strong>補足③ プレビューせずに一度だけビルドしたい</strong></summary>

- `llp build` を実行すると、プレビュー用のサーバーを立てずに一度だけビルドし、`.tex` と同じ場所に PDF を出力します

  ```sh
  # プレビュー用のサーバーを立てずに一度だけビルドする
  llp build
  ```

- ちなみに、`build` という名前のディレクトリをプレビューしたい場合は、`llp ./build` のように書いてください

</details>

<details>
<summary><strong>補足④ llp コマンドで使用可能なオプションを確認したい</strong></summary>

- `llp` コマンドには、以下のオプションが用意されています

  | オプション              | 説明                                                       | 既定値 |
  | ----------------------- | ---------------------------------------------------------- | ------ |
  | `-p`, `--port <number>` | プレビュー用のサーバーのポート番号                         | `1984` |
  | `--strict-port`         | ポートが使われていたら、次の番号を試さずにエラーで終了する | 無効   |
  | `--no-open`             | 起動時にブラウザを開かない                                 | 無効   |
  | `-h`, `--help`          | 使い方を表示する                                           |        |
  | `-v`, `--version`       | バージョンを表示する                                       |        |

- ところで、既定のポート番号 `1984` は、[$\LaTeX$ が最初に公開された 1984 年](https://texwiki.texjp.org/?TeX%E3%81%AE%E6%AD%B4%E5%8F%B2) にちなんでいます
- 指定したポートがすでに使われていた場合、`--strict-port` を指定しない限り、空いている次の番号を使います

</details>

<details>
<summary><strong>補足⑤ llp コマンドの設定ファイルを書きたい</strong></summary>

- 毎回指定するようなオプションは、設定ファイル `llp.toml` に書いておくことで、手間を減らすことができます

  <!-- prettier-ignore -->
  ```toml
  # llp.toml
  port = 3000            # ポート番号
  strict-port = false    # ポートが使われていたら、エラーで終了するか
  open = true            # 起動時にブラウザを開くか
  ```

- `llp.toml` は、必ずしもコマンドを実行するカレントディレクトリに置かなければならないわけでは**ありません**
- `.tex` のあるディレクトリから親へさかのぼって探し、最初に見つかったものを使います
- ちなみに、設定が競合した場合は、コマンドラインのオプション → `llp.toml` → 既定値 の順で優先されます

</details>

<details>
<summary><strong>補足⑥ llp コマンドを削除したい</strong></summary>

1. 端末の任意の場所で以下を実行します

   ```sh
   npm rm -g @ottatto/llp
   ```

</details>

## 🧩 仕組み

`llp` は、以下の流れで PDF を更新します。

1. `.tex` のあるディレクトリ以下を監視し、ファイルの変更を検知します
2. `.tex` のあるディレクトリで [Latexmk](https://texwiki.texjp.org/?Latexmk) を実行します
3. コンパイルの結果を、[Vite](https://ja.vite.dev/) の WebSocket でブラウザに通知します
4. ブラウザは [PDF.js](https://mozilla.github.io/pdf.js/) で PDF を読み込み直し、見えているページから描画します

<details>
<summary><strong>［補足］ファイルの生成場所について</strong></summary>

- PDF ファイルは `.tex` と同じ場所に生成され、中間ファイルは `.llp/` 内に生成されます
- したがって、`latexmkrc` に書いた `$out_dir` や `$aux_dir` は**無視されます**

</details>

## 🗂️ リポジトリの構造

大まかには、以下のような構造になっています。

```
.
├── bin/llp.js            # llp コマンドの入口
├── client/               # ブラウザ側（PDF ビューワ）
├── server/               # サーバー側
├── shared/               # サーバー側とブラウザ側で共通
├── dev/                  # 開発用の llp-dev コマンド
├── dist/                 # npm で配る JS（npm run build で生成）
├── tsconfig.build.json   # dist/ を出力するための設定
└── README.md
```

## 🤝 貢献

<p align="center">
  <em>LaTeX Live Preview への貢献に興味を持ってくださり、ありがとうございます！💛</em>
</p>

1. まずは issue を起票して、方針を [otTATto](https://github.com/otTATto) と相談しましょう
2. 仕様が固まったら、次章の手順に沿って環境を構築しましょう
3. 最新の `main` から `feature/*` または `fix/*` ブランチを作り、実装を進めます
4. コミットメッセージは [Conventional Commits](https://www.conventionalcommits.org/ja/v1.0.0/) に従ってください
5. Pull Request を出します
6. CI が通り、[otTATto](https://github.com/otTATto) の承認ののちに `main` に Merge します
7. 程よいタイミングで [otTATto](https://github.com/otTATto) が新しいバージョンを npm に公開します💪

## 🛠️ 開発

> [!NOTE]
> 開発には Node.js（22.18 以降）が必要になります。

1. このリポジトリを Clone して、依存パッケージを入れ、ビルドします

   ```sh
   gh repo clone otTATto/latex-live-preview && cd latex-live-preview
   npm install && npm run build
   ```

2. dev ディレクトリに移動し、開発用の llp コマンド `llp-dev` をグローバルにリンクします

   ```sh
   cd dev && npm link
   ```

3. リポジトリのルートで以下を実行しておけば、ソースの変更を検知して `dist/` が自動でビルドし直されます

   ```sh
   cd ../ && npm run dev
   ```

4. 端末の任意の場所で、開発用の llp コマンド `llp-dev` を使用できます

   ```sh
   llp-dev
   ```

<details>
<summary><strong>補足① 手元でテストを回したい</strong></summary>

- PR を出せば CI で検証されますが、その前に手元の環境での検証も勿論できます
- 具体的には、次のようなテストが用意されています

  | コマンド             | 内容                                         | 備考                                                                       |
  | :------------------- | :------------------------------------------- | :------------------------------------------------------------------------- |
  | `npm test`           | 単体テストを実行します                       |                                                                            |
  | `npm run test:build` | PDF をコンパイルするビルドテストを実行します | [TeX Live のセットアップ](https://github.com/otTATto/setup-tex) が必要です |

</details>

<details>
<summary><strong>補足② 開発用の llp-dev コマンドを削除したい</strong></summary>

1. 端末の任意の場所で以下を実行します

   ```sh
   npm rm -g llp-dev
   ```

</details>

## 📖 ライセンス

[MIT](LICENSE)
