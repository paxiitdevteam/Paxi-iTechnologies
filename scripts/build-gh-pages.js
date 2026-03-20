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

function rewriteInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // GitHub Pages project URLs are served under:
  //   https://<user>.github.io/<repo>/
  // So URLs starting with "/" point to the domain root and break.
  // Rewrite common static prefixes to be relative.
  const pairs = [
    ['"/assets/', '"assets/'],
    ["'/assets/", "'assets/"],
    ['"/components/', '"components/'],
    ["'/components/", "'components/"],
    ['"/services/', '"services/'],
    ["'/services/", "'services/"],
    ['"/cls/', '"cls/'],
    ["'/cls/", "'cls/"],
    ['url(\\\'/assets/', "url('assets/"],
    ['url("/assets/', 'url("assets/']
  ];

  for (const [from, to] of pairs) {
    content = content.split(from).join(to);
  }

  // Home link: href="/" -> index.html
  content = content.split('href="/"').join('href="index.html"');
  content = content.split("href='/").join("href='index.html"); // defensive (rare)

  // Active nav logic often checks absolute href values.
  // Rewrite those checks to match the relative header links.
  content = content.split("getAttribute('href') === '/'").join("getAttribute('href') === 'index.html'");
  content = content.split('getAttribute(\"href\") === \"/\"').join('getAttribute(\"href\") === \"index.html\"');
  content = content.split("getAttribute('href') === '/index.html'").join("getAttribute('href') === 'index.html'");
  content = content.split('getAttribute(\"href\") === \"/index.html\"').join('getAttribute(\"href\") === \"index.html\"');

  fs.writeFileSync(filePath, content, 'utf8');
}

function rewriteDocsPaths(outDir, pageFiles) {
  // Rewrite all HTML/JS/CSS/text files under docs/
  const exts = new Set(['.html', '.js', '.css', '.json', '.txt', '.xml']);

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (exts.has(path.extname(entry.name).toLowerCase())) {
        rewriteInFile(full);
      }
    }
  }

  walk(outDir);

  // Rewrite href="/<page>.html" -> href="<page>.html"
  for (const pageName of pageFiles) {
    const html = `${pageName}.html`;
    const from1 = `href="/${html}"`;
    const to1 = `href="${html}"`;
    const from2 = `href='/${html}'`;
    const to2 = `href='${html}'`;

    function replaceInAllFiles(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) replaceInAllFiles(full);
        else if (exts.has(path.extname(entry.name).toLowerCase())) {
          let content = fs.readFileSync(full, 'utf8');
          content = content.split(from1).join(to1);
          content = content.split(from2).join(to2);
          fs.writeFileSync(full, content, 'utf8');
        }
      }
    }

    replaceInAllFiles(outDir);

    // Rewrite active-nav comparisons that check getAttribute('href') === '/<page>.html'
    const absComp1 = `getAttribute('href') === '/${html}'`;
    const relComp1 = `getAttribute('href') === '${html}'`;
    const absComp2 = `getAttribute(\"href\") === \"/${html}\"`;
    const relComp2 = `getAttribute(\"href\") === \"${html}\"`;

    // Also allow '/<page>' comparisons
    const absComp3 = `getAttribute('href') === '/${pageName}'`;
    const relComp3 = `getAttribute('href') === '${pageName}'`;
    const absComp4 = `getAttribute(\"href\") === \"/${pageName}\"`;
    const relComp4 = `getAttribute(\"href\") === \"${pageName}\"`;

    // Apply replacements inside all eligible files.
    function replaceComparisons(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) replaceComparisons(full);
        else if (exts.has(path.extname(entry.name).toLowerCase())) {
          let content = fs.readFileSync(full, 'utf8');
          content = content.split(absComp1).join(relComp1);
          content = content.split(absComp2).join(relComp2);
          content = content.split(absComp3).join(relComp3);
          content = content.split(absComp4).join(relComp4);
          fs.writeFileSync(full, content, 'utf8');
        }
      }
    }

    replaceComparisons(outDir);
  }
}

function main() {
  // Fresh output
  rimraf(OUT);
  ensureDir(OUT);

  // GitHub Pages: disable Jekyll
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '', 'utf8');

  // Friendly 404 → home (project site: /Paxi-iTechnologies/)
  const notFoundHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Page not found – Paxi iTechnologies</title>
  <style>body{font-family:system-ui,sans-serif;max-width:36rem;margin:4rem auto;padding:0 1rem;text-align:center}</style>
</head>
<body>
  <h1>Page not found</h1>
  <p><a href="index.html">Back to home</a></p>
  <p><small>Official site: <a href="https://paxiitdevteam.github.io/Paxi-iTechnologies/">GitHub Pages</a></small></p>
</body>
</html>
`;
  fs.writeFileSync(path.join(OUT, '404.html'), notFoundHtml, 'utf8');

  // Public URL: https://paxiitdevteam.github.io/Paxi-iTechnologies/ (no custom domain)

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

  // Determine page names for rewrite rules
  const pageFiles = fs.existsSync(PAGES_DIR)
    ? fs.readdirSync(PAGES_DIR)
      .filter((f) => f.endsWith('.html'))
      .map((f) => f.replace(/\.html$/, ''))
    : [];

  // Static dirs expected by HTML paths
  for (const dirName of ['assets', 'components', 'services', 'cls']) {
    const srcPath = path.join(SRC, dirName);
    if (fs.existsSync(srcPath)) {
      copyDir(srcPath, path.join(OUT, dirName));
    }
  }

  // Rewrite "/" root-relative links/assets for GitHub Pages subpath hosting
  rewriteDocsPaths(OUT, pageFiles);

  console.log(`[gh-pages] Built static site to: ${path.relative(ROOT, OUT)}`);
}

main();

