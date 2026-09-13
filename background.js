const defaultAiRules = [];
const MAIL_NATIVE_HOST = "cn.local.jianfill.mail";
const MAIL_ALARM = "jianfill-mail-sync";
const DATA_SYNC_ALARM = "jianfill-data-sync";
const NATIVE_MESSAGE_TIMEOUT_MS = 5 * 60 * 1000;
chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get(null);
  const payload = { seedVersion: 6 };
  const arrayKeys = [
    "education", "profiles", "projects", "awards", "languages", "skills",
    "certificates", "family", "papers", "portfolio", "customFields", "fillHistory",
    "mailHistory"
  ];
  if (!current.personal) payload.personal = {};
  arrayKeys.forEach(key => {
    if (!Array.isArray(current[key])) payload[key] = [];
  });
  if (current.activeProfileId == null) payload.activeProfileId = "";
  if (current.hobbies == null) payload.hobbies = "";
  if (!current.mailCalendarNotes || typeof current.mailCalendarNotes !== "object") payload.mailCalendarNotes = {};
  payload.mailViewPreference = "board";

  const settings = {
    high: .9,
    medium: .7,
    overwrite: false,
    apiConfigured: false,
    ...(current.settings || {})
  };
  if (!Array.isArray(settings.aiRules)) settings.aiRules = defaultAiRules;
  settings.aiProviders = normalizeAiProviders(settings);
  settings.apiConfigured = activeAiProviders(settings).length > 0;
  payload.settings = settings;
  const currentMailSettings = current.mailSettings || {};
  payload.mailSettings = {
    host: "imap.126.com",
    port: 993,
    folder: "INBOX",
    autoSync: true,
    syncIntervalMinutes:
      Number(currentMailSettings.syncIntervalMinutes) === 120
        ? 720
        : Number(currentMailSettings.syncIntervalMinutes) || 720,
    lookbackHours: Number(currentMailSettings.lookbackHours) || 24,
    ...currentMailSettings
  };
  delete payload.mailSettings.dryRun;
  delete payload.mailSettings.cookieStatusField;
  delete payload.mailSettings.cookieCheckedAtField;
  delete payload.mailSettings.monitorEnabledField;
  delete payload.mailSettings.progressAutoSync;
  delete payload.mailSettings.progressIntervalMinutes;
  ["appId", "appSecret", "baseToken", "tableId", "companyField", "noteField", "assessmentLinkField", "ddlField", "parentField", "receivedAtField", "subjectField"].forEach(key => delete payload.mailSettings[key]);
  if (Number(currentMailSettings.syncIntervalMinutes) === 120) {
    payload.mailSettings.syncIntervalMinutes = 720;
  }
  await chrome.storage.local.set(payload);
  await chrome.storage.local.remove("mailViewPreference");
  await chrome.storage.local.remove(["progressLoginTabs", "progressMonitorStatus"]);
  await scheduleMailSync(payload.mailSettings);
  await chrome.alarms.clear(DATA_SYNC_ALARM);
});

function chatEndpoint(apiBase) {
  const base = String(apiBase || "https://api.deepseek.com").trim().replace(/\/+$/, "");
  return /\/chat\/completions$/i.test(base) ? base : `${base}/chat/completions`;
}

function normalizeAiProviders(settings = {}) {
  const providers = Array.isArray(settings.aiProviders) ? settings.aiProviders : [];
  const normalized = providers
    .map((provider, index) => ({
      id: provider.id || `provider-${index}`,
      name: String(provider.name || provider.model || `模型 ${index + 1}`).trim(),
      apiBase: String(provider.apiBase || "").trim(),
      model: String(provider.model || "").trim(),
      apiKey: String(provider.apiKey || "").trim(),
      enabled: provider.enabled !== false,
      order: Number.isFinite(Number(provider.order)) ? Number(provider.order) : index
    }))
    .filter(provider => provider.apiBase && provider.model && provider.apiKey)
    .sort((left, right) => left.order - right.order);

  if (!normalized.length && settings.apiKey) {
    normalized.push({
      id: "legacy-default",
      name: settings.model || "默认模型",
      apiBase: settings.apiBase || "https://api.deepseek.com",
      model: settings.model || "deepseek-chat",
      apiKey: settings.apiKey,
      enabled: true,
      order: 0
    });
  }

  return normalized;
}

function activeAiProviders(settings = {}) {
  return normalizeAiProviders(settings).filter(provider => provider.enabled);
}

