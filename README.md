<h1 align="center">LaTeX Live Preview</h1>

<p align="center"><strong><em>Your editor. Your LaTeX. Live in your browser.</em></strong></p>

<p align="center">
  <a href="https://www.npmjs.com/package/@ottatto/llp"><img src="https://img.shields.io/npm/v/@ottatto/llp?logo=npm&style=for-the-badge" alt="npm"></a>
  <a href="https://github.com/otTATto/latex-live-preview/releases"><img src="https://img.shields.io/github/v/release/otTATto/latex-live-preview?logo=github&style=for-the-badge" alt="GitHub Release"></a>
  <img src="https://img.shields.io/node/v/@ottatto/llp?logo=nodedotjs&style=for-the-badge" alt="Node.js">
  <a href="https://github.com/otTATto/latex-live-preview/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@ottatto/llp?style=for-the-badge" alt="License"></a>
</p>
<p align="center">
  <a href="https://vite.dev/"><img src="https://img.shields.io/npm/dependency-version/@ottatto/llp/vite?logo=vite&style=for-the-badge" alt="Vite"></a>
  <a href="https://mozilla.github.io/pdf.js/"><img src="https://img.shields.io/npm/dependency-version/@ottatto/llp/pdfjs-dist?label=pdf.js&logo=mozilla&style=for-the-badge" alt="PDF.js"></a>
</p>

English | [日本語](README.ja.md)

