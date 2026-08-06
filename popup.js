const $ = selector => document.querySelector(selector);
let tabId;

function escapeHtml(value = "") {
  const node = document.createElement("div");
  node.textContent = value;
  return node.innerHTML;
}

function historyKey(record) {
  return String(record.company || record.site || "").trim().toLocaleLowerCase("zh-CN");
}

function latestByCompany(records) {
  const latest = new Map();
  records.forEach((record, index) => {
    const key = historyKey(record) || `__record_${index}`;
    const parsedTime = Date.parse(String(record.time || "").replace(/年|月/g, "/").replace(/日/g, ""));
    const candidate = { record, index, timestamp: Number.isNaN(parsedTime) ? 0 : parsedTime };
    const current = latest.get(key);
    if (!current || candidate.timestamp > current.timestamp ||
      (candidate.timestamp === current.timestamp && candidate.index < current.index)) {
      latest.set(key, candidate);
    }
  });
  return [...latest.values()]
    .sort((left, right) => right.timestamp - left.timestamp || left.index - right.index)
    .map(item => item.record);
}

function pageHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "") || "当前页面";
  } catch {
    return "当前页面";
  }
}

async function init() {
  $("#buildVersion").textContent = `v${chrome.runtime.getManifest().version}`;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab.id;
  const { profiles = [], activeProfileId, settings = {}, fillHistory = [] } =
    await chrome.storage.local.get(["profiles", "activeProfileId", "settings", "fillHistory"]);

  profiles.forEach(profile => {
    $("#profile").add(new Option(profile.name, profile.id, profile.id === activeProfileId, profile.id === activeProfileId));
  });
  if (!profiles.length) {
    $("#profile").add(new Option("请先创建简历版本", ""));
    $("#profile").disabled = true;
  }

  const updateResumeMeta = () => {
    const profile = profiles.find(item => item.id === $("#profile").value);
    if (!profile) {
      $("#target").textContent = "前往资料与版本创建简历";
      return;
    }
    const attachment = profile.attachment ? ` · ${profile.attachment}` : "";
    $("#target").textContent = `${profile.work?.length || 0} 段实习经历${attachment}`;
  };
  updateResumeMeta();

  $("#profile").onchange = async () => {
    await chrome.storage.local.set({ activeProfileId: $("#profile").value });
    updateResumeMeta();
  };

  const apiConfigured = Boolean(settings.apiConfigured || (settings.apiKey && settings.model));
  $("#apiStatus").textContent = apiConfigured ? "已配置" : "未配置";
  $("#apiStatus").className = `pill ${apiConfigured ? "green" : "gray"}`;
  $("#site").textContent = pageHost(tab.url);

  const compactHistory = latestByCompany(fillHistory);
  if (compactHistory.length !== fillHistory.length) {
    await chrome.storage.local.set({ fillHistory: compactHistory });
  }
  if (compactHistory[0]) showHistory(compactHistory[0]);
  await scan();
}

async function send(type, payload = {}) {
  try {
    return await chrome.tabs.sendMessage(tabId, { type, ...payload });
  } catch (error) {
    const message = String(error?.message || error);
    if (/Receiving end does not exist|Could not establish connection|message port closed/i.test(message)) {
      try {
        await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, files: ["content.js"] });
        await new Promise(resolve => setTimeout(resolve, 120));
        return await chrome.tabs.sendMessage(tabId, { type, ...payload });
      } catch (injectError) {
        return { error: `内容脚本注入失败：${injectError.message || injectError}` };
      }
    }
    return { error: `扫描失败：${message}` };
  }
}

async function scan() {
  const result = await send("SCAN_FORM");
  $("#detected").textContent = result?.total != null ? `${result.count}/${result.total}` : (result?.count ?? 0);
  if (result?.aiSource === "deepseek" || result?.aiSource === "cache") {
    $("#apiStatus").textContent = `AI 匹配 ${result.aiMatched || 0}`;
    $("#apiStatus").className = "pill green";
  } else if (result?.aiError) {
    $("#apiStatus").textContent = "AI 异常";
    $("#apiStatus").className = "pill yellow";
  }
  if (result?.error) show([{ label: result.error, state: "gray" }]);
}

function show(items) {
  $("#results").innerHTML = items.length
    ? items.map(item => `<div class="result-item"><span class="pill ${item.state}">${item.status || "提示"}</span><span>${escapeHtml(item.label)}</span></div>`).join("")
    : "<div class='muted'>没有可填写字段。</div>";
}

function showHistory(history) {
  $("#resultSummary").textContent = `匹配 ${history.matched?.length || 0} · 未匹配 ${history.unmatched?.length || 0}`;
  const rows = [
    ...(history.matched || []).map(label => ({ status: "已匹配", state: "green", label })),
    ...(history.unmatched || []).map(label => ({ status: "未匹配", state: "yellow", label })),
    ...(history.skipped || []).map(label => ({ status: "已跳过", state: "gray", label }))
  ];
  show(rows);
}

$("#scan").onclick = scan;
async function runFill(mode, button) {
  const buttons = [$("#fill"), $("#supplement")];
  buttons.forEach(item => item.disabled = true);
  const original = button.querySelector("span").textContent;
  button.querySelector("span").textContent = "填写中…";
  try {
    const result = await send("FILL_FORM", { mode });
    const items = result?.items || [{ label: result?.error || "填写失败", state: "gray" }];
    show(items);

    if (!result?.error) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const store = await chrome.storage.local.get(["fillHistory"]);
      const matched = items.filter(item => /已填写|已选择|专项/.test(item.status || "") && !/未找到/.test(item.label)).map(item => item.label);
      const unmatched = items.filter(item => /未匹配|未找到|待适配/.test((item.status || "") + item.label)).map(item => item.label);
      const skipped = items.filter(item => /跳过/.test(item.status || "")).map(item => item.label);
      const site = pageHost(tab.url);
      const company = site.split(".")[0];
      const record = {
        company,
        site,
        url: tab.url,
        time: new Date().toLocaleString(),
        status: unmatched.length ? "未完成" : "已完成",
        note: "",
        matched,
        unmatched,
        skipped,
        profile: result.profile,
        mode
      };
      const key = historyKey(record);
      const history = [record, ...(store.fillHistory || []).filter(item => historyKey(item) !== key)].slice(0, 100);
      await chrome.storage.local.set({ fillHistory: history });
      showHistory(record);
    }
    await scan();
  } finally {
    button.querySelector("span").textContent = original;
    buttons.forEach(item => item.disabled = false);
  }
}

$("#fill").onclick = () => runFill("full", $("#fill"));
$("#supplement").onclick = () => runFill("supplement", $("#supplement"));

$("#manage").onclick = $("#settings").onclick = () => chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" });
init();
