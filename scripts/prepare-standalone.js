/**
 * Подготовка standalone-сборки Next.js для Tauri
 * Копирует статические ресурсы в standalone-директорию
 */

const fs = require('fs');
const path = require('path');

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const standaloneDir = path.join(__dirname, '..', '.next', 'standalone');
const staticSrc = path.join(__dirname, '..', '.next', 'static');
const staticDst = path.join(standaloneDir, '.next', 'static');
const publicSrc = path.join(__dirname, '..', 'public');
const publicDst = path.join(standaloneDir, 'public');

if (!fs.existsSync(standaloneDir)) {
  console.error('Standalone directory not found. Run "next build" first.');
  process.exit(1);
}

console.log('Copying static assets...');
copyDirSync(staticSrc, staticDst);

if (fs.existsSync(publicSrc)) {
  console.log('Copying public directory...');
  copyDirSync(publicSrc, publicDst);
}

console.log('Standalone build ready.');
