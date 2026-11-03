// Minimaler Test-Harness, lauffähig im Browser (tests/index.html) und in Node (tests/run-node.mjs).

const registry = [];

export function test(name, fn) {
  registry.push({ name, fn });
}

export function assert(cond, msg = 'Bedingung nicht erfüllt') {
  if (!cond) throw new Error(msg);
}

export function approx(actual, expected, tol, msg = '') {
  if (!(Math.abs(actual - expected) <= tol)) {
    throw new Error(`${msg} erwartet ${expected} ± ${tol}, erhalten ${actual}`);
  }
}

export function equal(actual, expected, msg = '') {
  if (actual !== expected) throw new Error(`${msg} erwartet ${JSON.stringify(expected)}, erhalten ${JSON.stringify(actual)}`);
}

export async function runAll() {
  const results = [];
  for (const t of registry) {
    const start = performance.now();
    try {
      await t.fn();
      results.push({ name: t.name, ok: true, ms: performance.now() - start });
    } catch (e) {
      results.push({ name: t.name, ok: false, ms: performance.now() - start, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return results;
}
