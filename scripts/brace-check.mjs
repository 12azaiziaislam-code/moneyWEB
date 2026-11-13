import { readFileSync } from 'node:fs';

const file = process.argv[2];
const text = readFileSync(file, 'utf8');
let depth = 0;
let line = 1;
let firstNegative = -1;
for (let i = 0; i < text.length; i += 1) {
  const char = text[i];
  if (char === '\n') line += 1;
  if (char === '{' || char === '(' || char === '[') depth += 1;
  if (char === '}' || char === ')' || char === ']') {
    depth -= 1;
    if (depth < 0 && firstNegative < 0) firstNegative = line;
  }
}
console.log('final depth', depth, 'first negative at line', firstNegative);
