// app.js：渲染结果
import { segmentsOf, matches } from "./routes.js";
import { step, close } from "./routerun.js";

export function render(spec) {
  const events = spec.events || [];
  const half = Math.ceil(events.length / 2);
  const first = step(spec);
  const closed = close(Object.assign({}, spec, { state: first.state }));
  const r1 = step(Object.assign({}, spec, { events: events.slice(0, half) }));
  const r2 = step(Object.assign({}, spec, { state: r1.state, events: events.slice(half) }));
  const closedTwo = close(Object.assign({}, spec, { state: r2.state }));
  const replay = step(Object.assign({}, spec, { state: closed.state }));
  const wide = step(Object.assign({}, spec, { budget: spec.budget + 2 }));
  const full = step(Object.assign({}, spec, { events: events, budget: events.length + 2 }));
  const fullClosed = close(Object.assign({}, spec, { state: full.state }));
  const fingerprint = function (state) {
    return JSON.stringify({
      routes: state.routes, ledger: state.ledger, applied: state.applied.length
    });
  };
  const fixed = function (pattern) {
    return segmentsOf(pattern).filter(function (part) { return part !== "*"; }).length;
  };
  const lookup = function (state, path) {
    for (const route of state.routes) {
      if (matches(route[0], path)) return route[1];
    }
    return null;
  };
  const best = function (state, path) {
    let hit = null;
    let top = -1;
    state.routes.forEach(function (route) {
      if (!matches(route[0], path)) return;
      const count = fixed(route[0]);
      if (count > top) {
        top = count;
        hit = route[1];
      }
    });
    return hit;
  };
  return { routes: closed.state.routes.map(function (route) {
             return [route[0], route[1], fixed(route[0])];
           }),
           matches: (spec.queries || []).map(function (path) {
             return [path, best(closed.state, path)];
           }),
           registered_first: first.registered, registered_wide: wide.registered,
           pair_differs: first.registered !== wide.registered,
           ledger_before: first.ledger_before, ledger: first.ledger,
           catchup: closed.catchup, ledger_after: closed.state.ledger.length,
           mid_differs: fingerprint(r2.state) !== fingerprint(first.state),
           closed_equal: fingerprint(closedTwo.state) === fingerprint(closed.state),
           replay_new: replay.registered, judged: first.judged, judged_bound: first.judged_bound,
           full_diff: fingerprint(closed.state) === fingerprint(fullClosed.state) ? 0 : 1,
           count: events.length,
           tail: segmentsOf("/a").length + (matches("/a", "/a") ? 1 : 0) };
}
