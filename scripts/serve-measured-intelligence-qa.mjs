/** Loopback-only visual QA of actual components and fictional fixture inputs.
 * Does not load .env files, initialize auth, query data or publish events.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "output", "measured-intelligence-browser-qa");
await fs.mkdir(output, { recursive: true });
await fs.writeFile(path.join(output, "entry.tsx"), `import React from "react";
import {createRoot} from "react-dom/client";
import {SyntheticExamples} from "/app/admin/intelligence/examples/SyntheticExamples.tsx";
import {buildSyntheticWorkflowExamples} from "/lib/intelligence/features/examples.ts";
createRoot(document.getElementById("root")!).render(<SyntheticExamples examples={buildSyntheticWorkflowExamples()}/>);
`);
const shell = `<!doctype html><html lang="en" class="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BLTZ isolated Intelligence QA</title><style>body{margin:0;background:#0b0c0e;font-family:Arial,sans-serif}*{box-sizing:border-box}h1,h2,h3,p,dl,dd,ul{margin:0}ul{padding:0;list-style:none}button,input,select,textarea{font:inherit}a{color:inherit}button{cursor:pointer}</style></head><body><div id="root"></div><script type="module" src="/output/measured-intelligence-browser-qa/entry.tsx"></script></body></html>`;
await fs.writeFile(path.join(output, "index.html"), shell);
await fs.writeFile(path.join(output, "mobile.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>BLTZ 390px responsive QA</title></head><body style="margin:0;background:#171a20;color:white"><p style="font:14px Arial;padding:8px">390px viewport · isolated synthetic inputs</p><iframe title="Mobile Intelligence example" src="/output/measured-intelligence-browser-qa/index.html" style="width:390px;height:1000px;border:0;display:block"></iframe></body></html>`);
const require = createRequire(import.meta.url);
const toolRequire = createRequire(require.resolve("vitest/package.json"));
const { createServer } = await import(pathToFileURL(toolRequire.resolve("vite")).href);
const server = await createServer({ configFile: false, envDir: false, root,
  resolve: { alias: { "@": root } }, esbuild: { jsx: "automatic" },
  optimizeDeps: { noDiscovery: true, include: ["react", "react-dom/client", "react/jsx-dev-runtime", "react/jsx-runtime", "zod", "lucide-react"] },
  server: { host: "127.0.0.1", port: 3139, strictPort: true, watch: null },
});
await server.listen();
console.log("Isolated UI QA: http://127.0.0.1:3139/output/measured-intelligence-browser-qa/index.html");
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, async () => { await server.close(); process.exit(0); });
