// CI-only cache-bust stamp.
//
// Produces a deployable copy of the static site in `_dist/` with a per-build
// version query string appended to every asset the browser caches:
//   - the entry <script src> in index.html
//   - the <link rel="stylesheet" href> in index.html
//   - every LOCAL relative ES-module import inside the copied .js files
//     (e.g. `from "./ui.js"` -> `from "./ui.js?v=<guid>"`)
//
// Local dev never runs this — `npm run dev` serves the source as-is, so the
// zero-build property is preserved. Only the deploy pipeline calls it.
//
// We rewrite the import specifiers themselves (rather than relying on an import
// map) because ES-module imports are cached independently of the entry script,
// so stamping only the entry <script> would leave the modules cached.
//
// Unlike the app repos, this one also stamps the stylesheet: a landing page is
// almost entirely CSS, and a stale cached sheet is the most visible way for a
// redeploy to look broken.

import { cp, readFile, writeFile, rm, readdir } from "node:fs/promises";
import { join, extname } from "node:path";
import { randomUUID } from "node:crypto";

const SRC = ".";
const OUT = "_dist";

// What gets copied into the deployable site. Everything the browser needs and
// nothing else (no node_modules, scripts, CI, git, or the previous build).
const INCLUDE = ["index.html", "assets"];

const version = randomUUID();

// Only stamp local relative specifiers ("./x", "../x"). Never touch bare
// specifiers ("foo") or absolute URLs ("https://…") — those aren't ours.
const IMPORT_RE = /(\bfrom\s+|\bimport\s+)(["'])(\.\.?\/[^"']+?)(["'])/g;
const ENTRY_SCRIPT_RE = /(<script\b[^>]*\bsrc=")(\.\.?\/[^"]+?)(")/g;
const STYLESHEET_RE = /(<link\b[^>]*\brel="stylesheet"[^>]*\bhref=")(\.\.?\/[^"]+?)(")/g;

function addVersion(url) {
  // Preserve any existing query/hash ordering: a.js#x -> a.js?v=..#x
  const [path, hash = ""] = url.split("#");
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}v=${version}${hash ? "#" + hash : ""}`;
}

async function stampJsFile(file) {
  const code = await readFile(file, "utf8");
  const stamped = code.replace(
    IMPORT_RE,
    (_m, kw, q1, spec, q2) => `${kw}${q1}${addVersion(spec)}${q2}`
  );
  if (stamped !== code) await writeFile(file, stamped);
}

async function stampHtmlFile(file) {
  const html = await readFile(file, "utf8");
  const stamped = html
    .replace(ENTRY_SCRIPT_RE, (_m, pre, src, post) => `${pre}${addVersion(src)}${post}`)
    .replace(STYLESHEET_RE, (_m, pre, href, post) => `${pre}${addVersion(href)}${post}`);
  if (stamped !== html) await writeFile(file, stamped);
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

async function main() {
  await rm(OUT, { recursive: true, force: true });
  for (const item of INCLUDE) {
    await cp(join(SRC, item), join(OUT, item), { recursive: true });
  }

  for await (const file of walk(OUT)) {
    const ext = extname(file).toLowerCase();
    if (ext === ".js" || ext === ".mjs") await stampJsFile(file);
    else if (ext === ".html") await stampHtmlFile(file);
  }

  console.log(`Stamped ${OUT}/ with v=${version}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