An editor-agnostic CLI for (almost) live $\LaTeX$ PDF previews, powered by [Latexmk](https://ctan.org/pkg/latexmk), [Vite](https://vite.dev/), and [PDF.js](https://mozilla.github.io/pdf.js/).

## 🚀 Usage

> [!IMPORTANT]
> [TeX Live](https://github.com/otTATto/setup-tex) and Node.js (22.13 or later) are required.

1. Run the following to make the `llp` command available anywhere in your terminal

   ```sh
   npm install -g @ottatto/llp
   ```

2. Run the `llp` command where the `.tex` file you want to preview is located

   ```sh
   cd path/to/directory
   llp
   ```

3. Your browser opens and shows the PDF
4. From then on, the preview updates every time you save a `.tex` file

<details>
<summary><strong>TIP 1: Try it without installing</strong></summary>

- With `npx`, you can try the `llp` command without installing it

  ```sh
  cd path/to/directory
  npx @ottatto/llp@latest
  ```

- In that case, read `llp` in the rest of this README as `npx @ottatto/llp@latest`

</details>

<details>
<summary><strong>TIP 2: Preview a specific .tex file</strong></summary>

- Without arguments, `llp` watches the current directory and looks for the `.tex` file to build in it

  ```sh
  # Watch the current directory
  llp
  ```

- If there are multiple candidates and the terminal is interactive, `llp` lets you choose which one to build

- You can also pass the path of a specific `.tex` file or directory

  ```sh
  # Watch a specific directory
  llp path/to/directory

  # Build a specific .tex file
  llp path/to/specific.tex
  ```

</details>

<details>
<summary><strong>TIP 3: Build once without previewing</strong></summary>

- `llp build` builds once without starting the preview server, and outputs the PDF next to the `.tex` file

  ```sh
  # Build once without starting the preview server
  llp build
  ```

- To preview a directory named `build`, write it as `llp ./build`

</details>

<details>
<summary><strong>TIP 4: Options of the llp command</strong></summary>

- The `llp` command has the following options

  | Option                  | Description                                                    | Default  |
  | ----------------------- | -------------------------------------------------------------- | -------- |
  | `-p`, `--port <number>` | Port of the preview server                                     | `1984`   |
  | `--strict-port`         | Exit with an error if the port is in use, instead of moving on | Disabled |
  | `--no-open`             | Do not open the browser on startup                             | Disabled |
  | `-h`, `--help`          | Show the usage                                                 |          |
  | `-v`, `--version`       | Show the version                                               |          |

- By the way, the default port `1984` comes from [the year $\LaTeX$ was first released](https://en.wikipedia.org/wiki/LaTeX)
- If the port is already in use, `llp` uses the next free one unless `--strict-port` is given

</details>

<details>
<summary><strong>TIP 5: Write a config file</strong></summary>

- Options you use every time can be written in a config file, `llp.toml`

  <!-- prettier-ignore -->
  ```toml
  # llp.toml
  port = 3000            # Port number
  strict-port = false    # Exit with an error if the port is in use
  open = true            # Open the browser on startup
  ```

- `llp.toml` does **not** have to be in the directory where you run the command
- `llp` looks for it from the directory of the `.tex` file up through its parents, and uses the first one found
- When settings conflict, command-line options take precedence over `llp.toml`, which takes precedence over the defaults

</details>

<details>
<summary><strong>TIP 6: A package is not found</strong></summary>

- An error like ``! LaTeX Error: File `xcolor.sty' not found.`` means that a package your document uses is not installed in TeX Live
- If you use [stex](https://github.com/otTATto/setup-tex), you can install the missing packages as follows

  1. Put a `DEPENDS.txt` next to the `.tex` file, listing the packages you use as `hard <pkg>` lines

     ```txt
     # DEPENDS.txt
     hard xcolor
     ```

  2. Run the following in the directory with `DEPENDS.txt`

     ```sh
     stex depends
     ```

  3. Run `llp` again (if it is still running, saving the `.tex` file again rebuilds it)

- To find which package provides a `.sty` file, run `tlmgr search --global --file /xcolor.sty`

</details>

<details>
<summary><strong>TIP 7: Uninstall the llp command</strong></summary>

1. Run the following anywhere in your terminal

   ```sh
   npm rm -g @ottatto/llp
   ```

</details>

## 🧩 How It Works

`llp` updates the PDF as follows.

1. Watches the directory of the `.tex` file and detects changes
2. Runs [Latexmk](https://ctan.org/pkg/latexmk) in the directory of the `.tex` file
3. Notifies the browser of the build result through the [Vite](https://vite.dev/) WebSocket
4. The browser reloads the PDF with [PDF.js](https://mozilla.github.io/pdf.js/) and renders the visible pages first

<details>
<summary><strong>TIP: Where files are generated</strong></summary>

- The PDF is generated next to the `.tex` file, and intermediate files go into `.llp/`

  ```
  .
  ├── .llp/           # Intermediate files
  ├── sample.pdf      # The generated PDF
  └── sample.tex
  ```

- Therefore, `$out_dir` and `$aux_dir` in your `latexmkrc` are **ignored**

</details>

## 🗂️ Repository Structure

Roughly, the repository is structured as follows.

```
.
├── bin/llp.js            # Entry point of the llp command
├── client/               # Browser side (PDF viewer)
├── server/               # Server side
├── shared/               # Shared by the server and browser sides
├── dev/                  # The llp-dev command for development
├── dist/                 # JS distributed via npm (generated by npm run build)
├── tsconfig.build.json   # Config for outputting dist/
└── README.md
```

## 🤝 Contributing

<p align="center">
  <em>Thank you 💛 for your interest in contributing to LaTeX Live Preview!</em>
</p>

1. First, open an issue and discuss the direction with [otTATto](https://github.com/otTATto)
2. Once the plan is settled, set up your environment following the next section
3. Create a `feature/*` or `fix/*` branch from the latest `main` and implement your changes
4. Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for commit messages
5. Open a pull request
6. Once CI passes and [otTATto](https://github.com/otTATto) approves it, it is merged into `main`
7. [otTATto](https://github.com/otTATto) publishes a new version to npm at a good time 💪

## 🛠️ Development

> [!NOTE]
> Development requires Node.js 22.18 or later.

1. Clone this repository, install the dependencies, and build

   ```sh
   gh repo clone otTATto/latex-live-preview && cd latex-live-preview
   npm install && npm run build
   ```

2. Move to the dev directory and globally link `llp-dev`, the llp command for development

   ```sh
   cd dev && npm link
   ```

3. Keep the following running at the repository root, and `dist/` is rebuilt automatically whenever the source changes

   ```sh
   cd ../ && npm run dev
   ```

4. You can now use `llp-dev`, the llp command for development, anywhere in your terminal

   ```sh
   llp-dev
   ```

<details>
<summary><strong>TIP 1: Run the tests locally</strong></summary>

- CI checks your pull request, but you can of course run the tests locally beforehand
- The following tests are available

  | Command              | Description                                       | Note                                                      |
  | :------------------- | :------------------------------------------------ | :-------------------------------------------------------- |
  | `npm test`           | Runs the unit tests                               |                                                           |
  | `npm run test:build` | Runs the build tests, which actually compile PDFs | Requires [TeX Live](https://github.com/otTATto/setup-tex) |

</details>

<details>
<summary><strong>TIP 2: Remove the llp-dev command</strong></summary>

1. Run the following anywhere in your terminal

   ```sh
   npm rm -g llp-dev
   ```

</details>

## 📖 License

[MIT](LICENSE)
