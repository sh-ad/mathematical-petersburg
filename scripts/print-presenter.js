/* Print the same six HTML cards to PDF, using an isolated Chrome profile. */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'petersburg-print-'));
const output = path.join(root, 'docs/downloads/presenter-cards.pdf');
const local = path.join(root, 'output/pdf/presenter-cards.pdf');
const chrome = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
try {
  const result = spawnSync(chrome, [
    '--headless', '--disable-gpu', '--disable-background-networking',
    '--disable-component-update', '--no-first-run', '--no-default-browser-check',
    '--user-data-dir=' + profile, '--no-pdf-header-footer',
    '--print-to-pdf=' + output,
    pathToFileURL(path.join(root, 'docs/presenter/index.html')).href,
  ], { encoding: 'utf8', timeout: 60000 });
  if (result.error || result.status !== 0) {
    throw result.error || new Error(result.stderr);
  }
  if (!fs.readFileSync(output).subarray(0, 5).equals(Buffer.from('%PDF-'))) {
    throw new Error('Chrome did not create a PDF');
  }
  fs.mkdirSync(path.dirname(local), { recursive: true });
  fs.copyFileSync(output, local);
  console.log('PDF карточек: ' + output);
} finally {
  fs.rmSync(profile, { recursive: true, force: true });
}
