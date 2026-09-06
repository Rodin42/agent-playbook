// esbuild bundles the vanilla-TS client into client/dist; the server serves that dir.
import { build } from "esbuild";
import { mkdir, copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "client", "dist");
await mkdir(out, { recursive: true });
await build({
  entryPoints: [join(here, "client", "src", "main.ts")],
  bundle: true,
  format: "esm",
  target: "es2022",
  sourcemap: true,
  minify: false,
  outfile: join(out, "main.js"),
  logLevel: "info",
});
for (const f of ["index.html", "styles.css"]) await copyFile(join(here, "client", f), join(out, f));
