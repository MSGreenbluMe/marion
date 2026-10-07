// Renders public/og.png, public/apple-touch-icon.png and public/favicon-32.png with the local
// headless Chromium. Run once after changing the design: `npm run og`.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const chromium =
  process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const root = resolve(import.meta.dirname, '..');
const font = (pkg, file) => pathToFileURL(join(root, 'node_modules/@fontsource', pkg, 'files', file)).href;
const tmp = mkdtempSync(join(tmpdir(), 'marion-img-'));

const fontCss = `
@font-face{font-family:C;font-weight:300;src:url(${font('fraunces', 'fraunces-latin-300-normal.woff2')})}
@font-face{font-family:C;font-weight:300;src:url(${font('fraunces', 'fraunces-latin-ext-300-normal.woff2')});unicode-range:U+0100-02AF}
@font-face{font-family:J;font-weight:300;src:url(${font('jost', 'jost-latin-300-normal.woff2')})}
@font-face{font-family:J;font-weight:300;src:url(${font('jost', 'jost-latin-ext-300-normal.woff2')});unicode-range:U+0100-02AF}
`;

const art = (n) => pathToFileURL(join(root, 'public/art', `${n}.webp`)).href;
const og = `<!doctype html><meta charset="utf-8"><style>${fontCss}
html,body{margin:0;width:1200px;height:630px;overflow:hidden}
body{position:relative;background:#f6f1e6;color:#1d2b22;font-family:J}
img{position:absolute;mix-blend-mode:multiply}
.wash{left:-140px;top:-180px;width:820px;opacity:.75}
.arch{right:120px;top:40px;height:560px}
.leaf{right:400px;top:230px;height:360px;rotate:-10deg}
.stones{right:40px;bottom:-10px;width:260px}
.glow{position:absolute;right:200px;top:190px;width:250px;height:250px;border-radius:50%;
background:radial-gradient(circle,rgba(250,225,150,.75),rgba(240,200,110,.25) 25%,transparent 65%)}
.t{position:absolute;left:80px;top:170px;width:560px}
small{font-size:20px;letter-spacing:.28em;text-transform:uppercase;color:#8a5a12}
h1{font-family:C;font-weight:300;font-size:104px;line-height:1;margin:22px 0 26px;letter-spacing:-.02em}
p{margin:0;font-size:29px;color:#4a5a50}
</style><body>
<img class="wash" src="${art('blob-gold')}"><img class="arch" src="${art('arch')}"><div class="glow"></div>
<img class="leaf" src="${art('eucalyptus')}"><img class="stones" src="${art('stones')}">
<div class="t"><small>Hradec Králové</small><h1>Studio Marion</h1><p>Masáže, meditace a ženské kruhy</p></div>`;

const icon = (size) => `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden;background:#122318}
img{width:${size}px;height:${size}px;display:block}</style><img src="${pathToFileURL(join(root, 'public/favicon.svg')).href}">`;

function shot(html, out, w, h) {
  const file = join(tmp, `${w}x${h}.html`);
  writeFileSync(file, html);
  execFileSync(chromium, [
    '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
    '--force-device-scale-factor=1', `--window-size=${w},${h}`, `--screenshot=${join(root, 'public', out)}`,
    '--virtual-time-budget=2000', pathToFileURL(file).href,
  ], { stdio: 'ignore' });
  console.log('wrote public/' + out);
}

shot(og, 'og.png', 1200, 630);
shot(icon(180), 'apple-touch-icon.png', 180, 180);
shot(icon(32), 'favicon-32.png', 32, 32);
