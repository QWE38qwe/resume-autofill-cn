const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "../submission/index.html"), "utf8");
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]);
const context = vm.createContext({ Date, Intl, Set, Object });
vm.runInContext(`${scripts[0]}\nglobalThis.core = Demo;`, context);
const core = context.core;
const seed = () => core.makeSeed(new Date("2026-10-15T12:00:00"));

test("the standalone HTML has no external resources and both scripts compile", () => {
  assert.equal(scripts.length, 2);
  for (const script of scripts) assert.doesNotThrow(() => new vm.Script(script));
  assert.doesNotMatch(html, /<(?:script|link|img|iframe)\b[^>]*(?:src|href)\s*=\s*["']https?:/i);
  assert.doesNotMatch(scripts.join("\n"), /\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/);
});

test("mock records form a valid connected workspace", () => {
  const data = seed();
  assert.equal(core.validState(data), true);
  assert.equal(data.applications.length, 18);
  assert.equal(data.tasks.length, 10);
  assert.equal(data.versions.length, 3);
  assert.equal(data.personal.email.endsWith("@example.com"), true);
  assert.match(data.personal.phone, /\*/);
  for (const task of data.tasks) {
    assert.equal(task.company, data.applications.find(app => app.id === task.applicationId).company);
  }
});

test("metrics follow application and task edits rather than fixed display values", () => {
  const data = seed();
  const before = core.metrics(data, "2026-10-15");
  assert.equal(before.total, 18);
  assert.equal(before.interviews, 5);
  assert.equal(before.offers, 1);
  assert.equal(before.pending, 8);
  assert.equal(Object.values(before.counts).reduce((sum, count) => sum + count, 0), before.total);
  data.applications[0].stage = "已录用";
  data.tasks[0].completed = true;
  const after = core.metrics(data, "2026-10-15");
  assert.equal(after.interviews, 4);
  assert.equal(after.offers, 2);
  assert.equal(after.pending, 7);
});

test("application search combines text and stage and leaves source order intact", () => {
  const data = seed();
  const ids = data.applications.map(app => app.id).join(",");
  const matching = core.filterApplications(data, "栖木", "面试中");
  assert.equal(matching.length, 1);
  assert.equal(matching[0].id, "app1");
  assert.equal(core.filterApplications(data, "栖木", "测评中").length, 0);
  assert.equal(core.filterApplications(data, "   ").length, 18);
  assert.equal(core.filterApplications(data, "不存在的公司").length, 0);
  assert.equal(data.applications.map(app => app.id).join(","), ids);
});

test("resume selection resolves referenced experiences and supports empty experience lists", () => {
  const data = seed();
  const ai = core.fillValues(data, "v1");
  const growth = core.fillValues(data, "v3");
  assert.equal(ai.role, "AI 产品经理");
  assert.notEqual(ai.company, growth.company);
  assert.equal(growth.company, data.work[1].company);
  data.versions[0].workIds = [];
  data.versions[0].projectIds = [];
  assert.equal(core.fillValues(data, "v1").company, "");
  assert.equal(core.fillValues(data, "v1").project, "");
  assert.equal(core.validState(data), true);
});

test("filling preserves existing values and leaves unknown fields for the user", () => {
  const data = seed();
  const values = core.fillValues(data, "v1");
  const plan = core.planFill({name:"",city:"原有城市",salary:""}, values);
  assert.equal(plan.find(item => item.key === "name").status, "filled");
  assert.equal(plan.find(item => item.key === "city").status, "skipped");
  assert.equal(plan.find(item => item.key === "city").previous, "原有城市");
  assert.equal(plan.find(item => item.key === "salary").status, "manual");
  assert.equal(core.planFill({city:"原有城市"}, values, true)[0].status, "filled");
});

test("invalid stored state is rejected before rendering", () => {
  for (const change of [
    data => { data.versions = []; },
    data => { data.applications[0].stage = "unknown"; },
    data => { data.applications[0].versionId = "missing"; },
    data => { data.tasks[0].applicationId = "missing"; },
    data => { data.tasks[0].completed = "yes"; },
    data => { data.tasks[0].time = "99:99"; },
    data => { data.work.push({...data.work[0]}); },
    data => { data.versions[0].workIds = ["missing"]; },
    data => { data.personal.name = null; },
    data => { delete data.personal.customFields; },
    data => { delete data.personal.currentCity; },
  ]) {
    const data = seed();
    change(data);
    assert.equal(core.validState(data), false);
  }
  assert.equal(core.validState(null), false);
});

test("calendar date arithmetic handles month and year boundaries", () => {
  assert.equal(core.offsetDay("2026-12-31", 1), "2027-01-01");
  assert.equal(core.offsetDay("2028-03-01", -1), "2028-02-29");
  assert.equal(core.offsetDay("2026-03-01", -1), "2026-02-28");
});

test("existing backups gain default settings without losing edited profile data", () => {
  const data = seed();
  delete data.settings;
  data.personal.name = "虚构测试人物";
  assert.equal(core.validState(data), true);
  data.settings = core.normalizeSettings(data.settings, data.versions);
  assert.equal(data.personal.name, "虚构测试人物");
  assert.equal(data.settings.fill.defaultVersionId, data.versions[0].id);
  assert.equal(data.settings.fill.overwriteExisting, false);
  assert.equal(core.validState(data), true);
});

test("enabled preset answers participate in actual simulated filling", () => {
  const data = seed();
  assert.equal(core.fillValues(data, "v1").salary, undefined);
  data.settings.fill.rules[0].enabled = true;
  const values = core.fillValues(data, "v1");
  assert.equal(values.salary, data.settings.fill.rules[0].answer);
  assert.equal(core.planFill({salary:""}, values)[0].status, "filled");
  data.settings.fill.rules[0].enabled = false;
  assert.equal(core.planFill({salary:""}, core.fillValues(data, "v1"))[0].status, "manual");
});

test("settings validate types, port ranges and unique answer fields", () => {
  for (const change of [
    settings => { settings.mail.port = 0; },
    settings => { settings.mail.port = 65536; },
    settings => { settings.mail.intervalHours = 0; },
    settings => { settings.mail.lookbackHours = 0; },
    settings => { settings.mail.lastSync = {at:"invalid",added:1}; },
    settings => { settings.ai.optionMatching = "true"; },
    settings => { settings.ai.providers[0].enabled = "false"; },
    settings => { settings.fill.animate = 1; },
    settings => { settings.fill.rules[0].field = "unknown"; },
    settings => { settings.fill.rules.push({...settings.fill.rules[0],id:"another-rule"}); },
  ]) {
    const data = seed();
    change(data.settings);
    assert.equal(core.validState(data), false);
  }
});

test("normalizing imported settings drops credential fields and repairs missing version references", () => {
  const data = seed();
  data.settings.ai.providers[0].apiKey = "test-placeholder";
  data.settings.mail.authCode = "test-placeholder";
  data.settings.fill.defaultVersionId = "missing";
  const settings = core.normalizeSettings(data.settings, data.versions);
  assert.equal(Object.hasOwn(settings.ai.providers[0], "apiKey"), false);
  assert.equal(Object.hasOwn(settings.mail, "authCode"), false);
  assert.equal(settings.fill.defaultVersionId, data.versions[0].id);
  assert.equal(core.validSettings(settings), true);
});

test("JSON backups round-trip settings and separate workspaces do not share settings", () => {
  const first = seed();
  first.settings.mail.port = 995;
  first.settings.mail.autoSync = true;
  first.settings.fill.overwriteExisting = true;
  const restored = JSON.parse(JSON.stringify(first));
  assert.equal(core.validState(restored), true);
  assert.equal(restored.settings.mail.port, 995);
  assert.equal(restored.settings.fill.overwriteExisting, true);
  assert.equal(seed().settings.mail.port, 993);
});

test("CSV export escapes quotes, preserves selected rows and neutralizes formulas", () => {
  const data = seed();
  data.applications[0].company = '=HYPERLINK("https://example.com")';
  const csv = core.csv(data, [data.applications[0]]);
  assert.equal(csv.startsWith("\ufeff"), true);
  assert.equal(csv.split("\r\n").length, 2);
  assert.match(csv, /"'=HYPERLINK\(""https:\/\/example.com""\)"/);
  assert.equal(core.esc('<img src=x onerror="alert(1)">'), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
});
