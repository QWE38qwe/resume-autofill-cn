const fs = require("fs");
const assert = require("assert");

const source = fs.readFileSync("manager.js", "utf8");
const start = source.indexOf("const MAIL_BOARD_COLUMNS");
const end = source.indexOf("\nfunction formatMailTime", start);
assert(start >= 0 && end > start, "mail UI helper source not found");
const helpers = new Function(`${source.slice(start, end)}\nreturn { MAIL_BOARD_COLUMNS, normalizeMailBoardColumnWidths, mailBoardTableWidth, mailStatusClass, updateMailCompanyRecords };`)();

const widths = helpers.normalizeMailBoardColumnWidths({ company: 30, subject: 9999, actions: "bad" });
assert.equal(widths.company, 96);
assert.equal(widths.subject, 640);
assert.equal(widths.actions, 230);
assert.equal(Object.keys(widths).length, 9);
assert.equal(helpers.mailBoardTableWidth(widths), Object.values(widths).reduce((sum, value) => sum + value, 0));

const history = [
  { messageId: "a", company: "原始名", companyRaw: "raw-a", companyLocked: false },
  { messageId: "b", company: "原始名", companyRaw: "raw-b", companyLocked: false },
  { messageId: "c", company: "其他", companyRaw: "raw-c", companyLocked: false }
];
let result = helpers.updateMailCompanyRecords(history, { "raw-a": "旧别名", "raw-b": "旧别名" }, ["a", "b"], "新公司");
assert.deepEqual(result.history.slice(0, 2).map(item => [item.company, item.companyLocked, item.companySource, item.needsCompanyReview]), [
  ["新公司", true, "manual", false], ["新公司", true, "manual", false]
]);
assert.equal(result.aliases["raw-a"], "新公司");
assert.equal(result.aliases["raw-b"], "新公司");
assert.equal(result.history[2].company, "其他");

result = helpers.updateMailCompanyRecords(result.history, result.aliases, ["a", "b"], "");
assert.equal(result.history[0].company, null);
assert.equal(result.history[0].companyLocked, false);
assert.equal(result.history[0].needsCompanyReview, true);
assert.equal(result.aliases["raw-a"], "新公司");
assert.equal(result.aliases["raw-b"], "新公司");

assert.equal(helpers.mailStatusClass("待办"), "status-todo");
assert.equal(helpers.mailStatusClass("已完成"), "status-completed");
assert.equal(helpers.mailStatusClass("待确认"), "status-review");
assert.equal(helpers.mailStatusClass("已挂"), "status-hung");
assert.equal(helpers.mailStatusClass("已忽略"), "status-skipped");
assert.equal(helpers.mailStatusClass("失败"), "status-failed");
assert.equal(helpers.mailStatusClass("未知"), "status-unknown");

console.log("mail UI helper tests passed");

