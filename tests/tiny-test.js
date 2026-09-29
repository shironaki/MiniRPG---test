"use strict";

/** Ultra-light test framework: describe/it/expect, no dependencies. */

const tests = [];
let currentSuite = "";

function describe(name, fn) {
    const previous = currentSuite;
    currentSuite = previous ? `${previous} › ${name}` : name;
    fn();
    currentSuite = previous;
}

function it(name, fn) {
    tests.push({ name: `${currentSuite} › ${name}`, fn });
}

function expect(actual) {
    return {
        toBe(expected) {
            if (actual !== expected) {
                throw new Error(`expected ${format(actual)} to be ${format(expected)}`);
            }
        },
        toEqual(expected) {
            if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                throw new Error(`expected ${format(actual)} to equal ${format(expected)}`);
            }
        },
        toBeTruthy() {
            if (!actual) throw new Error(`expected ${format(actual)} to be truthy`);
        },
        toBeFalsy() {
            if (actual) throw new Error(`expected ${format(actual)} to be falsy`);
        },
        toBeGreaterThan(n) {
            if (!(actual > n)) throw new Error(`expected ${format(actual)} > ${format(n)}`);
        },
        toBeGreaterThanOrEqual(n) {
            if (!(actual >= n)) throw new Error(`expected ${format(actual)} >= ${format(n)}`);
        },
        toBeLessThanOrEqual(n) {
            if (!(actual <= n)) throw new Error(`expected ${format(actual)} <= ${format(n)}`);
        },
        toContain(sub) {
            if (!String(actual).includes(sub)) {
                throw new Error(`expected ${format(actual)} to contain ${format(sub)}`);
            }
        }
    };
}

function format(v) {
    if (typeof v === "string") return JSON.stringify(v);
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
}

async function run() {
    let passed = 0;
    const failures = [];
    for (const t of tests) {
        try {
            await t.fn();
            passed++;
            console.log(`  \x1b[32m✓\x1b[0m ${t.name}`);
        } catch (err) {
            failures.push({ name: t.name, err });
            console.log(`  \x1b[31m✗\x1b[0m ${t.name}`);
            console.log(`      ${err.message}`);
        }
    }
    console.log("");
    console.log(`${passed}/${tests.length} passed` + (failures.length ? `, ${failures.length} FAILED` : ""));
    if (failures.length) process.exitCode = 1;
}

module.exports = { describe, it, expect, run };
