const defaultAiRules = [];

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get(null);
  const payload = { seedVersion: 4 };
  const arrayKeys = [
    "education", "profiles", "projects", "awards", "languages", "skills",
    "certificates", "family", "papers", "portfolio", "customFields", "fillHistory"
  ];
  if (!current.personal) payload.personal = {};
  arrayKeys.forEach(key => {
    if (!Array.isArray(current[key])) payload[key] = [];
  });
  if (current.activeProfileId == null) payload.activeProfileId = "";
  if (current.hobbies == null) payload.hobbies = "";

  const settings = {
    high: .9,
    medium: .7,
    overwrite: false,
    apiConfigured: false,
    ...(current.settings || {})
  };
  if (!Array.isArray(settings.aiRules)) settings.aiRules = defaultAiRules;
  payload.settings = settings;
  await chrome.storage.local.set(payload);
});

function chatEndpoint(apiBase) {
  const base = String(apiBase || "https://api.deepseek.com").trim().replace(/\/+$/, "");
  return /\/chat\/completions$/i.test(base) ? base : `${base}/chat/completions`;
}

function parseJsonContent(content) {
  const source = String(content || "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI 返回内容不是有效 JSON");
  return JSON.parse(source.slice(start, end + 1));
}

async function aiMatchFields(message) {
  const { settings = {}, aiFieldMappings = {} } = await chrome.storage.local.get(["settings", "aiFieldMappings"]);
  if (!settings.apiKey) return { error: "未配置 AI API Key" };

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

  const response = await fetch(chatEndpoint(settings.apiBase), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.model || "deepseek-chat",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "你只负责结构化字段映射，严格遵守候选 key 白名单。固定回答只能来自 rule: 规则，禁止推测用户事实或偏好。" },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AI 字段匹配请求失败（${response.status}）：${body.slice(0, 160)}`);
  }
  const payload = await response.json();
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
  return { matches, source: "deepseek" };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "OPEN_OPTIONS") {
    chrome.runtime.openOptionsPage();
    return;
  }
  if (message.type === "AI_MATCH_FIELDS") {
    aiMatchFields(message)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message || "AI 字段匹配失败" }));
    return true;
  }
});
