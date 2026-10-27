// Export the actual server-rendered SVG; no second diagram implementation.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
const require = createRequire(import.meta.url);
const directory = path.dirname(fileURLToPath(import.meta.url));

const route = path.resolve(directory, "..");
const root = path.resolve(route, "../../..");
const temporary = path.join(root, "tmp/pdfs/getty-visual");
fs.mkdirSync(temporary, { recursive: true });
const code = ts.transpileModule(fs.readFileSync(path.join(route, "MeetingDiagram.tsx"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
fs.writeFileSync(path.join(temporary, "MeetingDiagram.cjs"), code);
fs.copyFileSync(path.join(route, "meeting-content.json"), path.join(temporary, "meeting-content.json"));
const { MeetingDiagram } = require(path.join(temporary, "MeetingDiagram.cjs"));
for (const view of ["pilot", "workflow"]) {
  fs.writeFileSync(path.join(temporary, `${view}.svg`), renderToStaticMarkup(React.createElement(MeetingDiagram, { view })));
}
console.log(temporary);
