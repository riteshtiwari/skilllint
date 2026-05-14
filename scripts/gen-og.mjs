import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = join(__dirname, "../public/og.svg");
const pngPath = join(__dirname, "../public/og.png");

const svg = readFileSync(svgPath, "utf8");
const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
const png = resvg.render();
writeFileSync(pngPath, png.asPng());
console.log("og.png written to public/og.png");
