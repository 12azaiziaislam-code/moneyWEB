// Temporary: cut a file at the end of a marker block (UTF-8 safe).
import { readFileSync, writeFileSync } from 'node:fs';

const [file, marker] = process.argv.slice(2);
const text = readFileSync(file, 'utf8');
const start = text.indexOf(marker);
if (start < 0) {
  console.error('marker not found');
  process.exit(1);
}
const end = text.indexOf('\n}', start);
const cut = text.slice(0, end + 2);
writeFileSync(file, `${cut}\n`, 'utf8');
console.log('kept', cut.split('\n').length, 'lines');
