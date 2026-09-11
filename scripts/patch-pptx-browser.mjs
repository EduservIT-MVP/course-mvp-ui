import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const file = join(dirname(fileURLToPath(import.meta.url)), "..", "node_modules", "pptx-browser", "src", "render.js")
const source = readFileSync(file, "utf8")

const broken = `    // ── Bullet / list marker ─────────────────────────────────────────────────
    const bullet = pPr ? parseBullet(pPr, defRPr, themeColors, themeData) : null;

    // Spacing
    const spcBef = g1(pPr, 'spcBef');
    const spcAft = g1(pPr, 'spcAft');
    const lnSpc = g1(pPr, 'lnSpc');
    const defRPr = g1(pPr, 'defRPr');
`

const fixed = `    // Spacing
    const spcBef = g1(pPr, 'spcBef');
    const spcAft = g1(pPr, 'spcAft');
    const lnSpc = g1(pPr, 'lnSpc');
    const defRPr = g1(pPr, 'defRPr');

    // ── Bullet / list marker ─────────────────────────────────────────────────
    const bullet = pPr ? parseBullet(pPr, defRPr, themeColors, themeData) : null;
`

if (source.includes(broken)) {
  writeFileSync(file, source.replace(broken, fixed))
  console.log("Patched pptx-browser defRPr TDZ bug")
} else if (source.includes(fixed)) {
  console.log("pptx-browser defRPr patch already applied")
} else {
  console.warn("pptx-browser render.js did not match expected patch pattern")
}
