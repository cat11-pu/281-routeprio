import fs from "node:fs";
import { segmentsOf, matches } from "./routes.js";
import { step, close } from "./routerun.js";

// 验收断言：上面每条值收进 emit，最后与期望值逐项比对，不符就非零退出。
const __lines = [];
function emit(label, value) { __lines.push([String(label).replace(/ =$/, ""), value]); }


const spec = JSON.parse(fs.readFileSync(process.argv[2] || "sample/routes.json", "utf8"));
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

emit("收尾后路由表 =", JSON.stringify(closed.state.routes));
emit("收尾后匹配结果 =", JSON.stringify((spec.queries || []).map(function (path) {
  return [path, best(closed.state, path)];
})));
emit("首轮注册条数 =", first.registered);
emit("二档注册条数 =", wide.registered);
emit("两个预算档注册不同 =", first.registered !== wide.registered);
emit("收尾前待注册账 =", first.ledger_before);
emit("压在账上的路由 =", JSON.stringify(first.ledger));
emit("收尾补齐条数 =", closed.catchup);
emit("收尾后待注册账 =", closed.state.ledger.length);
emit("拆两轮中间态不同 =", fingerprint(r2.state) !== fingerprint(first.state));
emit("拆两轮收尾态一致 =", fingerprint(closedTwo.state) === fingerprint(closed.state));
emit("重放新注册 =", replay.registered);
emit("工作计数未超上界 =", first.judged <= first.judged_bound);
emit("与全量对照差异 =", fingerprint(closed.state) === fingerprint(fullClosed.state) ? 0 : 1);


// ---- 异常路径探针：真调用实现，看它报出什么码（不是从样例里抄）----
try {
  step(Object.assign({}, { budget: 2, queries: [],
    state: { routes: [["/a/*", "t1"]], ledger: [], applied: [] },
    events: [{ id: 1, kind: "add", pattern: "/a/*", target: "t2" }] }));
  emit("重复路由报码", "没有报错");
} catch (error) {
  emit("重复路由报码", error && error.code ? error.code : String(error.message));
}
try {
  step(Object.assign({}, { budget: 2, queries: [],
    state: { routes: [], ledger: [], applied: [] },
    events: [{ id: 1, kind: "peek", pattern: "/a" }] }));
  emit("事件不合法报码", "没有报错");
} catch (error) {
  emit("事件不合法报码", error && error.code ? error.code : String(error.message));
}


// ---- 期望值（参考模型算出，与题面给的验收数值一致）----
const EXPECTED = {
  "收尾后路由表": [
    [
      "/a/*",
      "t1"
    ],
    [
      "/a/b",
      "t2"
    ],
    [
      "/*/c",
      "t3"
    ]
  ],
  "收尾后匹配结果": [
    [
      "/a/b",
      "t2"
    ],
    [
      "/a/c",
      "t1"
    ],
    [
      "/a/b/c",
      null
    ]
  ],
  "首轮注册条数": 2,
  "二档注册条数": 3,
  "两个预算档注册不同": true,
  "收尾前待注册账": 1,
  "压在账上的路由": [
    [
      "/*/c",
      "t3"
    ]
  ],
  "收尾补齐条数": 1,
  "收尾后待注册账": 0,
  "拆两轮中间态不同": true,
  "拆两轮收尾态一致": true,
  "重放新注册": 0,
  "工作计数未超上界": true,
  "与全量对照差异": 0,
  "重复路由报码": "E_DUPLICATE_ROUTE",
  "事件不合法报码": "E_BAD_EVENT"
};
// 有的值在收进来之前已经 stringify 过，比较前先试着解析回来，避免类型错配把正确实现判成不过。
function __same(got, want) {
  if (typeof got === "string") {
    try { const parsed = JSON.parse(got); if (JSON.stringify(parsed) === JSON.stringify(want)) return true; } catch (error) { /* 不是 JSON 就按原文比 */ }
  }
  return JSON.stringify(got) === JSON.stringify(want);
}
let __bad = 0;
for (const [label, want] of Object.entries(EXPECTED)) {
  const found = __lines.find((pair) => pair[0] === label);
  if (!found) { __bad += 1; console.log("缺失验收项 " + label); continue; }
  const got = found[1];
  if (__same(got, want)) { console.log("一致 " + label + " = " + JSON.stringify(got)); }
  else { __bad += 1; console.log("不一致 " + label + " 期望 " + JSON.stringify(want) + " 实际 " + JSON.stringify(got)); }
}
console.log("验收项 " + (Object.keys(EXPECTED).length - __bad) + "/" + Object.keys(EXPECTED).length + " 通过");
process.exit(__bad === 0 ? 0 : 1);
