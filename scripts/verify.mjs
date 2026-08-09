// Pre-deploy checks. Everything here is a mistake that would only show up as a
// blank page or a 500 on the live site, so it is cheaper to catch it here than
// after Vercel has already promoted the deployment.
//
//   node scripts/verify.mjs
//
// Exits non-zero on the first failing check, which stops the deploy job.

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];

const check = (label, fn) => {
  try {
    fn();
    console.log(`  ok    ${label}`);
  } catch (err) {
    console.log(`  FAIL  ${label}`);
    problems.push(`${label}: ${err.message}`);
  }
};

const read = (rel) => {
  const path = join(root, rel);
  if (!existsSync(path)) throw new Error(`${rel} is missing`);
  return readFileSync(path, 'utf8');
};

const readJson = (rel) => {
  try {
    return JSON.parse(read(rel));
  } catch (err) {
    throw new Error(`${rel} is not valid JSON — ${err.message}`);
  }
};

console.log('Verifying the deployable tree...');

// The static shell. Without these Vercel serves a 404 at the root.
for (const file of ['index.html', 'sw.js', 'manifest.webmanifest', 'vercel.json']) {
  check(`${file} exists`, () => read(file));
}

// Serverless functions are only compiled at request time, so a syntax error
// ships happily and then fails on the first real visitor.
for (const file of ['api/yt.js', 'api/_ytsearch.js']) {
  check(`${file} parses`, () => {
    read(file);
    execFileSync(process.execPath, ['--check', join(root, file)], { stdio: 'pipe' });
  });
}

check('vercel.json is valid JSON', () => readJson('vercel.json'));

check('manifest.webmanifest is valid JSON', () => readJson('manifest.webmanifest'));

// A manifest pointing at a missing icon silently breaks "Add to Home Screen".
check('every manifest icon is committed', () => {
  const manifest = readJson('manifest.webmanifest');
  const missing = (manifest.icons || [])
    .map((icon) => icon.src)
    .filter((src) => !existsSync(join(root, src.replace(/^\//, ''))));
  if (missing.length) throw new Error(`missing icon files: ${missing.join(', ')}`);
});

check('index.html has a title', () => {
  if (!/<title>[^<]+<\/title>/.test(read('index.html'))) throw new Error('no <title>');
});

// The head is written from an escaped template at runtime, so the quotes in
// these tags are backslashed in the source. Match either form.
check('index.html links the manifest', () => {
  const html = read('index.html');
  if (!/rel=\\?["']manifest\\?["']/.test(html) || !html.includes('manifest.webmanifest')) {
    throw new Error('no <link rel="manifest"> pointing at /manifest.webmanifest');
  }
});

check('index.html registers the service worker', () => {
  if (!/serviceWorker\.register\(\s*\\?['"]\/sw\.js/.test(read('index.html'))) {
    throw new Error('no serviceWorker.register("/sw.js") call');
  }
});

// The client calls this route by hand; a rename on either side breaks the
// ladder without breaking the build.
check('the client and the API agree on /api/yt', () => {
  if (!read('index.html').includes('/api/yt')) {
    throw new Error('index.html never calls /api/yt');
  }
});

if (problems.length) {
  console.error(`\n${problems.length} check(s) failed:`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log('\nAll checks passed.');
