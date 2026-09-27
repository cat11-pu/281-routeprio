// routerun.js：按注册预算注册并留账（基线：一律给空表）
import { segmentsOf, matches } from "./routes.js";

export function step(spec) {
  return { state: spec.state, registered: 0, ledger_before: 0, ledger: [], judged: 0, judged_bound: 0 };
}

export function close(spec) {
  return { state: spec.state, catchup: 0 };
}
