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

<details>

<summary><strong>補足① 特定の tex ファイルを指定してプレビューしたい</strong></summary>

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
<summary><strong>補足② llp コマンドで使用可能なオプションを確認したい</strong></summary>

- `llp` コマンドには、以下のオプションが用意されています

  | オプション              | 説明                                                       | 既定値 |
  | ----------------------- | ---------------------------------------------------------- | ------ |
  | `-p`, `--port <number>` | プレビュー用のサーバーのポート番号                         | `1984` |
  | `--strict-port`         | ポートが使われていたら、次の番号を試さずにエラーで終了する | 無効   |
  | `--no-open`             | 起動時にブラウザを開かない                                 | 無効   |
  | `-h`, `--help`          | 使い方を表示する                                           |        |
  | `-v`, `--version`       | バージョンを表示する                                       |        |

- ところで、既定のポート番号 `1984` は、$\LaTeX$ が最初に公開された 1984 年 [^tex-history] にちなんでいます
- 指定したポートがすでに使われていた場合、`--strict-port` を指定しない限り、空いている次の番号を使います

[^tex-history]: [**TeXの歴史** - TeX Wiki](https://texwiki.texjp.org/?TeX%E3%81%AE%E6%AD%B4%E5%8F%B2)

</details>

<details>
<summary><strong>補足③ llp コマンドの設定ファイルを書きたい</strong></summary>

- 毎回指定するようなオプションは、設定ファイル `llp.toml` に書いておくことで、手間を減らすことができます

  ```toml
  # llp.toml
  port = 3000 # ポート番号
  strict-port = false # ポートが使われていたら、エラーで終了するか
  open = true # 起動時にブラウザを開くか
  ```

- `llp.toml` は、必ずしもコマンドを実行するカレントディレクトリに置かなければならないわけでは**ありません**
- `.tex` のあるディレクトリから親へさかのぼって探し、最初に見つかったものを使います
- ちなみに、設定が競合した場合は、コマンドラインのオプション → `llp.toml` → 既定値 の順で優先されます

</details>

<details>
<summary><strong>補足④ llp コマンドを削除したい</strong></summary>

1. 端末の任意の場所で以下を実行する

   ```sh
   npm rm -g @ottatto/llp
   ```

</details>

## 🧩 仕組み

`llp` は、以下の流れで PDF を更新します。

1. `.tex` のあるディレクトリ以下を監視し、ファイルの変更を検知する
2. `.tex` のあるディレクトリで [Latexmk](https://texwiki.texjp.org/?Latexmk) を実行する
3. コンパイルの結果を、[Vite](https://ja.vite.dev/) の WebSocket でブラウザに通知する
4. ブラウザは [PDF.js](https://mozilla.github.io/pdf.js/) で PDF [^output] を読み込み直し、見えているページから描画する

[^output]: PDF は `.tex` と同じ場所に生成され、中間ファイルは `.llp/` 内に生成されます。したがって、`latexmkrc` に書いた `$out_dir` や `$aux_dir` は**無視されます**。

## 🗂️ リポジトリの構造

大まかには、以下のような構造になっています。

```
.
├── bin/llp.js    # llp コマンドの入口
├── client/       # ブラウザ側（PDF ビューワ）
├── server/       # サーバー側
├── shared/       # サーバー側とブラウザ側で共通
└── README.md
```

## 📖 ライセンス

MIT（ref: [LICENSE](LICENSE)）