function shouldFallbackAi(error) {
  if (error?.retryable) return true;
  const status = Number(error?.status || 0);
  return status === 401 || status === 402 || status === 403 || status === 408 ||
    status === 409 || status === 429 || status >= 500;
}

async function requestChatCompletion(provider, body) {
  let response;
  try {
    response = await fetch(chatEndpoint(provider.apiBase), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${provider.apiKey}`
      },
      body: JSON.stringify({ ...body, model: provider.model })
    });
  } catch (error) {
    error.retryable = true;
    throw error;
  }

  if (!response.ok) {
    const bodyText = await response.text();
    const error = new Error(`AI 服务请求失败（${response.status}）：${bodyText.slice(0, 160)}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

async function withAiFallback(settings, body) {
  const providers = activeAiProviders(settings);
  if (!providers.length) throw new Error("未配置启用的 AI 模型版本");

  const errors = [];
  for (const provider of providers) {
    try {
      const payload = await requestChatCompletion(provider, body);
      return { payload, provider };
    } catch (error) {
      errors.push(`${provider.name || provider.model}: ${error.message || error}`);
      if (!shouldFallbackAi(error)) throw error;
    }
  }

  throw new Error(`所有启用模型均不可用：${errors.join("；")}`);
}

function parseJsonContent(content) {
  const source = String(content || "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI 返回内容不是有效 JSON");
  return JSON.parse(source.slice(start, end + 1));
}

const COMPANY_HOST_RULES = [
  [/^campus\.58\.com$/, "58同城"],
  [/^nio\.jobs\.feishu\.cn$/, "蔚来"],
  [/^anker-in\.jobs\.feishu\.cn$/, "安克创新"],
  [/^transsion\.zhiye\.com$/, "传音控股"],
  [/^talent\.lenovo\.com\.cn$/, "联想"],
  [/^campushr\.hikvision\.com$/, "海康威视"],
  [/^jobs\.bytedance\.com$/, "字节跳动"],
  [/^xiaomi\.jobs\.f\.mioffice\.cn$/, "小米"],
  [/^campus\.shokz\.com\.cn$/, "韶音科技"],
  [/^campus\.jd\.com$/, "京东"],
  [/^careers\.pddglobalhr\.com$/, "拼多多"],
  [/^careers\.oppo\.com$/, "OPPO"],
  [/^iflytek\.zhiye\.com$/, "科大讯飞"],
  [/^campus\.kuaishou\.cn$/, "快手"]
];

const COMPANY_URL_RULES = [
  [/^https?:\/\/app\.mokahr\.com\/campus-recruitment\/sina(?:\/|$)/i, "新浪"]
];

function normalizedHostname(value) {
  try {
    const source = String(value || "").trim().toLowerCase();
    if (!source) return "";
    if (!source.includes("://")) return source.replace(/^www\./, "").split("/")[0];
    return new URL(source).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function knownCompanyForPage(hostname, url = "") {
  const host = normalizedHostname(hostname);
  return COMPANY_HOST_RULES.find(([pattern]) => pattern.test(host))?.[1]
    || COMPANY_URL_RULES.find(([pattern]) => pattern.test(String(url || "")))?.[1]
    || "";
}

function validResolvedCompany(value) {
  const company = String(value || "").trim();
  if (!company || company.length > 40) return false;
  if (/^(campus|app|jobs?|talent|career|careers|campushr|recruit|招聘|校园招聘)$/i.test(company)) {
    return false;
  }
  return /[\u3400-\u9fff]/.test(company) || /^(OPPO|vivo|DJI|BCG|BMW|TCL)$/i.test(company);
}

async function resolveCompanyNames(message) {
  const records = (Array.isArray(message.records) ? message.records : [])
    .slice(0, 30)
    .map((record, index) => ({
      id: String(record?.id ?? index),
      hostname: normalizedHostname(record?.hostname || record?.url),
      url: String(record?.url || "").trim(),
      title: String(record?.title || "").trim().slice(0, 160)
    }));
  if (!records.length) return { ok: true, resolutions: [] };

  const { settings = {}, companyNameMappings = {} } =
    await chrome.storage.local.get(["settings", "companyNameMappings"]);
  const resolutions = [];
  const unresolved = [];
  records.forEach(record => {
    const known = knownCompanyForPage(record.hostname, record.url);
    const cacheKey = `${record.hostname}|${record.title}`;
    const cached = String(companyNameMappings[cacheKey] || "");
    if (known) resolutions.push({ id: record.id, company: known, source: "domain" });
    else if (validResolvedCompany(cached)) {
      resolutions.push({ id: record.id, company: cached, source: "cache" });
    } else {
      unresolved.push({ ...record, cacheKey });
    }
  });

  if (unresolved.length && activeAiProviders(settings).length) {
    const prompt = `识别招聘网页对应的中国公司品牌。根据 hostname 和页面标题输出用户熟悉的中文简称，例如 campus.58.com 应为“58同城”，nio.jobs.feishu.cn 应为“蔚来”。禁止输出 campus、app、talent、jobs、career 等站点路径词；无法可靠判断时 company 必须为 null。

只返回 JSON：
{"resolutions":[{"id":"输入 id","company":"中文公司简称或 null","confidence":0.0}]}

输入：
${JSON.stringify(unresolved.map(({ id, hostname, title }) => ({ id, hostname, title })))}`;
    try {
      const { payload, provider } = await withAiFallback(settings, {
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "你是招聘网站公司识别器。只根据公开网页域名和标题识别雇主品牌，不推测用户信息。" },
          { role: "user", content: prompt }
        ]
      });
      const parsed = parseJsonContent(payload.choices?.[0]?.message?.content);
      const byId = new Map(unresolved.map(record => [record.id, record]));
      (Array.isArray(parsed.resolutions) ? parsed.resolutions : []).forEach(item => {
        const source = byId.get(String(item?.id));
        const company = String(item?.company || "").trim();
        if (!source || Number(item?.confidence || 0) < .72 || !validResolvedCompany(company)) return;
        resolutions.push({
          id: source.id,
          company,
          source: provider.name || provider.model || "ai"
        });
        companyNameMappings[source.cacheKey] = company;
      });
      const entries = Object.entries(companyNameMappings);
      await chrome.storage.local.set({
        companyNameMappings: entries.length > 100
          ? Object.fromEntries(entries.slice(-100))
          : companyNameMappings
      });
    } catch {
      // 公司名识别失败不应阻断填写记录保存；管理页保留“公司待确认”。
    }
  }

  return { ok: true, resolutions };
}

async function aiMatchFields(message) {
  const { settings = {}, aiFieldMappings = {} } = await chrome.storage.local.get(["settings", "aiFieldMappings"]);
  if (!activeAiProviders(settings).length) return { error: "未配置启用的 AI 模型版本" };

  const fields = Array.isArray(message.fields) ? message.fields.slice(0, 120) : [];
  const candidates = Array.isArray(message.candidates) ? message.candidates.slice(0, 120) : [];
  if (!fields.length || !candidates.length) return { matches: [], source: "empty" };

  const signature = JSON.stringify({
    host: message.hostname || "",
    fields: fields.map(field => [
      field.label,
      field.component,
      field.id,
      field.name,
      field.autocomplete,
      field.placeholder,
      field.options
    ]),
    candidates: candidates.map(field => [field.key, field.aliases, Boolean(field.policy)])
  });
  const cacheKey = `${message.hostname || "unknown"}:${signature.length}:${signature.slice(0, 300)}`;
  if (aiFieldMappings[cacheKey]) {
    return { matches: aiFieldMappings[cacheKey], source: "cache" };
  }

  const prompt = `你是招聘网申表单字段映射器。根据网页字段的 label、placeholder、id、name、autocomplete、控件类型和候选项，将其映射到用户资料库中的标准字段。

安全与约束：
1. 输入不包含用户资料值，禁止推测或生成用户信息。
2. targetKey 只能从 candidates 提供的 key 中选择；无法确定时必须为 null。
3. 不要把“学校名称”映射为“学院”，不要把“实践描述/获奖描述/证书描述”混为工作描述。
4. 对任何敏感、合规或身份相关字段，只在候选列表明确提供且网页语义高度一致时匹配，不要根据国籍、学校或经历推断。
5. file 控件仅可映射到 resumeAttachment；不要把普通文本字段映射为 resumeAttachment。
6. key 以 rule: 开头的候选项是用户明确配置的固定回答规则。仅当网页问题语义与规则名称或别名一致时映射；不得自行推断答案。
7. 对“是否接受城市/工作地点调剂”应匹配对应调剂规则；对“是否有亲属在职”应匹配对应亲属规则，禁止混淆为搬迁意愿。
8. confidence 范围 0 到 1；语义不明确时低于 0.65。
9. 只返回 JSON，不要解释。

输出格式：
{"matches":[{"fieldId":"网页字段 id","targetKey":"候选 key 或 null","confidence":0.0,"reason":"简短理由"}]}

网页字段：
${JSON.stringify(fields)}

候选标准字段：
${JSON.stringify(candidates)}`;

  const { payload, provider } = await withAiFallback(settings, {
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "你只负责结构化字段映射，严格遵守候选 key 白名单。固定回答只能来自 rule: 规则，禁止推测用户事实或偏好。" },
      { role: "user", content: prompt }
    ]
  });
  const parsed = parseJsonContent(payload.choices?.[0]?.message?.content);
  const allowedKeys = new Set(candidates.map(candidate => candidate.key));
  const fieldIds = new Set(fields.map(field => field.fieldId));
  const matches = (Array.isArray(parsed.matches) ? parsed.matches : [])
    .filter(match => fieldIds.has(match.fieldId))
    .map(match => ({
      fieldId: match.fieldId,
      targetKey: allowedKeys.has(match.targetKey) ? match.targetKey : null,
      confidence: Math.max(0, Math.min(1, Number(match.confidence) || 0)),
      reason: String(match.reason || "").slice(0, 120)
    }));

  aiFieldMappings[cacheKey] = matches;
  const entries = Object.entries(aiFieldMappings);
  const trimmed = entries.length > 30 ? Object.fromEntries(entries.slice(-30)) : aiFieldMappings;
  await chrome.storage.local.set({ aiFieldMappings: trimmed });
  return { matches, source: provider.name || provider.model || "ai" };
}

function sendNativeMessage(payload) {
  return new Promise((resolve, reject) => {
    let port;
    let settled = false;
    let timer;

    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback(value);
      try {
        port?.disconnect();
      } catch {
        // The native host may already have closed the port.
      }
    };

    try {
      // A persistent port keeps the MV3 service worker alive while a mail sync
      // waits on IMAP and AI extraction.
      port = chrome.runtime.connectNative(MAIL_NATIVE_HOST);
    } catch (error) {
      reject(new Error(error.message || "本地桥接不可用"));
      return;
    }

    port.onMessage.addListener(response => {
      if (!response) {
        finish(reject, new Error("本地桥接没有返回结果"));
        return;
      }
      finish(resolve, response);
    });
    port.onDisconnect.addListener(() => {
      if (settled) return;
      const error = chrome.runtime.lastError;
      finish(reject, new Error(error?.message || "本地桥接连接已断开"));
    });
    timer = setTimeout(() => {
      finish(reject, new Error("本地桥接响应超时，请检查网络后重试"));
    }, NATIVE_MESSAGE_TIMEOUT_MS);
    port.postMessage(payload);
  });
}

