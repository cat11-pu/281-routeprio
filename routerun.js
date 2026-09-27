// routerun.js：按注册预算注册并留账，收尾时不限预算补齐
import { segmentsOf, matches } from "./routes.js";

function fail(code, message) {
  const error = new Error(message || code);
  error.code = code;
  throw error;
}

function cloneState(state) {
  const source = state || {};
  return {
    routes: (source.routes || []).map(function (route) { return [route[0], route[1]]; }),
    ledger: (source.ledger || []).map(function (route) { return [route[0], route[1]]; }),
    applied: (source.applied || []).slice()
  };
}

function validEvent(event) {
  if (!event || typeof event !== "object") return false;
  if (event.kind !== "add") return false;
  if (typeof event.pattern !== "string" || event.pattern.length === 0) return false;
  if (event.target === null || event.target === undefined) return false;
  return true;
}

export function step(spec) {
  const state = cloneState(spec.state);
  const events = Array.isArray(spec.events) ? spec.events : [];
  const budget = typeof spec.budget === "number" && isFinite(spec.budget)
    ? Math.max(0, Math.trunc(spec.budget)) : 0;
  const known = new Set();
  state.routes.forEach(function (route) { known.add(route[0]); });
  state.ledger.forEach(function (route) { known.add(route[0]); });
  const applied = new Set(state.applied);
  let remaining = budget;
  let registered = 0;

  events.forEach(function (event) {
    if (!validEvent(event)) fail(spec.event_error_code || "E_BAD_EVENT");
    if (event.id !== undefined && applied.has(event.id)) return;
    if (known.has(event.pattern)) fail(spec.duplicate_error_code || "E_DUPLICATE_ROUTE");
    known.add(event.pattern);
    if (event.id !== undefined) applied.add(event.id);
    if (remaining > 0) {
      state.routes.push([event.pattern, event.target]);
      remaining -= 1;
      registered += 1;
    } else {
      state.ledger.push([event.pattern, event.target]);
    }
  });
  state.applied = Array.from(applied);

  return {
    state: state,
    registered: registered,
    ledger_before: state.ledger.length,
    ledger: state.ledger.map(function (route) { return [route[0], route[1]]; }),
    judged: events.length,
    judged_bound: events.length
  };
}

export function close(spec) {
  const state = cloneState(spec.state);
  let catchup = 0;
  while (state.ledger.length > 0) {
    const route = state.ledger.shift();
    state.routes.push(route);
    catchup += 1;
  }
  return { state: state, catchup: catchup };
}
