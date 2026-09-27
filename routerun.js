// routerun.js：按整批共用的注册预算注册，用尽的路由压账，收尾时清账
function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function normalize(state) {
  const source = state || {};
  return {
    routes: Array.isArray(source.routes) ? source.routes.slice() : [],
    ledger: Array.isArray(source.ledger) ? source.ledger.slice() : [],
    applied: Array.isArray(source.applied) ? source.applied.slice() : []
  };
}

function duplicateCode(spec) {
  return spec && spec.duplicate_error_code ? spec.duplicate_error_code : "E_DUPLICATE_ROUTE";
}

function eventCode(spec) {
  return spec && spec.event_error_code ? spec.event_error_code : "E_BAD_EVENT";
}

function validateEvent(event, spec) {
  const ok = event !== null && typeof event === "object"
    && event.kind === "add"
    && typeof event.pattern === "string"
    && event.pattern.charAt(0) === "/"
    && typeof event.target === "string";
  if (!ok) fail(eventCode(spec), "invalid add event");
}

export function step(spec) {
  const base = normalize(spec.state);
  const events = Array.isArray(spec.events) ? spec.events : [];
  const budget = typeof spec.budget === "number" ? spec.budget : 0;

  const routes = base.routes.map(function (route) { return [route[0], route[1]]; });
  const ledger = base.ledger.map(function (entry) { return [entry[0], entry[1]]; });
  const applied = base.applied.slice();

  const known = new Set();
  routes.forEach(function (route) { known.add(route[0]); });
  ledger.forEach(function (entry) { known.add(entry[0]); });
  const handled = new Set(applied);

  let registered = 0;
  let judged = 0;

  events.forEach(function (event) {
    validateEvent(event, spec);
    if (handled.has(event.id)) return;
    judged += 1;
    if (known.has(event.pattern)) {
      fail(duplicateCode(spec), "duplicate route " + event.pattern);
    }
    if (registered < budget) {
      routes.push([event.pattern, event.target]);
      registered += 1;
    } else {
      ledger.push([event.pattern, event.target]);
    }
    known.add(event.pattern);
    handled.add(event.id);
    applied.push(event.id);
  });

  return {
    state: { routes: routes, ledger: ledger, applied: applied },
    registered: registered,
    ledger_before: ledger.length,
    ledger: ledger.map(function (entry) { return [entry[0], entry[1]]; }),
    judged: judged,
    judged_bound: events.length
  };
}

export function close(spec) {
  const base = normalize(spec.state);
  const routes = base.routes.map(function (route) { return [route[0], route[1]]; });
  let catchup = 0;

  base.ledger.forEach(function (entry) {
    routes.push([entry[0], entry[1]]);
    catchup += 1;
  });

  return {
    state: { routes: routes, ledger: [], applied: base.applied.slice() },
    catchup: catchup
  };
}