async function scheduleMailSync(mailSettings = {}) {
  await chrome.alarms.clear(MAIL_ALARM);
  if (!mailSettings.autoSync) return;
  const periodInMinutes = Math.max(30, Number(mailSettings.syncIntervalMinutes) || 720);
  await chrome.alarms.create(MAIL_ALARM, { periodInMinutes });
}

function mailPayload(mailSettings, settings) {
  const providers = activeAiProviders(settings);
  const primary = providers[0] || {};
  return {
    action: "sync",
    pollIntervalMinutes: Number(mailSettings.syncIntervalMinutes) || 720,
    mail: {
      address: mailSettings.address,
      authCode: mailSettings.authCode,
      host: mailSettings.host || "imap.126.com",
      port: Number(mailSettings.port) || 993,
      folder: mailSettings.folder || "INBOX",
      lookbackHours: Number(mailSettings.lookbackHours) || 24
    },
    ai: {
      apiBase: primary.apiBase,
      apiKey: primary.apiKey,
      model: primary.model,
      providers: providers.map(provider => ({
        name: provider.name,
        apiBase: provider.apiBase,
        apiKey: provider.apiKey,
        model: provider.model
      })),
      timeoutSeconds: 60
    },
  };
}

function mergeMailHistory(existing, incoming) {
  const keyOf = item => item.taskKey || `message:${item.messageId}`;
  const merged = new Map((existing || []).map(item => [keyOf(item), item]));
  (incoming || []).forEach(item => {
    const previous = merged.get(keyOf(item));
    if (!previous) {
      merged.set(keyOf(item), item);
      return;
    }
    const next = { ...previous, ...item };
    ["company", "category", "deadline", "assessmentUrl", "customNote", "completedAt"].forEach(key => {
      if (item[key] == null && previous[key] != null) next[key] = previous[key];
    });
    if (["已完成", "已忽略", "已挂"].includes(previous.status)) next.status = previous.status;
    if (previous.companyLocked) {
      next.company = previous.company;
      next.companySource = "manual";
      next.companyLocked = true;
    }
    merged.set(keyOf(item), next);
  });
  return [...merged.values()]
    .sort((left, right) => Date.parse(right.receivedAt || 0) - Date.parse(left.receivedAt || 0))
    .slice(0, 300);
}

