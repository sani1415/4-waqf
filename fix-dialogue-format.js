/**
 * Fix dialogue format: change "- number" to "number -" so the dash is
 * after the number, between the number and the text.
 *
 * Usage:
 *   1. From the .docx: Save As → Plain Text (.txt) in the same folder,
 *      e.g. "حوار بين زميلين في الطبيعة.txt"
 *   2. Run: node fix-dialogue-format.js
 *   3. Opens/create "حوار بين زميلين في الطبيعة-fixed.txt"
 *   4. Copy from the fixed file back into your .docx
 */

const fs = require('fs');
const path = require('path');

const inputName = 'حوار بين زميلين في الطبيعة.txt';
const outputName = 'حوار بين زميلين في الطبيعة-fixed.txt';

const inputPath = path.join(__dirname, inputName);
const outputPath = path.join(__dirname, outputName);

if (!fs.existsSync(inputPath)) {
  console.log('Input file not found:', inputName);
  console.log('Please save your .docx as Plain Text with that name in this folder, then run again.');
  process.exit(1);
}

const text = fs.readFileSync(inputPath, 'utf8');

// Replace "- 1 ", "- 2 ", ... "- 99 " with "1 - ", "2 - ", ...
const fixed = text.replace(/^\s*-\s*(\d+)\s+/gm, '$1 - ');

fs.writeFileSync(outputPath, fixed, 'utf8');
console.log('Done. Fixed content written to:', outputName);
