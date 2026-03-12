#!/usr/bin/env node
/**
 * Generates CODEBASE.txt: a single text file containing all main source code
 * (no node_modules, .next, build artifacts) so an AI agent can understand the app.
 *
 * Usage:
 *   node scripts/generate-codebase-txt.js           → CODEBASE.txt (full, includes CSS)
 *   node scripts/generate-codebase-txt.js --no-css  → CODEBASE-no-styles.txt (features/structure only)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EXCLUDE_CSS = process.argv.includes('--no-css');
const OUT = path.join(ROOT, EXCLUDE_CSS ? 'CODEBASE-no-styles.txt' : 'CODEBASE.txt');

const INCLUDE_DIRS = [
  'next-app/src',
  'functions',
];
const INCLUDE_FILES = [
  'README.md',
  'next-app/package.json',
  'next-app/next.config.js',
  'next-app/capacitor.config.ts',
  'next-app/tsconfig.json',
  'firebase.json',
  'package.json',
];

const EXCLUDE_DIRS = new Set([
  'node_modules', '.next', '.git', 'out', 'build', 'dist', 'cache',
  '__pycache__', '.cache', 'android', 'ios', '.idea',
]);
const EXCLUDE_PATTERNS = [
  /\.d\.ts$/,
  /\.map$/,
  /\.hot-update\./,
  /\.pack\.gz$/,
];
const INCLUDE_EXT = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.md', '.rules', '.html',
]);

function shouldExclude(filePath) {
  const name = path.basename(filePath);
  if (EXCLUDE_DIRS.has(name)) return true;
  if (EXCLUDE_CSS && path.extname(filePath) === '.css') return true;
  for (const re of EXCLUDE_PATTERNS) {
    if (re.test(filePath)) return true;
  }
  const ext = path.extname(filePath);
  if (!INCLUDE_EXT.has(ext) && !INCLUDE_FILES.some(f => filePath.replace(ROOT, '').replace(/^[\\/]/, '').startsWith(f))) return true;
  return false;
}

function collectFiles(dir, base = ROOT) {
  const out = [];
  const full = path.join(base, dir);
  if (!fs.existsSync(full) || !fs.statSync(full).isDirectory()) return out;
  const entries = fs.readdirSync(full, { withFileTypes: true });
  for (const e of entries) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (EXCLUDE_DIRS.has(e.name)) continue;
      out.push(...collectFiles(rel, base));
    } else {
      if (shouldExclude(rel)) continue;
      out.push(path.join(base, rel));
    }
  }
  return out;
}

function main() {
  const lines = [];

  lines.push('================================================================================');
  lines.push('WAQF TASK MANAGEMENT SYSTEM – FULL CODEBASE (main code only)');
  lines.push('Generated for AI agents to understand application features and structure.');
  if (EXCLUDE_CSS) {
    lines.push('This version EXCLUDES .css files (features/structure only). See repo for styles.');
  } else {
    lines.push('Excludes: node_modules, .next, build outputs, cache, Android/iOS native projects.');
  }
  lines.push('================================================================================\n');

  // 1. Explicit root/next-app config files
  for (const f of INCLUDE_FILES) {
    const full = path.join(ROOT, f);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      lines.push('\n=== FILE: ' + f + ' ===\n');
      try {
        lines.push(fs.readFileSync(full, 'utf8'));
      } catch (err) {
        lines.push('(read error: ' + err.message + ')');
      }
      lines.push('');
    }
  }

  // 2. Directories
  for (const dir of INCLUDE_DIRS) {
    const fullDir = path.join(ROOT, dir);
    if (!fs.existsSync(fullDir)) continue;
    const files = collectFiles(dir, ROOT);
    files.sort();
    for (const full of files) {
      const rel = path.relative(ROOT, full);
      lines.push('\n=== FILE: ' + rel + ' ===\n');
      try {
        const content = fs.readFileSync(full, 'utf8');
        // Normalize line endings for consistency
        lines.push(content.replace(/\r\n/g, '\n').replace(/\r/g, '\n'));
      } catch (err) {
        lines.push('(read error: ' + err.message + ')');
      }
      lines.push('');
    }
  }

  const result = lines.join('\n');
  fs.writeFileSync(OUT, result, 'utf8');
  console.log('Written:', OUT);
  console.log('Size:', (result.length / 1024).toFixed(1), 'KB');
}

main();
