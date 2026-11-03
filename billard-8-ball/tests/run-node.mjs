// Ausführen mit: node tests/run-node.mjs
import { runAll } from './harness.js';
import './physics.test.js';
import './rules.test.js';

const results = await runAll();
for (const r of results) console.log(`${r.ok ? '✔' : '✘'} ${r.name}${r.ok ? '' : `\n    ${r.error}`}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} bestanden`);
process.exit(failed ? 1 : 0);
