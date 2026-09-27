import assert from "node:assert";
import { segmentsOf, matches } from "../routes.js";
import { step, close } from "../routerun.js";
import { render } from "../app.js";

const base = {
  budget: 2, queries: [],
  state: { routes: [], ledger: [], applied: [] },
  events: [],
  duplicate_error_code: "E_DUPLICATE_ROUTE", event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("segmentsOf returns a list", () => {
  assert.ok(Array.isArray(segmentsOf("/a/b")));
});

check("matches returns a flag", () => {
  assert.strictEqual(typeof matches("/a", "/a"), "boolean");
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  assert.strictEqual(typeof close(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
