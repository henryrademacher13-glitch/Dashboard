# React + Vite

## Project layout

Beyond the React app in `src/`, this repo carries two Python subsystems:

| Path | What it does | Docs |
| --- | --- | --- |
| `scanner/` | Reads mail from one watched sender and auto-replies in thread. | [docs/email-scanner.md](docs/email-scanner.md) |
| `scraper/` | Scrapes web pages with Claude and writes the dashboard's **Feed** tab. | [docs/scraper.md](docs/scraper.md) |
| `vendor/scrapegraph-ai/` | Vendored ScrapeGraphAI (MIT), used by `scraper/`. Do not edit. | [VENDORED.md](vendor/scrapegraph-ai/VENDORED.md) |

Run their tests with `python3 tests/test_dedup.py`,
`python3 tests/test_content_and_safety.py` and `python3 tests/test_scraper.py`.


This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
