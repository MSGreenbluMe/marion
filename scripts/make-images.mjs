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
@font-face{font-family:C;font-weight:300;src:url(${font('cormorant-garamond', 'cormorant-garamond-latin-300-normal.woff2')})}
@font-face{font-family:C;font-weight:300;src:url(${font('cormorant-garamond', 'cormorant-garamond-latin-ext-300-normal.woff2')});unicode-range:U+0100-02AF}
@font-face{font-family:J;font-weight:300;src:url(${font('jost', 'jost-latin-300-normal.woff2')})}
@font-face{font-family:J;font-weight:300;src:url(${font('jost', 'jost-latin-ext-300-normal.woff2')});unicode-range:U+0100-02AF}
`;

const og = `<!doctype html><meta charset="utf-8"><style>${fontCss}
html,body{margin:0;width:1200px;height:630px;overflow:hidden}
body{background:radial-gradient(60% 80% at 50% 55%, oklch(0.78 0.126 85 / .22), transparent 70%), oklch(0.19 0.028 148);
color:oklch(0.93 0.018 85);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font-family:J}
h1{font-family:C;font-weight:300;font-size:132px;margin:0;letter-spacing:.01em}
hr{width:64px;border:0;height:1px;background:oklch(0.78 0.126 85);margin:28px 0 30px}
p{margin:0;font-size:30px;letter-spacing:.04em;color:oklch(0.8 0.022 110)}
small{position:absolute;bottom:44px;font-size:20px;letter-spacing:.3em;text-transform:uppercase;color:oklch(0.78 0.126 85)}
</style><body><h1>Studio Marion</h1><hr><p>Masáže, meditace a ženské kruhy</p><small>Hradec Králové</small>`;

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