async function syncMail({ source = "manual" } = {}) {
  const { mailSettings = {}, settings = {}, mailHistory = [], mailCompanyAliases = {} } =
    await chrome.storage.local.get(["mailSettings", "settings", "mailHistory", "mailCompanyAliases"]);
  const startedAt = new Date().toISOString();
  await chrome.storage.local.set({
    mailSyncStatus: { state: "syncing", source, startedAt }
  });
  try {
    const response = await sendNativeMessage(mailPayload(mailSettings, settings));
    if (!response.ok) throw new Error(response.error || "邮件同步失败");
    const summary = response.summary || {};
    const details = (summary.details || []).map(item => {
      const alias = item.companyRaw && mailCompanyAliases[String(item.companyRaw).trim()];
      return alias && !item.companyLocked ? { ...item, company: alias, companySource: "manual", companyLocked: true, needsCompanyReview: false } : item;
    });
    const nextHistory = mergeMailHistory(mailHistory, details);
    const mailSyncStatus = {
      state: "success",
      source,
      startedAt,
      finishedAt: new Date().toISOString(),
      summary: {
         fetched: summary.fetched || 0,
        newTasks: summary.new_tasks || summary.newTasks || 0,
         duplicates: summary.duplicates || 0,
        irrelevant: summary.irrelevant || 0,
        alreadyProcessed: summary.already_processed || 0,
        needsReview: summary.needs_review || summary.needsCompanyReview || 0,
        failed: summary.failed || 0
      }
    };
    await chrome.storage.local.set({ mailHistory: nextHistory, mailSyncStatus });
    return { ok: true, summary: mailSyncStatus.summary, details };
  } catch (error) {
    const mailSyncStatus = {
      state: "error",
      source,
      startedAt,
      finishedAt: new Date().toISOString(),
      error: error.message || "邮件同步失败"
    };
    await chrome.storage.local.set({ mailSyncStatus });
    throw error;
  }
}

