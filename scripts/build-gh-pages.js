const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'frontend', 'src');
const PAGES_DIR = path.join(SRC, 'pages');
const OUT = path.join(ROOT, 'docs');

function rimraf(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) rimraf(full);
    else fs.unlinkSync(full);
  }
  fs.rmdirSync(dirPath);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyDir(srcDir, destDir) {
  ensureDir(destDir);
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);
    if (entry.isDirectory()) copyDir(src, dest);
    else copyFile(src, dest);
  }
}

function main() {
  // Fresh output
  rimraf(OUT);
  ensureDir(OUT);

  // GitHub Pages: disable Jekyll
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '', 'utf8');

  // Root entry
  copyFile(path.join(SRC, 'index.html'), path.join(OUT, 'index.html'));

  // Optional root files
  const robotsTxt = path.join(SRC, 'robots.txt');
  if (fs.existsSync(robotsTxt)) {
    copyFile(robotsTxt, path.join(OUT, 'robots.txt'));
  }

  // Flatten pages into docs root (about.html, contact.html, etc.)
  if (fs.existsSync(PAGES_DIR)) {
    for (const entry of fs.readdirSync(PAGES_DIR, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith('.html')) continue;
      copyFile(path.join(PAGES_DIR, entry.name), path.join(OUT, entry.name));
    }
  }

  // Static dirs expected by HTML paths
  for (const dirName of ['assets', 'components', 'services', 'cls']) {
    const srcPath = path.join(SRC, dirName);
    if (fs.existsSync(srcPath)) {
      copyDir(srcPath, path.join(OUT, dirName));
    }
  }

  // Convenience: allow /pages/... links to keep working if any exist
  if (fs.existsSync(PAGES_DIR)) {
    copyDir(PAGES_DIR, path.join(OUT, 'pages'));
  }

  console.log(`[gh-pages] Built static site to: ${path.relative(ROOT, OUT)}`);
}

main();