chrome.runtime.onStartup.addListener(async () => {
  const { mailSettings = {} } = await chrome.storage.local.get(["mailSettings"]);
  await scheduleMailSync(mailSettings);
  await chrome.alarms.clear(DATA_SYNC_ALARM);
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === MAIL_ALARM) syncMail({ source: "alarm" }).catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "OPEN_OPTIONS") {
    chrome.runtime.openOptionsPage();
    return;
  }
  if (message.type === "OPEN_MAIL") {
    chrome.tabs.create({ url: chrome.runtime.getURL("options.html#mail") });
    return;
  }
  if (message.type === "MAIL_PING") {
    sendNativeMessage({ action: "ping" })
      .then(sendResponse)
      .catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message.type === "MAIL_SYNC") {
    syncMail({ source: "manual" })
      .then(sendResponse)
      .catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message.type === "MAIL_SETTINGS_CHANGED") {
    scheduleMailSync(message.mailSettings || {})
      .then(() => sendResponse({ ok: true }))
      .catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message.type === "DATA_SYNC_SETTINGS_CHANGED") {
    chrome.alarms.clear(DATA_SYNC_ALARM)
      .then(() => sendResponse({ ok: true }))
      .catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message.type === "MAIL_RETRY_REVIEW") {
    sendNativeMessage({ action: "retryReview" })
      .then(sendResponse)
      .catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message.type === "MAIL_IMPORT_LOCAL_CONFIG") {
    sendNativeMessage({ action: "localConfig" })
      .then(sendResponse)
      .catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message.type === "RESOLVE_COMPANIES") {
    resolveCompanyNames(message)
      .then(sendResponse)
      .catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message.type === "AI_MATCH_FIELDS") {
    aiMatchFields(message)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message || "AI 字段匹配失败" }));
    return true;
  }
});
