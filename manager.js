const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function safe(value) {
  const node = document.createElement("div");
  node.textContent = value ?? "";
  return node.innerHTML;
}

function safeAttr(value) {
  return safe(value).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// 轻量 toast：替代串联 alert，避免打断向导式的“保存即验证即回写”流程。
let toastTimer = null;
function toast(text, tone = "info") {
  let host = document.getElementById("toastHost");
  if (!host) {
    host = document.createElement("div");
    host.id = "toastHost";
    host.className = "toast-host";
    document.body.appendChild(host);
  }
  host.className = `toast-host ${tone}`;
  host.textContent = text;
  host.classList.add("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => host.classList.remove("show"), tone === "error" ? 5200 : 3200);
}

function normalizeAiProviders(settings = {}) {
  const providers = Array.isArray(settings.aiProviders) ? settings.aiProviders : [];
  const normalized = providers
    .map((provider, index) => ({
      id: provider.id || crypto.randomUUID(),
      name: String(provider.name || provider.model || `模型 ${index + 1}`).trim(),
      apiBase: String(provider.apiBase || "").trim(),
      model: String(provider.model || "").trim(),
      apiKey: String(provider.apiKey || "").trim(),
      enabled: provider.enabled !== false,
      order: Number.isFinite(Number(provider.order)) ? Number(provider.order) : index
    }))
    .filter(provider => provider.apiBase || provider.model || provider.apiKey);

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

  return normalized
    .sort((left, right) => left.order - right.order)
    .map((provider, index) => ({ ...provider, order: index }));
}

function activeAiProviders(settings = db.settings || {}) {
  return normalizeAiProviders(settings)
    .filter(provider => provider.enabled && provider.apiBase && provider.model && provider.apiKey);
}

function isAiConfigured(settings = db.settings || {}) {
  return activeAiProviders(settings).length > 0;
}

const schemas = {
  education: [
    ["school", "学校"], ["college", "学院"], ["major", "专业"], ["level", "学历"],
    ["degree", "学位"], ["type", "学习形式"], ["start", "开始时间"], ["end", "结束时间"],
    ["current", "是否至今"], ["doubleDegree", "是否双学位"], ["mba", "是否MBA"],
    ["city", "学校所在城市"],
    ["gpa", "GPA"], ["rank", "专业排名"], ["courses", "专业课程"], ["research", "研究方向"],
    ["thesis", "毕业论文"], ["mentor", "导师"]
  ],
  projects: [
    ["name", "项目名称"], ["role", "职位/角色"], ["start", "开始时间"], ["end", "结束时间"],
    ["current", "是否至今"],
    ["content", "项目内容"], ["duty", "本人职责"], ["result", "项目成果"], ["link", "项目链接"]
  ],
  awards: [
    ["name", "奖励名称"], ["date", "获奖时间"], ["level", "奖励等级"],
    ["issuer", "授予单位"], ["description", "奖励描述"]
  ],
  languages: [
    ["language", "语种"], ["exam", "考试/水平"], ["score", "成绩"], ["proficiency", "掌握程度"],
    ["speaking", "听说能力"], ["writing", "读写能力"]
  ],
  skills: [["name", "技能名称"], ["level", "掌握程度"], ["years", "使用年限"], ["description", "技能说明"]],
  certificates: [
    ["name", "证书名称"], ["level", "级别"], ["date", "获得时间"],
    ["issuer", "颁发机构"], ["description", "说明"]
  ],
  family: [["name", "姓名"], ["relation", "关系"], ["phone", "电话"], ["company", "公司"], ["position", "职位"], ["politics", "政治面貌"]],
  papers: [
    ["name", "论文名称"], ["date", "发表时间"], ["journal", "刊物名称"], ["level", "刊物层级"],
    ["authorOrder", "作者顺序"], ["factor", "影响因子"], ["description", "描述"], ["link", "链接"]
  ],
  portfolio: [["name", "作品名称"], ["type", "作品类型"], ["link", "作品链接"], ["description", "描述"]]
};

const basicGroups = [
  {
    title: "身份与联系方式",
    fields: [
      ["name", "姓名"], ["englishName", "英文姓名"], ["gender", "性别"], ["birthDate", "出生日期"],
      ["age", "年龄"], ["nationality", "国家/地区"], ["ethnicity", "民族"], ["politics", "政治面貌"],
      ["maritalStatus", "婚姻状况"], ["health", "健康状况"], ["height", "身高"], ["weight", "体重"],
      ["phone", "手机号"],
      ["email", "邮箱"], ["wechat", "微信"], ["qq", "QQ"]
    ]
  },
  {
    title: "地址与证件",
    fields: [
      ["country", "居住国家"], ["province", "省/州"], ["currentCity", "当前居住地"], ["city", "城市"],
      ["address", "通信地址"], ["postalCode", "邮政编码"], ["nativePlace", "籍贯"], ["birthplace", "生源地"],
      ["household", "户籍所在地"], ["identityType", "证件类型"], ["identityNumber", "证件号码"],
      ["emergencyContactName", "紧急联系人姓名"], ["emergencyContactRelation", "紧急联系人关系"],
      ["emergencyContactPhone", "紧急联系人电话"]
    ]
  },
  {
    title: "校招身份",
    fields: [
      ["graduationYear", "毕业年份"], ["graduationDate", "预计毕业日期"],
      ["overseasExperience", "是否有海外经历"], ["internshipStartDate", "可开始实习时间"],
      ["internshipDuration", "可实习时长"], ["availableDays", "每周可实习天数"]
    ]
  },
  {
    title: "求职偏好",
    fields: [
      ["expectedRole", "期望岗位"], ["targetIndustry", "期望行业"], ["targetFunction", "期望职能"],
      ["expectedCity", "期望工作城市"], ["jobType", "岗位类型"],
      ["availableDate", "可入职时间"],
      ["latestCompany", "最近公司"], ["currentPosition", "当前职位"], ["currentDepartment", "当前部门"],
      ["willingRelocate", "是否接受异地"]
    ]
  },
  {
    title: "招聘网站常见问答",
    fields: [
      ["drivingLicense", "是否有驾驶证"], ["recruitmentSource", "招聘信息来源"], ["specialty", "个人特长"],
      ["relativesAtCompany", "是否有亲属在职"]
    ]
  },
  {
    title: "链接与作品",
    fields: [
      ["linkedin", "LinkedIn"], ["github", "GitHub"], ["personalWebsite", "个人网站"],
      ["portfolioUrl", "作品集链接"]
    ]
  }
];

const basicFields = basicGroups.flatMap(group => group.fields);

const defaultAiRules = [];

let db = {};
let modalCtx = null;
let openedVersionId = null;
let parsedDraft = null;
let mailNoteTimer = null;
let mailCalendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let mailSelectedDateKey = localDateKey(new Date());
let mailAgendaExpanded = false;

function activateTab(tab) {
  $$("#nav button").forEach(button => button.classList.toggle("active", button.dataset.tab === tab));
  $$(".section").forEach(section => section.classList.toggle("active", section.id === tab));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$$("#nav button").forEach(button => {
  button.addEventListener("click", () => activateTab(button.dataset.tab));
});

function setSidebarCollapsed(collapsed) {
  $("#appShell").classList.toggle("sidebar-collapsed", collapsed);
  $("#sidebarToggle").setAttribute("aria-label", collapsed ? "展开侧栏" : "折叠侧栏");
  $("#sidebarToggle").title = collapsed ? "展开侧栏" : "折叠侧栏";
  localStorage.setItem("jianfill.sidebarCollapsed", String(collapsed));
}

$("#sidebarToggle").addEventListener("click", () => {
  setSidebarCollapsed(!$("#appShell").classList.contains("sidebar-collapsed"));
});
setSidebarCollapsed(localStorage.getItem("jianfill.sidebarCollapsed") === "true");

$$("[data-scroll]").forEach(button => {
  button.addEventListener("click", () => {
    const nav = button.closest(".anchor-nav");
    nav.querySelectorAll("button").forEach(item => item.classList.toggle("active", item === button));
    document.getElementById(button.dataset.scroll)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

async function init() {
  db = await chrome.storage.local.get(null);
  const history = db.fillHistory || [];
  db.fillHistory = dedupeLatestHistory(history);
  if (db.fillHistory.length !== history.length) {
    await chrome.storage.local.set({ fillHistory: db.fillHistory });
  }
  db.profiles = db.profiles || [];
  db.customFields = db.customFields || [];
  db.mailHistory = db.mailHistory || [];
  const repairedMail = repairKnownMailCompanies(db.mailHistory);
  db.mailHistory = repairedMail.history;
  db.mailCompanyAliases = db.mailCompanyAliases || {};
  if (repairedMail.changed) await chrome.storage.local.set({ mailHistory: db.mailHistory });
  const legacyCalendarNotes = db.mailCalendarNotes || {};
  const hasStoredCalendarTodos = Boolean(db.mailCalendarTodos);
  db.mailCalendarTodos = db.mailCalendarTodos && typeof db.mailCalendarTodos === "object"
    ? db.mailCalendarTodos
    : {};
  if (!hasStoredCalendarTodos && Object.keys(legacyCalendarNotes).length) {
    Object.entries(legacyCalendarNotes).forEach(([dateKey, text]) => {
      const value = String(text || "").trim();
      if (!value) return;
      db.mailCalendarTodos[dateKey] = [{ id: mailCalendarTodoId(), text: value, completed: false }];
    });
    db.mailCalendarNotes = {};
    await chrome.storage.local.set({ mailCalendarTodos: db.mailCalendarTodos, mailCalendarNotes: {} });
  }
  db.mailViewPreference = "board";
  Object.keys(schemas).forEach(type => {
    db[type] = db[type] || [];
  });

  const localConfigResult = await importLocalConfig();

  renderBasic();
  renderAvatar();
  renderCustomFields();
  Object.keys(schemas).forEach(renderList);
  renderVersions();
  renderHistoryFilters();
  renderHistory();
  renderMailSettings();
  await disableLegacyDataSync();
  if (localConfigResult?.ok && $("#localConfigStatus")) {
    $("#localConfigStatus").dataset.touched = "1";
    $("#localConfigStatus").textContent = "已从本地 .env 导入邮件和模型配置。";
  }
  renderMailDashboard();

  $("#hobbiesText").value = db.hobbies || "";
  const settings = db.settings || {};
  settings.aiProviders = normalizeAiProviders(settings);
  settings.apiConfigured = isAiConfigured(settings);
  db.settings = settings;
  await chrome.storage.local.set({ settings });
  if (!Array.isArray(settings.aiRules)) {
    settings.aiRules = defaultAiRules.map(rule => ({ ...rule }));
    db.settings = settings;
    await chrome.storage.local.set({ settings });
  }
  renderAiProviders();
  renderAiRules();
  refreshHistoryCompanyNames().catch(() => {});

  const requestedTab = location.hash.replace(/^#/, "");
  if (requestedTab && document.getElementById(requestedTab)) activateTab(requestedTab);
}

function orderedProviders(providers) {
  return providers.map((provider, index) => ({ ...provider, order: index }));
}

async function importLocalConfig({ force = false } = {}) {
  try {
    let result;
    try {
      const response = await fetch(chrome.runtime.getURL("native-host/local-config.json"), {
        cache: "no-store"
      });
      if (!response.ok) throw new Error(`本地配置文件不可用 (${response.status})`);
      result = await response.json();
    } catch (fileError) {
      result = await chrome.runtime.sendMessage({ type: "MAIL_IMPORT_LOCAL_CONFIG" });
      if (!result?.ok && fileError?.message) {
        result = {
          ...result,
          error: `${fileError.message}；${result?.error || "本地桥接未返回配置"}`
        };
      }
    }
    if (!result?.ok) {
      return { ok: false, error: result?.error || "未读取到本地配置" };
    }
    db.settings = db.settings || {};
    const hasMailSettings = Boolean(db.mailSettings?.address && db.mailSettings?.authCode);
    if (result.mailSettings && (force || !hasMailSettings)) {
      db.mailSettings = {
        ...mailSettingsDefaults(),
        ...(db.mailSettings || {}),
        ...result.mailSettings
      };
    }
    if (result.aiProvider?.apiBase && result.aiProvider?.model && result.aiProvider?.apiKey) {
      const current = normalizeAiProviders(db.settings || {});
      const rest = current.filter(provider => provider.id !== result.aiProvider.id);
      const shouldImportProvider = force || !current.some(provider => provider.id === result.aiProvider.id);
      db.settings = {
        ...(db.settings || {}),
        aiProviders: shouldImportProvider
          ? orderedProviders([result.aiProvider, ...rest].map(provider => ({
            ...provider,
            enabled: provider.enabled !== false
          })))
          : current
      };
    }
    await chrome.storage.local.set({
      mailSettings: db.mailSettings,
      settings: db.settings
    });
    return {
      ok: true,
      mail: Boolean(result.mailSettings?.address),
      ai: Boolean(result.aiProvider?.apiKey)
    };
  } catch (error) {
    return { ok: false, error: error.message || "本地桥接未安装" };
  }
}

function renderBasic() {
  const personal = db.personal || {};
  $("#basicForm").innerHTML = basicGroups.map(group => `
    <div class="field-group-title full-span">${safe(group.title)}</div>
    ${group.fields.map(([key, label, type]) => `
      <div class="field ${type === "textarea" ? "full-span" : ""}">
        <label>${label}</label>
        ${type === "textarea"
          ? `<textarea data-basic="${key}" rows="4">${safe(personal[key])}</textarea>`
          : `<input data-basic="${key}" value="${safe(personal[key])}">`}
      </div>
    `).join("")}
  `).join("");
}

function renderAvatar() {
  const avatar = db.personal?.avatarFile;
  $("#avatarPanel").innerHTML = `
    <div class="avatar-panel">
      <div class="avatar-preview">
        ${avatar?.dataUrl ? `<img src="${safeAttr(avatar.dataUrl)}" alt="头像预览">` : "<span>暂无头像</span>"}
      </div>
      <div class="avatar-meta">
        <strong>${safe(avatar?.name || "未上传头像")}</strong>
        <small>支持 JPG、PNG、WebP，建议证件照比例，文件不超过 2.5MB。保存后会用于匹配招聘网站中的头像、照片、证件照上传控件。</small>
        <div class="avatar-actions">
          <label class="btn secondary" for="avatarFileInput">选择头像</label>
          <input id="avatarFileInput" type="file" accept="image/jpeg,image/png,image/webp">
          <span class="muted">${avatar?.updatedAt ? `更新于 ${safe(new Date(avatar.updatedAt).toLocaleString())}` : "数据仅保存在本机"}</span>
        </div>
      </div>
    </div>
  `;
  $("#avatarFileInput").addEventListener("change", saveAvatarFile);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
}

const MAX_RESUME_FILE_SIZE = 5 * 1024 * 1024;
const RESUME_FILE_ACCEPT = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function validateResumeFile(file) {
  if (!file) throw new Error("请选择简历附件");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!["pdf", "doc", "docx"].includes(extension)) {
    throw new Error("简历附件仅支持 PDF、DOC 或 DOCX");
  }
  if (file.size > MAX_RESUME_FILE_SIZE) {
    throw new Error("简历附件不能超过 5MB");
  }
}

async function serializeResumeFile(file) {
  validateResumeFile(file);
  return {
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    dataUrl: await readFileAsDataUrl(file),
    updatedAt: new Date().toISOString()
  };
}

function profileResumeFileName(profile) {
  return profile?.resumeFile?.name ||
    profile?.attachment?.name ||
    (typeof profile?.attachment === "string" ? profile.attachment : "") ||
    profile?.resumePath || "";
}

async function saveAvatarFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    alert("头像仅支持 JPG、PNG 或 WebP");
    event.target.value = "";
    return;
  }
  if (file.size > 2.5 * 1024 * 1024) {
    alert("头像文件超过 2.5MB，请先压缩后再上传");
    event.target.value = "";
    return;
  }
  const dataUrl = await readFileAsDataUrl(file);
  db.personal = db.personal || {};
  db.personal.avatarFile = {
    name: file.name,
    type: file.type,
    size: file.size,
    dataUrl,
    updatedAt: new Date().toISOString()
  };
  await chrome.storage.local.set({ personal: db.personal });
  renderAvatar();
  alert("头像已保存");
}

$("#saveBasic").addEventListener("click", async () => {
  db.personal = db.personal || {};
  $$("[data-basic]").forEach(input => {
    db.personal[input.dataset.basic] = input.value.trim();
  });
  await chrome.storage.local.set({ personal: db.personal });
  alert("个人资料已保存");
});

$("#removeAvatar").addEventListener("click", async () => {
  if (!db.personal?.avatarFile) return;
  if (!confirm("确认移除已保存头像？")) return;
  delete db.personal.avatarFile;
  await chrome.storage.local.set({ personal: db.personal });
  renderAvatar();
});

function renderCustomFields() {
  const box = $("#customFieldList");
  const rows = db.customFields || [];
  box.innerHTML = rows.length ? rows.map((field, index) => `
    <div class="record-card">
      <div class="record-title">
        <div>
          <strong>${safe(field.label)}</strong>
          <div class="record-body">${safe(field.value)}</div>
          <div class="muted">网页别名：${safe(field.aliases || "未设置")}</div>
        </div>
        <div class="record-actions">
          <button class="btn ghost small" data-custom-edit="${index}">编辑</button>
          <button class="btn ghost small danger-btn" data-custom-delete="${index}">删除</button>
        </div>
      </div>
    </div>
  `).join("") : '<div class="empty">暂无自定义字段，可添加招聘网站中的特殊字段</div>';

  $$("[data-custom-edit]").forEach(button => {
    button.onclick = () => openCustomField(Number(button.dataset.customEdit));
  });
  $$("[data-custom-delete]").forEach(button => {
    button.onclick = async () => {
      const index = Number(button.dataset.customDelete);
      if (!confirm(`确认删除自定义字段“${db.customFields[index].label}”？`)) return;
      db.customFields.splice(index, 1);
      await chrome.storage.local.set({ customFields: db.customFields });
      renderCustomFields();
    };
  });
}

function openCustomField(index = -1) {
  const field = index < 0 ? {} : db.customFields[index];
  $("#modalBody").innerHTML = `
    <div class="section-title">${index < 0 ? "添加" : "编辑"}自定义字段</div>
    <div class="modal-grid">
      <div class="field"><label>字段名称</label><input id="customLabel" value="${safe(field.label)}" placeholder="例如：紧急联系人邮箱"></div>
      <div class="field"><label>字段值</label><input id="customValue" value="${safe(field.value)}" placeholder="网页填写时使用的内容"></div>
      <div class="field full-span"><label>网页别名</label><textarea id="customAliases" rows="3" placeholder="多个别名用逗号分隔，例如：联系人邮箱、备用邮箱">${safe(field.aliases)}</textarea><div class="bullet-hint">字段名称本身也会参与匹配；别名用于兼容不同网站的叫法。</div></div>
    </div>
    <div class="row"><button class="btn ghost" id="cancelModal">取消</button><button class="btn primary" id="saveCustomField">保存</button></div>
  `;
  openModal();
  $("#saveCustomField").onclick = async () => {
    const label = $("#customLabel").value.trim();
    if (!label) return $("#customLabel").focus();
    const record = {
      id: field.id || crypto.randomUUID(),
      label,
      value: $("#customValue").value.trim(),
      aliases: $("#customAliases").value.trim()
    };
    if (index < 0) db.customFields.push(record);
    else db.customFields[index] = record;
    await chrome.storage.local.set({ customFields: db.customFields });
    closeModal();
    renderCustomFields();
  };
}

$("#addCustomField").addEventListener("click", () => openCustomField());

function titleFor(type, record) {
  if (type === "education") return `${record.level || ""}｜${record.school || "未填写学校"}｜${record.major || ""}`;
  if (type === "languages") return `${record.language || ""}｜${record.exam || ""}`;
  if (type === "family") return `${record.name || ""}｜${record.relation || ""}`;
  return record.name;
}

function summaryFor(type, record) {
  if (type === "education") return `${record.start || ""} - ${record.end || ""}｜${record.type || ""}｜GPA ${record.gpa || "未填"}`;
  if (type === "projects") return record.content || record.duty || "";
  if (type === "papers") return `${record.journal || ""}｜${record.description || ""}`;
  return Object.values(record).filter(Boolean).slice(1, 4).join("｜");
}

function educationRank(record) {
  const value = `${record.level || ""} ${record.degree || ""}`.toLocaleLowerCase("zh-CN");
  const ranks = [
    [/博士|doctor|phd/, 5],
    [/硕士|研究生|master/, 4],
    [/本科|学士|bachelor/, 3],
    [/大专|专科|associate/, 2],
    [/高中|中专|highschool/, 1]
  ];
  return ranks.find(([pattern]) => pattern.test(value))?.[1] || 0;
}

function highestEducationIndex(rows) {
  let highestIndex = -1;
  let highestRank = -1;
  rows.forEach((record, index) => {
    const rank = educationRank(record);
    if (rank > highestRank) {
      highestRank = rank;
      highestIndex = index;
    }
  });
  return highestIndex;
}

function renderList(type) {
  const box = $(`#${type}List`);
  if (!box) return;
  const rows = db[type] || [];
  const highestIndex = type === "education" ? highestEducationIndex(rows) : -1;
  box.innerHTML = rows.length ? rows.map((record, index) => `
    <div class="record-card">
      <div class="record-title">
        <strong>
          ${safe(titleFor(type, record) || "未命名记录")}
          ${index === highestIndex ? '<span class="field-chip matched">最高学历</span>' : ""}
        </strong>
        <div class="record-actions">
          <button class="btn ghost small" data-edit="${type}:${index}">编辑</button>
          <button class="btn ghost small" data-copy="${type}:${index}">复制</button>
          <button class="btn ghost small danger-btn" data-del="${type}:${index}">删除</button>
        </div>
      </div>
      <div class="record-body">${safe(summaryFor(type, record))}</div>
    </div>
  `).join("") : '<div class="empty">暂无记录，点击右上角添加</div>';
  bindRecordActions();
}

function bindRecordActions() {
  $$("[data-edit]").forEach(button => {
    button.onclick = () => {
      const [type, index] = button.dataset.edit.split(":");
      openRecord(type, Number(index));
    };
  });
  $$("[data-copy]").forEach(button => {
    button.onclick = async () => {
      const [type, index] = button.dataset.copy.split(":");
      db[type].splice(Number(index) + 1, 0, { ...db[type][Number(index)] });
      await saveType(type);
    };
  });
  $$("[data-del]").forEach(button => {
    button.onclick = async () => {
      const [type, index] = button.dataset.del.split(":");
      if (!confirm("确认删除这条记录？")) return;
      db[type].splice(Number(index), 1);
      await saveType(type);
    };
  });
}

$$("[data-add]").forEach(button => {
  button.addEventListener("click", () => openRecord(button.dataset.add, -1));
});

function openRecord(type, index) {
  modalCtx = { type, index };
  const record = index < 0 ? {} : db[type][index];
  const longFields = ["content", "duty", "result", "description", "courses"];
  const yesNoFields = new Set(["doubleDegree", "mba"]);
  $("#modalBody").innerHTML = `
    <div class="section-title">${index < 0 ? "添加" : "编辑"}记录</div>
    <div class="modal-grid">
      ${schemas[type].map(([key, label]) => `
        <div class="field ${longFields.includes(key) ? "full-span" : ""}">
          <label>${label}</label>
          ${longFields.includes(key)
            ? `<textarea data-field="${key}" rows="4">${safe(record[key])}</textarea>`
            : yesNoFields.has(key)
              ? `<select data-field="${key}"><option value="">请选择</option><option value="是" ${record[key] === "是" ? "selected" : ""}>是</option><option value="否" ${record[key] === "否" ? "selected" : ""}>否</option></select>`
              : `<input data-field="${key}" value="${safe(record[key])}">`}
        </div>
      `).join("")}
    </div>
    <div class="row">
      <button class="btn ghost" id="cancelModal">取消</button>
      <button class="btn primary" id="saveModal">保存</button>
    </div>
  `;
  openModal();
  $("#saveModal").onclick = saveModal;
}

function openModal() {
  $("#modal").classList.add("open");
  $("#cancelModal").onclick = closeModal;
}

function closeModal() {
  $("#modal").classList.remove("open");
}

$("#modal").addEventListener("click", event => {
  if (event.target.id === "modal") closeModal();
});

async function saveModal() {
  const record = {};
  $$("[data-field]").forEach(input => {
    record[input.dataset.field] = input.value.trim();
  });
  const { type, index } = modalCtx;
  if (index < 0) db[type].push(record);
  else db[type][index] = record;
  await saveType(type);
  closeModal();
}

async function saveType(type) {
  await chrome.storage.local.set({ [type]: db[type] });
  renderList(type);
}

function renderVersions() {
  const box = $("#versionList");
  if (!db.profiles.length) {
    box.innerHTML = '<div class="empty">暂无简历版本，请新建空白版本或导入简历</div>';
    return;
  }

  box.innerHTML = db.profiles.map(profile => {
    const isDefault = profile.id === db.activeProfileId;
    return `
      <div class="record-card">
        <div class="record-title">
          <div>
            <strong>${safe(profile.name)} ${isDefault ? '<span class="field-chip matched">默认</span>' : ""}</strong>
          </div>
          <div class="record-actions">
            ${isDefault ? "" : `<button class="btn ghost small" data-default-version="${profile.id}">设为默认</button>`}
            <button class="btn primary small" data-open-version="${profile.id}">${openedVersionId === profile.id ? "收起" : "编辑"}</button>
            <button class="btn ghost small" data-copy-version="${profile.id}">复制</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  $$("[data-open-version]").forEach(button => {
    button.onclick = () => toggleVersion(button.dataset.openVersion);
  });
  $$("[data-default-version]").forEach(button => {
    button.onclick = () => setDefaultVersion(button.dataset.defaultVersion);
  });
  $$("[data-copy-version]").forEach(button => {
    button.onclick = () => copyVersion(button.dataset.copyVersion);
  });
}

function toggleVersion(id) {
  if (openedVersionId === id) {
    openedVersionId = null;
    $("#versionEditor").innerHTML = "";
    renderVersions();
    return;
  }
  openedVersionId = id;
  openVersion(id);
  renderVersions();
}

function openVersion(id) {
  const profile = db.profiles.find(item => item.id === id);
  if (!profile) return;
  $("#versionEditor").innerHTML = `
    <div class="version-editor">
      <div class="surface-head">
        <div><h2>${safe(profile.name)}</h2></div>
        <div class="head-actions"><button class="btn secondary" id="collapseVersion">收起</button><button class="btn primary" id="addWork">添加经历</button></div>
      </div>
      <div class="form-grid">
        <div class="field"><label>简历版本命名</label><input id="vName" value="${safe(profile.name)}"></div>
        <div class="field version-file-field">
          <label>简历附件</label>
          <div class="resume-file-binding">
            <div class="resume-file-copy">
              <strong>${safe(profileResumeFileName(profile) || "尚未绑定本地文件")}</strong>
              <small>${profile.resumeFile?.size
                ? `${(profile.resumeFile.size / 1024 / 1024).toFixed(2)} MB · 仅保存在本机`
                : "选择 PDF、DOC 或 DOCX 后，可自动上传到招聘网站的简历附件控件"}</small>
            </div>
            <div class="resume-file-actions">
              <label class="btn secondary" for="vResumeFile">选择文件</label>
              <input id="vResumeFile" type="file" accept="${RESUME_FILE_ACCEPT}">
              ${profile.resumeFile ? '<button class="btn ghost danger-btn" id="removeResumeFile">移除</button>' : ""}
            </div>
          </div>
        </div>
      </div>
      <div id="workList"></div>
      <div class="version-summary">
        <div class="section-kicker">自我评价</div>
        <textarea id="vSummary" rows="4" placeholder="填写该版本专属的自我评价">${safe(profile.summary)}</textarea>
      </div>
      <div class="settings-actions"><button class="btn ghost danger-btn" id="deleteVersionFromEditor">删除版本</button><button class="btn primary" id="saveVersionBase">保存版本</button></div>
    </div>
  `;
  renderWork(profile);
  $("#collapseVersion").onclick = () => toggleVersion(id);
  $("#addWork").onclick = () => openWork(id, -1);
  $("#vResumeFile").onchange = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const previous = {
      resumeFile: profile.resumeFile,
      attachment: profile.attachment,
      resumePath: profile.resumePath
    };
    try {
      profile.resumeFile = await serializeResumeFile(file);
      profile.attachment = file.name;
      profile.resumePath = file.name;
      await saveProfiles();
      openVersion(id);
      toast("简历附件已绑定", "success");
    } catch (error) {
      profile.resumeFile = previous.resumeFile;
      profile.attachment = previous.attachment;
      profile.resumePath = previous.resumePath;
      event.target.value = "";
      toast(error.message || "简历附件读取失败", "error");
    }
  };
  if ($("#removeResumeFile")) {
    $("#removeResumeFile").onclick = async () => {
      if (!confirm("确认移除该版本绑定的简历附件？")) return;
      delete profile.resumeFile;
      profile.attachment = "";
      profile.resumePath = "";
      await saveProfiles();
      openVersion(id);
      toast("简历附件已移除");
    };
  }
  $("#deleteVersionFromEditor").onclick = () => deleteVersion(id);
  $("#saveVersionBase").onclick = async () => {
    const name = $("#vName").value.trim();
    if (!name) return $("#vName").focus();
    profile.name = name;
    profile.summary = $("#vSummary").value.trim();
    await saveProfiles();
    openVersion(id);
    alert("简历版本已保存");
  };
}

function renderWork(profile) {
  $("#workList").innerHTML = (profile.work || []).map((work, index) => `
    <div class="record-card">
      <div class="record-title">
        <strong>${safe(work.company)}｜${safe(work.department)}｜${safe(work.position)}</strong>
        <div class="record-actions">
          <button class="btn ghost small" data-work-edit="${profile.id}:${index}">编辑</button>
          <button class="btn ghost small danger-btn" data-work-del="${profile.id}:${index}">删除</button>
        </div>
      </div>
      <div class="muted">${safe(work.type)}｜${safe(work.start)} - ${safe(work.end)}${work.city ? `｜${safe(work.city)}` : ""}</div>
      <div class="work-description"><b>工作内容</b>\n${safe(work.description)}</div>
    </div>
  `).join("") || '<div class="empty">暂无实习经历</div>';

  $$("[data-work-edit]").forEach(button => {
    button.onclick = () => {
      const [id, index] = button.dataset.workEdit.split(":");
      openWork(id, Number(index));
    };
  });
  $$("[data-work-del]").forEach(button => {
    button.onclick = async () => {
      const [id, index] = button.dataset.workDel.split(":");
      const target = db.profiles.find(item => item.id === id);
      if (!confirm("确认删除这段实习经历？")) return;
      target.work.splice(Number(index), 1);
      await saveProfiles();
      openVersion(id);
    };
  });
}

function openWork(id, index) {
  const profile = db.profiles.find(item => item.id === id);
  const work = index < 0 ? {} : profile.work[index];
  const fields = [
    ["company", "公司"], ["department", "部门"], ["position", "职位"], ["type", "类型"],
    ["city", "城市"], ["start", "开始时间"], ["end", "结束时间"], ["description", "工作内容"]
  ];
  modalCtx = { profileId: id, workIndex: index };
  $("#modalBody").innerHTML = `
    <div class="section-title">${index < 0 ? "添加" : "编辑"}实习经历</div>
    <div class="modal-grid">
      ${fields.map(([key, label]) => `
        <div class="field ${key === "description" ? "full-span" : ""}">
          <label>${label}</label>
          ${key === "description"
            ? `<textarea data-work="${key}" rows="9" placeholder="每条职责或成果单独一行">${safe(work[key])}</textarea>`
            : `<input data-work="${key}" value="${safe(work[key])}">`}
        </div>
      `).join("")}
    </div>
    <div class="row">
      <button class="btn ghost" id="cancelModal">取消</button>
      <button class="btn primary" id="saveWork">保存</button>
    </div>
  `;
  openModal();
  $("#saveWork").onclick = async () => {
    const record = {};
    $$("[data-work]").forEach(input => {
      record[input.dataset.work] = input.value.trim();
    });
    record.bullets = splitBulletLines(record.description);
    profile.work = profile.work || [];
    if (index < 0) profile.work.push(record);
    else profile.work[index] = record;
    await saveProfiles();
    closeModal();
    openVersion(id);
  };
}

async function saveProfiles() {
  await chrome.storage.local.set({ profiles: db.profiles, activeProfileId: db.activeProfileId });
  renderVersions();
}

function openCreateVersion() {
  $("#modalBody").innerHTML = `
    <div class="section-title">新建空白版本</div>
    <div class="modal-grid">
      <div class="field full-span"><label>简历版本命名</label><input id="newVersionName" placeholder="例如：互联网产品简历"></div>
      <div class="field full-span"><label>简历附件（可选）</label><input id="newVersionFile" type="file" accept="${RESUME_FILE_ACCEPT}"></div>
    </div>
    <div class="row">
      <button class="btn ghost" id="cancelModal">取消</button>
      <button class="btn primary" id="saveNewVersion">创建版本</button>
    </div>
  `;
  openModal();
  $("#saveNewVersion").onclick = async () => {
    const name = $("#newVersionName").value.trim();
    if (!name) return $("#newVersionName").focus();
    const file = $("#newVersionFile").files?.[0];
    let resumeFile = null;
    try {
      if (file) resumeFile = await serializeResumeFile(file);
    } catch (error) {
      toast(error.message || "简历附件读取失败", "error");
      return;
    }
    const profile = {
      id: crypto.randomUUID(),
      name,
      target: "",
      summary: "",
      attachment: resumeFile?.name || "",
      resumePath: resumeFile?.name || "",
      resumeFile,
      work: []
    };
    const previousActiveProfileId = db.activeProfileId;
    db.profiles.push(profile);
    if (!db.activeProfileId) db.activeProfileId = profile.id;
    try {
      await saveProfiles();
    } catch (error) {
      db.profiles.pop();
      db.activeProfileId = previousActiveProfileId;
      toast("简历版本保存失败；可能是本地存储空间不足", "error");
      return;
    }
    closeModal();
    toggleVersion(profile.id);
  };
  $("#newVersionName").focus();
}

$("#addVersion").addEventListener("click", openCreateVersion);

async function setDefaultVersion(id) {
  db.activeProfileId = id;
  await saveProfiles();
}

function uniqueCopyName(baseName) {
  const base = `${baseName || "未命名版本"} 副本`;
  const existing = new Set(db.profiles.map(profile => profile.name));
  if (!existing.has(base)) return base;
  let index = 2;
  while (existing.has(`${base} ${index}`)) index += 1;
  return `${base} ${index}`;
}

async function copyVersion(id) {
  const profile = db.profiles.find(item => item.id === id);
  if (!profile) return;
  const copy = JSON.parse(JSON.stringify(profile));
  copy.id = crypto.randomUUID();
  copy.name = uniqueCopyName(profile.name);
  db.profiles.push(copy);
  openedVersionId = copy.id;
  try {
    await saveProfiles();
  } catch (error) {
    db.profiles.pop();
    openedVersionId = id;
    toast("复制失败；绑定附件较大时可能超出本地存储空间", "error");
    return;
  }
  openVersion(copy.id);
  $("#versionEditor").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renameVersion(id) {
  const profile = db.profiles.find(item => item.id === id);
  $("#modalBody").innerHTML = `
    <div class="section-title">重命名版本</div>
    <div class="modal-grid"><div class="field full-span"><label>版本名称</label><input id="renameVersionInput" value="${safe(profile.name)}"></div></div>
    <div class="row"><button class="btn ghost" id="cancelModal">取消</button><button class="btn primary" id="saveRename">保存</button></div>
  `;
  openModal();
  $("#saveRename").onclick = async () => {
    const name = $("#renameVersionInput").value.trim();
    if (!name) return $("#renameVersionInput").focus();
    profile.name = name;
    await saveProfiles();
    closeModal();
  };
  $("#renameVersionInput").select();
}

async function deleteVersion(id) {
  if (db.profiles.length < 2) {
    alert("至少保留一个简历版本");
    return;
  }
  if (!confirm("确认删除这个简历版本？")) return;
  db.profiles = db.profiles.filter(item => item.id !== id);
  if (db.activeProfileId === id) db.activeProfileId = db.profiles[0]?.id;
  if (openedVersionId === id) {
    openedVersionId = null;
    $("#versionEditor").innerHTML = "";
  }
  await saveProfiles();
}

$("#saveHobbies").addEventListener("click", async () => {
  db.hobbies = $("#hobbiesText").value.trim();
  await chrome.storage.local.set({ hobbies: db.hobbies });
  alert("兴趣爱好已保存");
});

function isGeneratedCompanyName(value) {
  const company = String(value || "").trim();
  if (!company) return true;
  if (/^(OPPO|vivo|DJI|BCG|BMW|TCL)$/i.test(company)) return false;
  return !/[\u3400-\u9fff]/.test(company);
}

function historyCompanyName(record) {
  return isGeneratedCompanyName(record.company) ? "公司待确认" : String(record.company).trim();
}

function historyCompanyKey(record) {
  const company = isGeneratedCompanyName(record.company) ? "" : record.company;
  return String(company || record.site || "").trim().toLocaleLowerCase("zh-CN");
}

function historyTimestamp(record) {
  const value = Date.parse(String(record.time || "").replace(/年|月/g, "/").replace(/日/g, ""));
  return Number.isNaN(value) ? 0 : value;
}

function dedupeLatestHistory(records) {
  const latest = new Map();
  records.forEach((record, index) => {
    const key = historyCompanyKey(record) || `__record_${index}`;
    const candidate = { record, index, timestamp: historyTimestamp(record) };
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

async function upsertHistory(record) {
  const key = historyCompanyKey(record);
  db.fillHistory = [
    record,
    ...db.fillHistory.filter(item => !key || historyCompanyKey(item) !== key)
  ].slice(0, 100);
  await chrome.storage.local.set({ fillHistory: db.fillHistory });
}

async function refreshHistoryCompanyNames() {
  const pending = db.fillHistory
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => isGeneratedCompanyName(record.company))
    .map(({ record, index }) => ({
      id: String(index),
      hostname: record.site || record.url || "",
      url: record.url || "",
      title: record.pageTitle || ""
    }));
  if (!pending.length) return;
  const result = await chrome.runtime.sendMessage({
    type: "RESOLVE_COMPANIES",
    records: pending
  });
  if (!result?.ok) return;
  let changed = false;
  (result.resolutions || []).forEach(item => {
    const index = Number(item.id);
    if (!Number.isInteger(index) || !db.fillHistory[index] || !item.company) return;
    db.fillHistory[index].company = item.company;
    changed = true;
  });
  if (!changed) return;
  db.fillHistory = dedupeLatestHistory(db.fillHistory);
  await chrome.storage.local.set({ fillHistory: db.fillHistory });
  renderHistoryFilters();
  renderHistory();
}

function renderHistoryFilters() {
  const current = $("#companyFilter").value;
  const companies = [...new Set(db.fillHistory.map(historyCompanyName).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "zh-CN"));
  $("#companyFilter").innerHTML = '<option value="">全部公司</option>' +
    companies.map(company => `<option value="${safe(company)}">${safe(company)}</option>`).join("");
  $("#companyFilter").value = companies.includes(current) ? current : "";
}

["companyFilter", "dateFrom", "dateTo", "statusFilter"].forEach(id => {
  $(`#${id}`).addEventListener("change", renderHistory);
});

$("#clearFilters").addEventListener("click", () => {
  ["companyFilter", "dateFrom", "dateTo", "statusFilter"].forEach(id => {
    $(`#${id}`).value = "";
  });
  renderHistory();
});

function dateKey(value) {
  const source = String(value || "");
  const matched = source.match(/(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})/);
  if (matched) {
    return `${matched[1]}-${matched[2].padStart(2, "0")}-${matched[3].padStart(2, "0")}`;
  }
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function historyVersion(record) {
  if (record.profile) return record.profile;
  if (record.profileId) return db.profiles.find(profile => profile.id === record.profileId)?.name || "版本已删除";
  return "未记录";
}

function httpUrl(value) {
  try {
    const source = String(value || "").trim();
    if (!source) return "";
    const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(source) ? source : `https://${source}`);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function displayHost(record) {
  const link = httpUrl(record.url);
  if (link) return new URL(link).hostname.replace(/^www\./, "");
  return record.site || "未填写网站链接";
}

function filteredHistory() {
  const company = $("#companyFilter").value;
  const from = $("#dateFrom").value;
  const to = $("#dateTo").value;
  const status = $("#statusFilter").value;
  return db.fillHistory
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => {
      const companyName = historyCompanyName(record);
      const day = dateKey(record.time);
      return (!company || companyName === company) &&
        (!status || (record.status || "未完成") === status) &&
        (!from || day >= from) &&
        (!to || day <= to);
    });
}

function renderHistory() {
  const rows = filteredHistory();
  const complete = rows.filter(({ record }) => record.status === "已完成").length;
  $("#historySummary").innerHTML = `共 <b>${rows.length}</b> 家公司，其中 <b>${complete}</b> 家已完成`;
  $("#exportHistory").disabled = !rows.length;

  if (!rows.length) {
    $("#dashboardHistory").innerHTML = '<div class="empty">没有符合当前筛选条件的网申记录</div>';
    return;
  }

  $("#dashboardHistory").innerHTML = `
    <div class="history-board">
      <table class="history-table">
        <colgroup>
          <col class="col-company">
          <col class="col-link">
          <col class="col-version">
          <col class="col-time">
          <col class="col-note">
          <col class="col-actions">
        </colgroup>
        <thead>
          <tr>
            <th>公司</th>
            <th>链接</th>
            <th>简历版本</th>
            <th>更新时间</th>
            <th>自定义备注</th>
            <th class="actions-cell">操作</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(({ record, index }) => {
            const link = httpUrl(record.url);
            const company = safe(historyCompanyName(record));
            return `
              <tr class="history-row">
                <td>
                  <div class="company-cell">
                    <input class="history-company" data-company="${index}" value="${company}" aria-label="编辑公司名称">
                  </div>
                </td>
                <td>
                  ${link
                    ? `<a class="history-link" href="${safe(link)}" target="_blank" rel="noopener noreferrer" title="${safe(link)}"><span>${safe(displayHost(record))}</span><i>↗</i></a>`
                    : '<span class="cell-empty">未填写</span>'}
                </td>
                <td><span class="version-cell">${safe(historyVersion(record))}</span></td>
                <td><time class="time-cell">${safe(record.time || "未记录")}</time></td>
                <td><input class="history-note" data-note="${index}" value="${safe(record.note || "")}" placeholder="添加备注"></td>
                <td class="actions-cell">
                  <div class="table-actions">
                    <button class="table-action" data-history-edit="${index}">编辑</button>
                    <button class="table-action" data-history-detail="${index}">详情</button>
                    <button class="table-action danger" data-history-delete="${index}">删除</button>
                  </div>
                </td>
              </tr>
              <tr id="historyDetail${index}" class="history-detail-row hidden">
                <td colspan="6">
                  <div class="history-detail">
                    <div><b>已匹配 ${record.matched?.length || 0}</b><p>${(record.matched || []).map(item => `<span class="field-chip matched">${safe(item)}</span>`).join("") || "无"}</p></div>
                    <div><b>未匹配 ${record.unmatched?.length || 0}</b><p>${(record.unmatched || []).map(item => `<span class="field-chip unmatched">${safe(item)}</span>`).join("") || "无"}</p></div>
                    <div><b>已跳过 ${record.skipped?.length || 0}</b><p>${(record.skipped || []).map(item => `<span class="field-chip skipped">${safe(item)}</span>`).join("") || "无"}</p></div>
                  </div>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
  bindHistory();
}

function bindHistory() {
  $$("[data-company]").forEach(input => {
    const index = Number(input.dataset.company);
    const original = historyCompanyName(db.fillHistory[index]);
    input.onkeydown = event => {
      if (event.key === "Enter") input.blur();
      if (event.key === "Escape") {
        input.value = original;
        input.blur();
      }
    };
    input.onchange = async () => {
      if (!await saveHistoryCompany(index, input.value, { rerender: true })) input.value = original;
    };
  });
  $$("[data-note]").forEach(input => {
    input.onchange = async () => {
      db.fillHistory[Number(input.dataset.note)].note = input.value;
      await chrome.storage.local.set({ fillHistory: db.fillHistory });
    };
  });
  $$("[data-history-detail]").forEach(button => {
    button.onclick = () => {
      const detail = $(`#historyDetail${button.dataset.historyDetail}`);
      detail.classList.toggle("hidden");
      button.textContent = detail.classList.contains("hidden") ? "详情" : "收起";
    };
  });
  $$("[data-history-edit]").forEach(button => {
    button.onclick = () => openHistoryEditor(Number(button.dataset.historyEdit));
  });
  $$("[data-history-delete]").forEach(button => {
    button.onclick = async () => {
      const index = Number(button.dataset.historyDelete);
      const name = db.fillHistory[index].company || db.fillHistory[index].site || "该公司";
      if (!confirm(`确认删除“${name}”的填写记录？`)) return;
      db.fillHistory.splice(index, 1);
      await chrome.storage.local.set({ fillHistory: db.fillHistory });
      renderHistoryFilters();
      renderHistory();
    };
  });
}

function openHistoryEditor(index) {
  const record = db.fillHistory[index];
  $("#modalBody").innerHTML = `
    <div class="section-title">编辑填写记录</div>
    <div class="modal-grid">
      <div class="field"><label>状态</label><select id="editHistoryStatus"><option ${record.status !== "已完成" ? "selected" : ""}>未完成</option><option ${record.status === "已完成" ? "selected" : ""}>已完成</option></select></div>
      <div class="field"><label>简历版本</label><select id="editHistoryProfile">${db.profiles.map(profile => `<option value="${safe(profile.name)}" ${historyVersion(record) === profile.name ? "selected" : ""}>${safe(profile.name)}</option>`).join("")}</select></div>
      <div class="field full-span"><label>公司网站链接</label><input id="editHistoryUrl" value="${safe(record.url || "")}" placeholder="https://"></div>
      <div class="field"><label>备注</label><input id="editHistoryNote" value="${safe(record.note || "")}"></div>
    </div>
    <div class="row"><button class="btn ghost" id="cancelModal">取消</button><button class="btn primary" id="saveHistoryEdit">保存</button></div>
  `;
  openModal();
  $("#saveHistoryEdit").onclick = async () => {
    const rawUrl = $("#editHistoryUrl").value.trim();
    const link = httpUrl(rawUrl);
    if (rawUrl && !link) {
      alert("请输入有效的公司网站链接");
      return $("#editHistoryUrl").focus();
    }
    record.url = link;
    record.site = link ? new URL(link).hostname : record.site;
    record.status = $("#editHistoryStatus").value;
    record.profile = $("#editHistoryProfile").value;
    record.note = $("#editHistoryNote").value.trim();
    db.fillHistory = dedupeLatestHistory(db.fillHistory);
    await chrome.storage.local.set({ fillHistory: db.fillHistory });
    closeModal();
    renderHistoryFilters();
    renderHistory();
  };
}

function csvCell(value) {
  let text = Array.isArray(value) ? value.join("；") : String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function exportHistoryCsv() {
  const rows = filteredHistory();
  if (!rows.length) return;
  const columns = [
    ["公司", record => record.company || record.site || ""],
    ["链接", record => httpUrl(record.url) || ""],
    ["简历版本", record => historyVersion(record)],
    ["更新时间", record => record.time || ""],
    ["状态", record => record.status || "未完成"],
    ["自定义备注", record => record.note || ""],
    ["已匹配字段", record => record.matched || []],
    ["未匹配字段", record => record.unmatched || []],
    ["已跳过字段", record => record.skipped || []]
  ];
  const csv = [
    columns.map(([label]) => csvCell(label)).join(","),
    ...rows.map(({ record }) => columns.map(([, read]) => csvCell(read(record))).join(","))
  ].join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `简填网申记录_${dateKey(new Date().toISOString())}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

$("#exportHistory").addEventListener("click", exportHistoryCsv);

$("#addHistory").addEventListener("click", () => {
  $("#modalBody").innerHTML = `
    <div class="section-title">添加网申记录</div>
    <div class="modal-grid">
      <div class="field"><label>公司</label><input id="hCompany"></div>
      <div class="field"><label>网址</label><input id="hUrl"></div>
      <div class="field"><label>状态</label><select id="hStatus"><option>未完成</option><option>已完成</option></select></div>
      <div class="field"><label>简历版本</label><select id="hProfile">${db.profiles.map(profile => `<option value="${safe(profile.name)}">${safe(profile.name)}</option>`).join("")}</select></div>
      <div class="field full-span"><label>备注</label><input id="hNote"></div>
    </div>
    <div class="row"><button class="btn ghost" id="cancelModal">取消</button><button class="btn primary" id="saveHistory">保存</button></div>
  `;
  openModal();
  $("#saveHistory").onclick = async () => {
    const company = $("#hCompany").value.trim();
    if (!company) return $("#hCompany").focus();
    const rawUrl = $("#hUrl").value.trim();
    const link = httpUrl(rawUrl);
    if (rawUrl && !link) {
      alert("请输入有效的公司网站链接");
      return $("#hUrl").focus();
    }
    await upsertHistory({
      company,
      url: link,
      site: link ? new URL(link).hostname : "",
      status: $("#hStatus").value,
      profile: $("#hProfile").value,
      note: $("#hNote").value.trim(),
      time: new Date().toLocaleString(),
      matched: [],
      unmatched: [],
      skipped: []
    });
    closeModal();
    renderHistoryFilters();
    renderHistory();
  };
});

function mailSettingsDefaults() {
  return {
    host: "imap.126.com",
    port: 993,
    folder: "INBOX",
    autoSync: true,
    syncIntervalMinutes: 720,
    lookbackHours: 24
  };
}

function backupFileName(prefix = "简填备份") {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${prefix}_${timestamp}.json`;
}

function downloadTextFile(text, fileName) {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function disableLegacyDataSync() {
  const settings = {
    ...(db.dataSyncSettings || {}),
    enabled: false,
    passphrase: ""
  };
  db.dataSyncSettings = settings;
  await chrome.storage.local.set({ dataSyncSettings: settings });
  await chrome.runtime.sendMessage({
    type: "DATA_SYNC_SETTINGS_CHANGED",
    dataSyncSettings: settings
  }).catch(() => {});
}

function migrationPackage(storage) {
  const excludedKeys = new Set([
    "aiFieldMappings",
    "companyNameMappings",
    "dataSyncSettings",
    "dataSyncState",
    "mailSyncStatus",
    "nativeHostPlatform"
  ]);
  const data = Object.fromEntries(
    Object.entries(storage || {})
      .filter(([key]) => !excludedKeys.has(key))
      .map(([key, value]) => [key, value])
  );
  return {
    format: "jianfill-data-migration",
    version: 1,
    createdAt: new Date().toISOString(),
    appVersion: chrome.runtime.getManifest().version,
    data
  };
}

async function downloadMigrationBackup(prefix = "简填数据") {
  const storage = await chrome.storage.local.get(null);
  const payload = migrationPackage(storage);
  downloadTextFile(JSON.stringify(payload, null, 2), backupFileName(prefix));
  return payload;
}

function parseMigrationPackage(text) {
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("JSON 文件格式无效");
  }
  if (payload?.format === "jianfill-encrypted-backup") {
    throw new Error("这是旧版加密备份，请先使用旧版扩展解密后再导出");
  }
  const data = payload?.format === "jianfill-data-migration" ? payload.data : payload;
  if (!data || Array.isArray(data) || typeof data !== "object") {
    throw new Error("JSON 中没有可导入的数据");
  }
  return data;
}

async function replaceLocalStorage(data, preserved) {
  const previous = await chrome.storage.local.get(null);
  try {
    await chrome.storage.local.clear();
    await chrome.storage.local.set({ ...data, ...preserved });
  } catch (error) {
    await chrome.storage.local.clear();
    await chrome.storage.local.set(previous);
    throw new Error(`导入失败，已恢复原数据：${error.message || error}`);
  }
}

async function rescheduleAfterRestore() {
  const storage = await chrome.storage.local.get(["mailSettings"]);
  const mailResult = await chrome.runtime.sendMessage({
    type: "MAIL_SETTINGS_CHANGED",
    mailSettings: storage.mailSettings || {}
  });
  if (!mailResult?.ok) throw new Error(mailResult?.error || "邮件任务重新调度失败");
}

function setMigrationBusy(busy, activeButton = null) {
  ["#exportDataBackup", "#importDataBackup"].forEach(selector => {
    const node = $(selector);
    if (node) node.disabled = busy;
  });
  const importLabel = document.querySelector('label[for="importDataBackup"]');
  if (importLabel) {
    importLabel.classList.toggle("disabled", busy);
    importLabel.setAttribute("aria-disabled", String(busy));
  }
  if (activeButton) activeButton.dataset.busy = busy ? "1" : "";
}

async function importDataBackup(file) {
  if (!file) return;
  if (file.size > 20 * 1024 * 1024) throw new Error("备份文件不能超过 20MB");
  const text = await file.text();
  const data = parseMigrationPackage(text);
  if (!confirm("导入会覆盖当前设备的数据，并先自动导出一份回滚 JSON。确认继续？")) {
    return;
  }
  await downloadMigrationBackup("简填导入前回滚");
  await replaceLocalStorage(data, {
    dataSyncSettings: { enabled: false, passphrase: "" },
    dataSyncState: { state: "idle" },
    ...(db.nativeHostPlatform ? { nativeHostPlatform: db.nativeHostPlatform } : {})
  });
  try {
    await rescheduleAfterRestore();
  } catch (error) {
    throw new Error(`数据已导入，但后台任务重新调度失败：${error.message || error}`);
  }
  toast("数据已导入，页面即将刷新", "success");
  setTimeout(() => location.reload(), 500);
}

function detectedNativeHostPlatform() {
  const value = String(navigator.userAgentData?.platform || navigator.platform || "");
  return /win/i.test(value) ? "windows" : "macos";
}

function renderNativeHostPlatform(platform = db.nativeHostPlatform || detectedNativeHostPlatform()) {
  const selected = platform === "windows" ? "windows" : "macos";
  db.nativeHostPlatform = selected;
  $$("[data-native-platform]").forEach(button => {
    const active = button.dataset.nativePlatform === selected;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  if (selected === "windows") {
    $("#mailInstallCommand").textContent =
      `powershell -ExecutionPolicy Bypass -File .\\native-host\\install-windows.ps1 -ExtensionId ${chrome.runtime.id}`;
  } else {
    $("#mailInstallCommand").textContent =
      `./native-host/install.sh ${chrome.runtime.id}`;
  }
}

function renderMailSettings() {
  const settings = { ...mailSettingsDefaults(), ...(db.mailSettings || {}) };
  if (Number(settings.syncIntervalMinutes) === 120) {
    settings.syncIntervalMinutes = 720;
  }
  delete settings.dryRun;
  $("#mailAddress").value = settings.address || "";
  $("#mailAuthCode").value = settings.authCode || "";
  $("#mailHost").value = settings.host;
  $("#mailPort").value = settings.port;
  $("#mailAutoSync").checked = Boolean(settings.autoSync);
  $("#mailSyncIntervalHours").value = Number(settings.syncIntervalMinutes) / 60;
  $("#mailLookbackHours").value = settings.lookbackHours;
  $("#mailLookbackLabel").textContent = `最近 ${settings.lookbackHours} 小时`;

  renderNativeHostPlatform();
  const localStatus = $("#localConfigStatus");
  if (localStatus && !localStatus.dataset.touched) {
    localStatus.textContent = "";
  }
  updateBridgeState("idle", "检测本地桥接");
}

function mailSettingsFromForm() {
  const syncIntervalHours = Number($("#mailSyncIntervalHours").value);
  const lookbackHours = Number($("#mailLookbackHours").value);
  if (!Number.isFinite(syncIntervalHours) || syncIntervalHours < .5 || syncIntervalHours > 168) {
    throw new Error("自动同步间隔需在 0.5 到 168 小时之间");
  }
  if (!Number.isInteger(lookbackHours) || lookbackHours < 1 || lookbackHours > 720) {
    throw new Error("邮件捕捉周期需为 1 到 720 之间的整数小时");
  }
  return {
    address: $("#mailAddress").value.trim(),
    authCode: $("#mailAuthCode").value.trim(),
    host: $("#mailHost").value.trim() || "imap.126.com",
    port: Number($("#mailPort").value) || 993,
    folder: "INBOX",
    autoSync: $("#mailAutoSync").checked,
    syncIntervalMinutes: Math.round(syncIntervalHours * 60),
    lookbackHours
  };
}

async function persistMailSettings(showNotice = true) {
  const settings = mailSettingsFromForm();
  db.mailSettings = settings;
  await chrome.storage.local.set({ mailSettings: settings });
  const result = await chrome.runtime.sendMessage({
    type: "MAIL_SETTINGS_CHANGED",
    mailSettings: settings
  });
  if (!result?.ok) throw new Error(result?.error || "自动同步配置失败");
  if (showNotice) alert("邮件设置已保存");
  return settings;
}

function updateBridgeState(state, text) {
  const node = $("#mailBridgeStatus");
  node.className = `bridge-state ${state}`;
  node.innerHTML = `<i></i>${safe(text)}`;
}

function mailStatusClass(status) {
  if (status === "待办" || status === "已完成") return "matched";
  if (status === "已挂") return "hung";
  if (status === "失败") return "danger";
  return "skipped";
}

function formatMailTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "—";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

async function saveHistoryCompany(index, value, { rerender = false } = {}) {
  const company = String(value || "").trim();
  if (!company || !db.fillHistory[index]) return false;
  db.fillHistory[index].company = company;
  db.fillHistory = dedupeLatestHistory(db.fillHistory);
  await chrome.storage.local.set({ fillHistory: db.fillHistory });
  if (rerender) {
    renderHistoryFilters();
    renderHistory();
  }
  return true;
}

function repairKnownMailCompanies(history) {
  let changed = false;
  const next = (history || []).map(item => {
    if (item.companyLocked) return item;
    const haystack = `${item.company || ""} ${item.companyRaw || ""} ${item.subject || ""}`;
    const repaired = /岚图|voyah/i.test(haystack) ? "岚图汽车" : /招商银行|cmbchina/i.test(haystack) ? "招商银行" : item.company;
    if (repaired && repaired !== item.company) {
      changed = true;
      return { ...item, company: repaired, companySource: "migration", needsCompanyReview: false };
    }
    return item;
  });
  return { history: next, changed };
}

function parseMailDate(value) {
  if (!value) return null;
  const source = String(value).trim();
  const match = source.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4] || 0), Number(match[5] || 0))
    : new Date(source);
  return Number.isNaN(date.getTime()) ? null : date;
}

function localDateKey(value) {
  const date = value instanceof Date ? value : parseMailDate(value);
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function localDateTimeValue(value) {
  const date = parseMailDate(value);
  if (!date) return "";
  return `${localDateKey(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function localDateValue(value) {
  const date = parseMailDate(value);
  return date ? localDateKey(date) : "";
}

function mailTaskDate(item) {
  if (item.status === "已完成" && item.completedAt) return parseMailDate(item.completedAt);
  return parseMailDate(item.deadline);
}

function mailTaskDedupKey(item, fallback) {
  const company = String(item.company || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("zh-CN");
  const deadline = localDateTimeValue(item.deadline);
  return company && deadline ? `${company}\u0000${deadline}` : `__record_${fallback}`;
}

function mailTaskMessageIds(value) {
  try {
    const ids = JSON.parse(value || "[]");
    return Array.isArray(ids) ? ids.filter(Boolean) : [];
  } catch (_) {
    return [];
  }
}

function mailCalendarTodoId() {
  return `todo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function mailCalendarTodos(dateKey) {
  const todos = db.mailCalendarTodos?.[dateKey];
  return Array.isArray(todos)
    ? todos.filter(todo => String(todo?.text || "").trim())
    : [];
}

async function saveMailCalendarTodos() {
  await chrome.storage.local.set({ mailCalendarTodos: db.mailCalendarTodos });
}

function mailCalendarEvents() {
  const categories = new Set(["在线测评", "ai面试", "面试邀约"]);
  const groups = new Map();
  filteredMailHistory()
    .filter(item => categories.has(item.category) && mailTaskDate(item))
    .forEach((item, index) => {
      const key = mailTaskDedupKey(item, index);
      const group = groups.get(key) || [];
      group.push(item);
      groups.set(key, group);
    });
  return [...groups.values()].map(group => {
    const completed = group.find(item => item.status === "已完成" && item.completedAt);
    const item = completed || group[0];
    return {
      item,
      date: mailTaskDate(item),
      messageIds: group.map(entry => entry.messageId).filter(Boolean)
    };
  }).sort((left, right) => left.date - right.date);
}

function renderMailView() {
  const view = db.mailViewPreference === "calendar" ? "calendar" : "board";
  $("#mailBoardView").classList.toggle("hidden", view !== "board");
  $("#mailCalendarView").classList.toggle("hidden", view !== "calendar");
  $("#mailCalendarView").classList.toggle("agenda-collapsed", !mailAgendaExpanded);
  $("#mailAgendaToggle").textContent = mailAgendaExpanded ? "收起日程" : "展开日程";
  $$('[data-mail-view]').forEach(button => button.classList.toggle("active", button.dataset.mailView === view));
  if (view === "calendar") renderMailCalendar();
}

function renderMailCalendar() {
  const events = mailCalendarEvents();
  const year = mailCalendarMonth.getFullYear();
  const month = mailCalendarMonth.getMonth();
  $("#mailCalendarTitle").textContent = `${year} 年 ${month + 1} 月`;
  const first = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - ((first.getDay() + 6) % 7));
  const todayKey = localDateKey(new Date());
  const cells = [];
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const key = localDateKey(date);
    const dayEvents = events.filter(event => localDateKey(event.date) === key);
    const dayTodos = mailCalendarTodos(key);
    cells.push(`
      <button type="button" class="mail-calendar-day${date.getMonth() !== month ? " is-outside" : ""}${key === todayKey ? " is-today" : ""}${key === mailSelectedDateKey ? " is-selected" : ""}" data-calendar-date="${key}">
        <span class="mail-calendar-day-number">${date.getDate()}</span>
        <span class="mail-calendar-events">
          ${dayEvents.slice(0, 3).map(({ item, date: eventDate }) => `
            <span class="mail-calendar-event ${item.category === "ai面试" ? "is-ai" : item.category === "面试邀约" ? "is-interview" : "is-assessment"}${item.status === "已完成" ? " is-completed" : ""}">
              <b>${safe(item.company || "无法确定公司")}</b>
              <time>${String(eventDate.getHours()).padStart(2, "0")}:${String(eventDate.getMinutes()).padStart(2, "0")}</time>
            </span>
          `).join("")}
          ${dayEvents.length > 3 ? `<span class="mail-calendar-more">还有 ${dayEvents.length - 3} 项</span>` : ""}
          ${dayTodos.slice(0, 1).map(todo => `<span class="mail-calendar-todo${todo.completed ? " is-completed" : ""}"><span>${todo.completed ? "✓" : "○"}</span><b>${safe(todo.text)}</b></span>`).join("")}
          ${dayTodos.length > 1 ? `<span class="mail-calendar-more">还有 ${dayTodos.length - 1} 条 Todo</span>` : ""}
        </span>
      </button>
    `);
  }
  $("#mailCalendarGrid").innerHTML = cells.join("");
  renderMailDayAgenda(events);
}

function renderMailDayAgenda(events = mailCalendarEvents()) {
  const selected = parseMailDate(mailSelectedDateKey);
  $("#mailSelectedDate").textContent = selected
    ? new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(selected)
    : mailSelectedDateKey;
  const items = events.filter(event => localDateKey(event.date) === mailSelectedDateKey);
  $("#mailDayAgenda").innerHTML = items.length ? items.map(({ item, messageIds }) => {
    const link = httpUrl(item.assessmentUrl);
    const taskIds = safeAttr(JSON.stringify(messageIds));
    const completed = item.status === "已完成";
    const completedDate = localDateValue(item.completedAt);
    return `
      <article class="mail-agenda-item ${completed ? "is-completed" : ""}">
        <div class="mail-agenda-copy">
          <div class="mail-agenda-title">
            <span class="mail-agenda-status" aria-label="${completed ? "已完成" : "未完成"}">${completed ? "●" : "○"}</span>
            <strong>${safe(item.company || "无法确定公司")}</strong>
            <span class="mail-agenda-separator">·</span>
            <span class="mail-category">${safe(item.category || "待办")}</span>
          </div>
          <p>DDL ${item.deadline ? safe(formatMailTime(item.deadline)) : "—"}</p>
          <div class="mail-completed-date">
            <span>完成日期</span>
            <span class="mail-completed-value">${safe(completedDate || "—")}</span>
            ${completed
              ? `<input class="mail-completed-at" data-message-ids="${taskIds}" type="date" value="${safeAttr(completedDate)}" aria-label="修改完成日期">`
              : ""}
          </div>
        </div>
        <div class="mail-agenda-actions">
          ${completed ? "" : `<button type="button" class="btn primary small mail-complete" data-message-ids="${taskIds}">已完成</button>`}
          ${link ? `<a class="mail-open" href="${safeAttr(link)}" target="_blank" rel="noopener">打开链接</a>` : ""}
          <button type="button" class="btn ghost small danger-btn mail-delete" data-message-ids="${taskIds}">删除</button>
        </div>
      </article>
    `;
  }).join("") : '<div class="empty compact">当天没有邮件待办</div>';
  const todos = mailCalendarTodos(mailSelectedDateKey);
  $("#mailCalendarTodos").innerHTML = todos.length ? todos.map(todo => `
    <div class="mail-todo-item${todo.completed ? " is-completed" : ""}">
      <button class="mail-todo-toggle" type="button" data-todo-id="${safeAttr(todo.id)}" aria-label="${todo.completed ? "标记为未完成" : "标记为完成"}">${todo.completed ? "✓" : "○"}</button>
      <span>${safe(todo.text)}</span>
      <button class="mail-todo-delete" type="button" data-todo-id="${safeAttr(todo.id)}" aria-label="删除 Todo">×</button>
    </div>
  `).join("") : '<div class="empty compact">当天还没有 Todo</div>';
}

function filteredMailHistory() {
  const companyQuery = String($("#mailCompanyFilter")?.value || "").trim().toLocaleLowerCase("zh-CN");
  const status = $("#mailStatusFilter").value;
  const category = $("#mailCategoryFilter").value;
  const sort = $("#mailSort").value;
  const rows = (db.mailHistory || []).filter(item =>
    (!companyQuery || String(item.company || "").toLocaleLowerCase("zh-CN").includes(companyQuery)) &&
    (status === "__default__" ? !["已忽略", "待确认"].includes(item.status) : (!status || item.status === status)) &&
    (!category || item.category === category)
  );
  const timestamp = value => {
    const result = Date.parse(value || "");
    return Number.isNaN(result) ? null : result;
  };
  return rows.sort((left, right) => {
    const leftValue = sort.startsWith("deadline") ? timestamp(left.deadline) : timestamp(left.receivedAt);
    const rightValue = sort.startsWith("deadline") ? timestamp(right.deadline) : timestamp(right.receivedAt);
    if (leftValue == null && rightValue == null) return 0;
    if (leftValue == null) return 1;
    if (rightValue == null) return -1;
    return sort.endsWith("_asc") ? leftValue - rightValue : rightValue - leftValue;
  });
}

function renderMailDashboard() {
  const status = db.mailSyncStatus || {};
  const summary = status.summary || {};
  $("#mailFetchedMetric").textContent = summary.fetched || 0;
  $("#mailUpdatedMetric").textContent = summary.newTasks || summary.updated || 0;
  $("#mailIgnoredMetric").textContent = summary.irrelevant || 0;
  $("#mailSkippedMetric").textContent = summary.duplicates || summary.alreadyProcessed || 0;
  $("#mailReviewMetric").textContent = summary.needsCompanyReview || summary.needsReview || 0;
  if (status.state === "syncing") {
    $("#mailLastSync").textContent = "正在读取邮箱并整理本地任务…";
  } else if (status.state === "error") {
    $("#mailLastSync").textContent = `同步失败：${status.error || "未知错误"}`;
  } else if (status.finishedAt) {
    $("#mailLastSync").textContent = `最近同步 ${formatMailTime(status.finishedAt)}`;
  } else {
    $("#mailLastSync").textContent = "尚未同步";
  }

  const rows = filteredMailHistory();
  if (!rows.length) {
    $("#mailHistoryTable").innerHTML = '<div class="empty">没有符合筛选条件的邮件记录</div>';
    renderMailView();
    return;
  }
  $("#mailHistoryTable").innerHTML = `
    <div class="mail-table-wrap">
      <table class="mail-table">
        <thead><tr><th>状态</th><th>公司</th><th>邮件标题</th><th>分类</th><th>DDL</th><th>接收时间</th><th>完成日期</th><th>自定义备注</th><th>操作</th></tr></thead>
        <tbody>
          ${rows.map(item => {
            const link = httpUrl(item.assessmentUrl);
            return `
              <tr>
                <td><span class="field-chip ${mailStatusClass(item.status)}">${safe(item.status || "未知")}</span></td>
                <td><input class="mail-company-input" data-message-id="${safeAttr(item.messageId)}" value="${safeAttr(item.company || "")}" placeholder="${safeAttr(item.reason || "编辑公司")}" aria-label="公司名称"></td>
                <td><div class="mail-subject" title="${safeAttr(item.subject || "")}">${safe(item.subject || "无主题")}</div></td>
                <td>${item.category ? `<span class="mail-category">${safe(item.category)}</span>` : '<span class="cell-empty">—</span>'}</td>
                <td>${item.deadline ? `<time>${safe(item.deadline)}</time>` : '<span class="cell-empty">—</span>'}</td>
                <td><time>${safe(formatMailTime(item.receivedAt))}</time></td>
                <td>${item.status === "已完成"
                  ? `<input class="mail-completed-at" data-message-id="${safeAttr(item.messageId)}" type="date" value="${safeAttr(localDateValue(item.completedAt))}" aria-label="修改完成日期">`
                  : '<span class="cell-empty">—</span>'}</td>
                <td><input class="mail-note" data-message-id="${safeAttr(item.messageId)}" value="${safeAttr(item.customNote || "")}" placeholder="添加备注" aria-label="自定义备注"></td>
                <td><div class="mail-actions">
                  ${link
                    ? `<a class="mail-open" href="${safeAttr(link)}" target="_blank" rel="noopener">打开链接 ↗</a>`
                    : '<span class="mail-open is-disabled" aria-disabled="true">打开链接</span>'}
                  <select class="mail-action" data-message-id="${safeAttr(item.messageId)}" aria-label="修改邮件状态"><option value="">修改状态</option><option value="completed">已完成</option><option value="hung">已挂</option><option value="ignored">已忽略</option></select>
                </div></td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
  renderMailView();
}

async function refreshMailState() {
  const state = await chrome.storage.local.get(["mailHistory", "mailSyncStatus"]);
  db.mailHistory = state.mailHistory || [];
  db.mailSyncStatus = state.mailSyncStatus || {};
  renderMailDashboard();
}

$("#saveMailSettings").addEventListener("click", async () => {
  try {
    await persistMailSettings();
  } catch (error) {
    alert(error.message || "保存失败");
  }
});

$("#exportDataBackup").addEventListener("click", async () => {
  setMigrationBusy(true, $("#exportDataBackup"));
  try {
    await downloadMigrationBackup();
    toast("JSON 已导出", "success");
  } catch (error) {
    toast(error.message || "导出失败", "error");
  } finally {
    setMigrationBusy(false, $("#exportDataBackup"));
  }
});

$("#importDataBackup").addEventListener("change", async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  setMigrationBusy(true);
  try {
    await importDataBackup(file);
  } catch (error) {
    toast(error.message || "导入失败", "error");
  } finally {
    event.target.value = "";
    setMigrationBusy(false);
  }
});

$("#testMailBridge").addEventListener("click", async () => {
  updateBridgeState("loading", "正在连接");
  const result = await chrome.runtime.sendMessage({ type: "MAIL_PING" });
  const platformLabel = result?.platform === "Windows"
    ? "Windows"
    : result?.platform === "Darwin" ? "macOS" : result?.platform || "";
  updateBridgeState(
    result?.ok ? "success" : "error",
    result?.ok
      ? `${platformLabel || "本机"}桥接 v${result.version || "未知"}`
      : "本地桥接未安装"
  );
});

$("#syncMailNow").addEventListener("click", async () => {
  const button = $("#syncMailNow");
  button.disabled = true;
  button.textContent = "同步中…";
  try {
    // 立即同步只更新本地看板，不触发自动同步调度或任何外部表格写入。
    const mailSettings = mailSettingsFromForm();
    db.mailSettings = mailSettings;
    await chrome.storage.local.set({ mailSettings });
    if (!activeAiProviders().length) throw new Error("请先在设置中启用至少一个 AI 模型版本");
    const result = await chrome.runtime.sendMessage({
      type: "MAIL_SYNC"
    });
    if (!result?.ok) throw new Error(result?.error || "同步失败");
    await refreshMailState();
    updateBridgeState("success", "同步完成");
  } catch (error) {
    await refreshMailState();
    updateBridgeState("error", "同步失败");
    alert(error.message || "同步失败");
  } finally {
    button.disabled = false;
    button.textContent = "立即同步";
  }
});
$("#retryMailReview").addEventListener("click", async () => {
  const result = await chrome.runtime.sendMessage({ type: "MAIL_RETRY_REVIEW" });
  if (!result?.ok) return alert(result?.error || "重置失败");
    alert(`已标记 ${result.cleared || 0} 封邮件重新识别公司，请重新同步。`);
});

$("#goAiSettings")?.addEventListener("click", () => activateTab("api"));
$("#mailStatusFilter").addEventListener("change", renderMailDashboard);
$("#mailCategoryFilter").addEventListener("change", renderMailDashboard);
$("#mailSort").addEventListener("change", renderMailDashboard);
$("#mailCompanyFilter").addEventListener("input", renderMailDashboard);
$$("[data-mail-view]").forEach(button => button.addEventListener("click", () => {
  db.mailViewPreference = button.dataset.mailView === "calendar" ? "calendar" : "board";
  renderMailView();
}));
$("#mailCalendarPrev").addEventListener("click", () => {
  mailCalendarMonth = new Date(mailCalendarMonth.getFullYear(), mailCalendarMonth.getMonth() - 1, 1);
  renderMailCalendar();
});
$("#mailCalendarNext").addEventListener("click", () => {
  mailCalendarMonth = new Date(mailCalendarMonth.getFullYear(), mailCalendarMonth.getMonth() + 1, 1);
  renderMailCalendar();
});
$("#mailCalendarToday").addEventListener("click", () => {
  const today = new Date();
  mailCalendarMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  mailSelectedDateKey = localDateKey(today);
  renderMailCalendar();
});
$("#mailCalendarGrid").addEventListener("click", event => {
  const day = event.target.closest("[data-calendar-date]");
  if (!day) return;
  mailSelectedDateKey = day.dataset.calendarDate;
  mailAgendaExpanded = true;
  const selected = parseMailDate(mailSelectedDateKey);
  if (selected) mailCalendarMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);
  renderMailView();
});
$("#mailAgendaToggle").addEventListener("click", () => {
  mailAgendaExpanded = !mailAgendaExpanded;
  renderMailView();
});
$("#mailTodoForm").addEventListener("submit", async event => {
  event.preventDefault();
  const input = $("#mailTodoInput");
  const text = input.value.trim();
  if (!text) return;
  const dateKey = mailSelectedDateKey;
  db.mailCalendarTodos = { ...(db.mailCalendarTodos || {}) };
  db.mailCalendarTodos[dateKey] = [...mailCalendarTodos(dateKey), {
    id: mailCalendarTodoId(), text, completed: false, createdAt: new Date().toISOString()
  }];
  await saveMailCalendarTodos();
  input.value = "";
  renderMailCalendar();
});
$("#mailHistoryTable").addEventListener("input", event => {
  const input = event.target.closest(".mail-note");
  if (!input) return;
  clearTimeout(mailNoteTimer);
  mailNoteTimer = setTimeout(async () => {
    db.mailHistory = (db.mailHistory || []).map(item =>
      item.messageId === input.dataset.messageId
        ? { ...item, customNote: input.value.trim() }
        : item
    );
    await chrome.storage.local.set({ mailHistory: db.mailHistory });
  }, 350);
});
async function runMailAction(messageId, action) {
  const statusMap = { completed: "已完成", hung: "已挂", ignored: "已忽略" };
  const status = statusMap[action];
  if (!status) return;
  const messageIds = Array.isArray(messageId) ? messageId : [messageId];
  const messageIdSet = new Set(messageIds.filter(Boolean));
  if (!messageIdSet.size) return;
  const existing = (db.mailHistory || []).find(item => messageIdSet.has(item.messageId));
  const completedAt = action === "completed"
    ? (existing?.completedAt || new Date().toISOString())
    : (status === "已完成" ? existing?.completedAt || null : null);
  db.mailHistory = (db.mailHistory || []).map(item => messageIdSet.has(item.messageId)
    ? { ...item, status, completedAt }
    : item);
  await chrome.storage.local.set({ mailHistory: db.mailHistory });
  renderMailDashboard();
  toast(`已标记为${status}`, "success");
}

async function deleteMailTasks(messageIds) {
  const messageIdSet = new Set(messageIds.filter(Boolean));
  if (!messageIdSet.size) return;
  db.mailHistory = (db.mailHistory || []).filter(item => !messageIdSet.has(item.messageId));
  await chrome.storage.local.set({ mailHistory: db.mailHistory });
  renderMailDashboard();
  toast("邮件待办已删除", "success");
}

$("#mailHistoryTable").addEventListener("change", async event => {
  const input = event.target.closest(".mail-company-input");
  if (!input) return;
  const value = input.value.trim();
  const messageId = input.dataset.messageId;
  db.mailHistory = (db.mailHistory || []).map(item => item.messageId === messageId
    ? { ...item, company: value || null, companyLocked: Boolean(value), companySource: value ? "manual" : "", needsCompanyReview: !value }
    : item);
  const current = db.mailHistory.find(item => item.messageId === messageId);
  db.mailCompanyAliases = { ...(db.mailCompanyAliases || {}) };
  if (value && current?.companyRaw) db.mailCompanyAliases[String(current.companyRaw).trim()] = value;
  await chrome.storage.local.set({ mailHistory: db.mailHistory, mailCompanyAliases: db.mailCompanyAliases });
  renderMailDashboard();
  toast(value ? "公司名称已修正并记忆" : "已清除公司名称", "success");
});
$("#mailHistoryTable").addEventListener("keydown", event => {
  const input = event.target.closest(".mail-company-input");
  if (input && event.key === "Enter") {
    event.preventDefault();
    input.blur();
  }
});
$("#mailHistoryTable").addEventListener("change", async event => {
  const select = event.target.closest(".mail-action");
  if (!select?.value) return;
  select.disabled = true;
  try {
    await runMailAction(select.dataset.messageId, select.value);
  } catch (error) {
    select.value = "";
    alert(error.message || "邮件操作失败");
  } finally {
    select.disabled = false;
  }
});
$("#mailCalendarView").addEventListener("click", async event => {
  const todoToggle = event.target.closest(".mail-todo-toggle");
  if (todoToggle) {
    const todoId = todoToggle.dataset.todoId;
    db.mailCalendarTodos = { ...(db.mailCalendarTodos || {}) };
    db.mailCalendarTodos[mailSelectedDateKey] = mailCalendarTodos(mailSelectedDateKey).map(todo =>
      todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
    );
    await saveMailCalendarTodos();
    renderMailCalendar();
    return;
  }
  const todoDelete = event.target.closest(".mail-todo-delete");
  if (todoDelete) {
    if (!confirm("确认删除这条 Todo？")) return;
    const todoId = todoDelete.dataset.todoId;
    db.mailCalendarTodos = { ...(db.mailCalendarTodos || {}) };
    const remaining = mailCalendarTodos(mailSelectedDateKey).filter(todo => todo.id !== todoId);
    if (remaining.length) db.mailCalendarTodos[mailSelectedDateKey] = remaining;
    else delete db.mailCalendarTodos[mailSelectedDateKey];
    await saveMailCalendarTodos();
    renderMailCalendar();
    return;
  }
  const completeButton = event.target.closest(".mail-complete");
  if (completeButton) {
    completeButton.disabled = true;
    try {
      await runMailAction(mailTaskMessageIds(completeButton.dataset.messageIds), "completed");
    } catch (error) {
      alert(error.message || "邮件操作失败");
    } finally {
      completeButton.disabled = false;
    }
    return;
  }
  const deleteButton = event.target.closest(".mail-delete");
  if (!deleteButton) return;
  const messageIds = mailTaskMessageIds(deleteButton.dataset.messageIds);
  const suffix = messageIds.length > 1 ? `及 ${messageIds.length - 1} 条重复提醒` : "";
  if (!confirm(`确认删除这条邮件待办${suffix}？`)) return;
  deleteButton.disabled = true;
  try {
    await deleteMailTasks(messageIds);
  } catch (error) {
    alert(error.message || "删除失败");
  } finally {
    deleteButton.disabled = false;
  }
});
document.addEventListener("change", async event => {
  const input = event.target.closest(".mail-completed-at");
  if (!input) return;
  const completedAt = input.value ? new Date(`${input.value}T12:00:00`).toISOString() : null;
  const messageIds = input.dataset.messageIds ? mailTaskMessageIds(input.dataset.messageIds) : [input.dataset.messageId];
  const messageIdSet = new Set(messageIds.filter(Boolean));
  if (!messageIdSet.size) return;
  db.mailHistory = (db.mailHistory || []).map(item =>
    messageIdSet.has(item.messageId)
      ? { ...item, completedAt, status: completedAt ? "已完成" : item.status }
      : item
  );
  await chrome.storage.local.set({ mailHistory: db.mailHistory });
  renderMailDashboard();
});
$$("[data-native-platform]").forEach(button => {
  button.addEventListener("click", async () => {
    db.nativeHostPlatform = button.dataset.nativePlatform;
    await chrome.storage.local.set({ nativeHostPlatform: db.nativeHostPlatform });
    renderNativeHostPlatform(db.nativeHostPlatform);
  });
});
$("#copyMailInstall").addEventListener("click", async () => {
  await navigator.clipboard.writeText($("#mailInstallCommand").textContent);
  $("#copyMailInstall").textContent = "已复制";
  setTimeout(() => { $("#copyMailInstall").textContent = "复制"; }, 1200);
});

$("#importLocalConfig").addEventListener("click", async () => {
  const button = $("#importLocalConfig");
  const status = $("#localConfigStatus");
  button.disabled = true;
  button.textContent = "导入中…";
  status.dataset.touched = "1";
  try {
    const result = await importLocalConfig({ force: true });
    if (!result?.ok) throw new Error(result?.error || "导入失败");
    renderAiProviders();
    renderMailSettings();
    status.dataset.touched = "1";
    status.textContent = "已导入本地配置";
  } catch (error) {
    status.dataset.touched = "1";
    status.textContent = `导入失败：${error.message || error}`;
  } finally {
    button.disabled = false;
    button.textContent = "导入本地配置";
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (
    area !== "local" ||
    (!changes.mailHistory && !changes.mailSyncStatus && !changes.mailCalendarTodos)
  ) return;
  if (changes.mailHistory) db.mailHistory = changes.mailHistory.newValue || [];
  if (changes.mailSyncStatus) db.mailSyncStatus = changes.mailSyncStatus.newValue || {};
  if (changes.mailCalendarTodos) db.mailCalendarTodos = changes.mailCalendarTodos.newValue || {};
  renderMailDashboard();
});

$("#showImport").addEventListener("click", () => {
  $("#importPanel").classList.remove("hidden");
  $("#importPanel").scrollIntoView({ behavior: "smooth", block: "start" });
});

$("#closeImport").addEventListener("click", () => {
  $("#importPanel").classList.add("hidden");
});

$("#resumeFile").addEventListener("change", event => {
  const file = event.target.files[0];
  $("#fileName").textContent = file ? file.name : "选择 PDF、DOCX、TXT 或 Markdown 简历";
  parsedDraft = null;
  $("#parseResult").innerHTML = "";
  setParseStatus("");
});

function setParseStatus(message, state = "") {
  const node = $("#parseStatus");
  node.textContent = message;
  node.className = `parse-status ${state}`.trim();
}

async function ensureApiPermission(apiBase) {
  const pattern = `${new URL(apiBase).origin}/*`;
  return chrome.permissions.request({ origins: [pattern] });
}

async function ensureProviderPermissions(providers) {
  const origins = [...new Set(providers.map(provider => `${new URL(provider.apiBase).origin}/*`))];
  if (!origins.length) return true;
  return chrome.permissions.request({ origins });
}

$("#parseResume").addEventListener("click", async () => {
  const file = $("#resumeFile").files[0];
  if (!file) {
    setParseStatus("请先选择一份简历文件", "error");
    return;
  }

  const providers = activeAiProviders();
  const button = $("#parseResume");
  button.disabled = true;
  try {
    setParseStatus("正在本地读取简历文本…");
    const text = await extractResumeText(file);
    if (text.trim().length < 30) throw new Error("没有读取到足够的简历文本，请确认文件不是扫描图片");
    const localDraft = parseResumeLocally(text, file.name);
    const localWorks = splitInternshipsIfMerged(localDraft.internships, text);
    // Structured resumes (clear 实习经历 headers) should trust local split first —
    // AI often merges segments or leaks 学术成果 on noisy PDF text.
    if (localWorks.length >= 2) {
      parsedDraft = {
        ...localDraft,
        internships: localWorks,
        personal: { name: "", email: "" },
        education: null,
        parseSource: "local"
      };
      setParseStatus(`已按「实习经历」识别 ${localWorks.length} 段：${localWorks.map(item => item.company || item.position || "?").join(" / ")}`, "success");
    } else if (providers.length) {
      const permitted = await ensureProviderPermissions(providers);
      if (permitted) {
        setParseStatus(`已读取 ${text.length.toLocaleString()} 个字符，正在提取关键信息…`);
        try {
          const aiDraft = await parseInternships(text, file.name, providers);
          const aiWorks = splitInternshipsIfMerged(aiDraft.internships || [], text)
            .filter(work => !/学术|论文|助理/.test(`${work.company}${work.position}${work.description}`));
          parsedDraft = {
            ...aiDraft,
            internships: aiWorks.length >= localWorks.length ? aiWorks : localWorks,
            personal: { name: "", email: "" },
            education: null,
            parseSource: aiWorks.length >= localWorks.length ? "ai" : "local"
          };
        } catch (error) {
          if (!localWorks.length) throw error;
          parsedDraft = {
            ...localDraft,
            internships: localWorks,
            personal: { name: "", email: "" },
            education: null,
            parseSource: "local"
          };
        }
      } else {
        parsedDraft = {
          ...localDraft,
          internships: localWorks,
          personal: { name: "", email: "" },
          education: null,
          parseSource: "local"
        };
      }
    } else {
      parsedDraft = {
        ...localDraft,
        internships: localWorks,
        personal: { name: "", email: "" },
        education: null,
        parseSource: "local"
      };
    }
    if (!parsedDraft.internships.length) {
      throw new Error("未识别到实习经历，请确认简历中包含起止时间和公司信息");
    }
    try {
      parsedDraft.resumeFile = await serializeResumeFile(file);
    } catch (error) {
      parsedDraft.resumeFile = null;
      parsedDraft.resumeFileWarning = error.message || "原文件无法绑定为简历附件";
    }
    renderParsedDraft();
    const companyPreview = parsedDraft.internships
      .map(item => item.company || item.position || "?")
      .filter(Boolean)
      .join(" / ");
    setParseStatus(
      `解析完成：识别到 ${parsedDraft.internships.length} 段实习经历${parsedDraft.parseSource === "local" ? "（本地解析）" : ""}${companyPreview ? `：${companyPreview}` : ""}${parsedDraft.resumeFileWarning ? `；${parsedDraft.resumeFileWarning}` : ""}`,
      parsedDraft.resumeFileWarning ? "" : "success"
    );
  } catch (error) {
    console.error(error);
    setParseStatus(error.message || "解析失败，请检查文件内容", "error");
  } finally {
    button.disabled = false;
  }
});

async function extractResumeText(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  if (["txt", "md"].includes(extension)) return file.text();
  if (extension === "docx") return extractDocxText(await file.arrayBuffer());
  if (extension === "pdf") return extractPdfText(await file.arrayBuffer());
  throw new Error("暂不支持该文件格式，请使用 PDF、DOCX、TXT 或 Markdown");
}

function extractDocxText(buffer) {
  let archive;
  try {
    archive = fflate.unzipSync(new Uint8Array(buffer));
  } catch {
    throw new Error("DOCX 文件无法解压，请确认文件未损坏");
  }
  const documentXml = archive["word/document.xml"];
  if (!documentXml) throw new Error("DOCX 中没有找到正文内容");
  const xml = new DOMParser().parseFromString(new TextDecoder().decode(documentXml), "application/xml");
  if (xml.querySelector("parsererror")) throw new Error("DOCX 正文格式无法解析");
  return [...xml.getElementsByTagNameNS("*", "p")]
    .map(paragraph => {
      const text = [...paragraph.getElementsByTagNameNS("*", "t")].map(node => node.textContent).join("");
      if (!text.trim()) return "";
      const isList = paragraph.getElementsByTagNameNS("*", "numPr").length > 0;
      return `${isList ? "• " : ""}${text.trim()}`;
    })
    .filter(Boolean)
    .join("\n");
}

function appendTextPart(line, part) {
  if (!line) return part;
  const needsSpace = /[A-Za-z0-9)]$/.test(line) && /^[A-Za-z0-9(]/.test(part);
  return `${line}${needsSpace ? " " : ""}${part}`;
}

async function extractPdfText(buffer) {
  const pdfjs = await import(chrome.runtime.getURL("vendor/pdf.min.mjs"));
  pdfjs.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("vendor/pdf.worker.min.mjs");
  const task = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    cMapUrl: chrome.runtime.getURL("vendor/cmaps/"),
    cMapPacked: true,
    standardFontDataUrl: chrome.runtime.getURL("vendor/standard_fonts/")
  });
  const pdf = await task.promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const lines = [];
    let line = "";
    let previousY = null;
    for (const item of content.items) {
      const value = item.str?.trim();
      if (!value) continue;
      const y = item.transform?.[5];
      if (previousY !== null && y !== undefined && Math.abs(y - previousY) > 2.5) {
        if (line) lines.push(line);
        line = "";
      }
      line = appendTextPart(line, value);
      previousY = y;
      if (item.hasEOL) {
        if (line) lines.push(line);
        line = "";
        previousY = null;
      }
    }
    if (line) lines.push(line);
    pages.push(lines.join("\n"));
  }
  return pages.join("\n\n");
}

function resumeTextLines(resumeText) {
  return String(resumeText || "")
    .replace(/\r/g, "")
    .split(/\n+/)
    .map(line => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function normalizeResumeMonth(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function healSpacedDateTokens(value) {
  // pdf.js sometimes inserts spaces inside dates: "202 4/03-202 4/0 6"
  return String(value || "").replace(/(\d)\s+(?=\d)/g, "$1");
}

function resumeDateRange(line) {
  const match = healSpacedDateTokens(line).match(
    /((?:19|20)\d{2})\s*[./年-]\s*(\d{1,2})\s*月?\s*(?:-|—|–|~|～|至|到)\s*(?:(至今|现在|今)|((?:19|20)\d{2})\s*[./年-]\s*(\d{1,2})\s*月?)/i
  );
  if (!match) return null;
  return {
    source: match[0],
    start: normalizeResumeMonth(match[1], match[2]),
    end: match[3] ? "至今" : normalizeResumeMonth(match[4], match[5])
  };
}

function resumeBasics(resumeText) {
  const lines = resumeTextLines(resumeText);
  const joined = lines.join("\n");
  const email = joined.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const explicitName = joined.match(/(?:姓名|Name)\s*[：:]\s*([\u3400-\u9fff·]{2,8}|[A-Za-z][A-Za-z ]{1,30})/i)?.[1] || "";
  const headingPattern = /^(个人信息|基本信息|教育经历|实习经历|工作经历|项目经历|求职意向|自我评价)$/;
  const name = explicitName || lines.slice(0, 12).find(line =>
    /^[\u3400-\u9fff·]{2,4}$/.test(line) && !headingPattern.test(line)
  ) || "";
  const schoolLine = lines.find(line =>
    !/^(教育经历|学校|学院)$/.test(line) &&
    /[\u3400-\u9fffA-Za-z·]{2,40}(?:大学|学院|学校)/.test(line) &&
    line.length <= 80
  ) || "";
  const school = schoolLine.match(/[\u3400-\u9fffA-Za-z·]{2,40}(?:大学|学院|学校)/)?.[0] || "";
  const explicitMajor = joined.match(/(?:专业|Major)\s*[：:]\s*([^\n|｜]{2,30})/i)?.[1]?.trim() || "";
  const schoolParts = schoolLine.split(/\s*[|｜]\s*|\s{2,}/).filter(Boolean);
  const major = explicitMajor || schoolParts.find(part =>
    part !== school && !/本科|硕士|博士|学士|研究生|20\d{2}/.test(part)
  ) || "";
  return {
    personal: { name: name.trim(), email: email.trim() },
    education: school ? { school: school.trim(), major: major.trim() } : null
  };
}

function internshipHeaderValues(line) {
  const range = resumeDateRange(line);
  const clean = String(line)
    .replace(range?.source || "", " ")
    .replace(/[|｜]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const companyPattern = /[\u3400-\u9fffA-Za-z0-9·（）()]{2,40}(?:公司|集团|银行|证券|科技|海通|跳动|研究院|实验室|事务所|中心|工作室|学院)/;
  const company = clean.match(companyPattern)?.[0] || "";
  const parts = clean.split(/\s+/).filter(Boolean);
  const position = parts.find(part =>
    part !== company && /实习|产品|运营|开发|算法|设计|工程师|助理|经理|分析|研究/.test(part)
  ) || (company ? clean.replace(company, "").trim() : parts[1] || "");
  const department = parts.find(part => /部$|部门$|中心$/.test(part) && part !== company) || "";
  return {
    company: company || parts[0] || "",
    department,
    position
  };
}


function healBrokenPdfLines(lines) {
  const result = [];
  const isSectionMarker = (value) => /^(教育背景|教育经历|实习经历|实习经|工作经历|工作经验|科研经历|科研|项目经历|学术成果|AI项目|AI实践|技能|证书|自我评价)/.test(String(value || "").trim());
  for (const raw of lines) {
    const line = healSpacedDateTokens(String(raw || "").trim());
    if (!line) continue;
    const prev = result[result.length - 1];
    if (!prev) {
      result.push(line);
      continue;
    }
    if (isSectionMarker(prev) || isSectionMarker(line)) {
      result.push(line);
      continue;
    }
    const prevDate = resumeDateRange(prev);
    const curDate = resumeDateRange(line);
    const prevIsBullet = /^[*●▪◦•·|\-–—]/.test(prev) || /^(业务背景|职责|成果|工作内容)\s*[:：]/.test(prev);
    const curIsBullet = /^[*●▪◦•·|\-–—]/.test(line) || /^(业务背景|职责|成果|工作内容)\s*[:：]/.test(line);
    const prevEnds = /[。！？；;!?:：)]$/.test(prev);
    const curStartsLatin = /^[A-Za-z0-9]/.test(line);
    const prevEndsLatin = /[A-Za-z0-9]$/.test(prev);
    const curLooksHeader = (/[|｜]/.test(line) || /(?:公司|集团|银行|证券|科技|跳动|海通|美团|小红书|研究院|实验室|有限公司|中心|学院)/.test(line)) && line.length <= 60;
    if (!prevDate && !curDate && !curIsBullet && !curLooksHeader && !prevEnds && !(prevIsBullet && curStartsLatin === false && line.length < 4)) {
      const glue = (prevEndsLatin && curStartsLatin) ? " " : "";
      result[result.length - 1] = `${prev}${glue}${line.replace(/^[*●▪◦•·|\-–—]\s*/, "")}`;
      continue;
    }
    result.push(line);
  }
  return result;
}

function splitInternshipsIfMerged(internships, resumeText) {
  const list = Array.isArray(internships) ? internships.filter(Boolean) : [];
  if (list.length !== 1) return list;
  const only = list[0];
  const blob = [only.description, ...(only.bullets || [])].filter(Boolean).join("\n");
  const lines = healBrokenPdfLines(resumeTextLines(blob));
  const dateHits = lines
    .map((line, index) => ({ line, index, range: resumeDateRange(line) }))
    .filter(item => item.range);
  // Also try splitting from full resume local parse when AI collapsed everything.
  const local = localInternships(resumeText);
  if (local.length >= 2) return local;
  if (dateHits.length < 2) return list;
  // Split the single blob by in-description date lines.
  const chunks = [];
  for (let i = 0; i < dateHits.length; i += 1) {
    const cur = dateHits[i];
    const next = dateHits[i + 1];
    const headerLine = lines[cur.index];
    const withoutDate = headerLine.replace(cur.range.source, "").replace(/[|｜]/g, " ").trim();
    const previous = lines[cur.index - 1] || "";
    const header = internshipHeaderValues(`${withoutDate || previous} ${cur.range.source}`);
    const body = lines.slice(cur.index + 1, next ? next.index : lines.length)
      .map(item => item.replace(/^[*●▪◦•·|\-–—]\s*/, "").trim())
      .filter(Boolean);
    chunks.push(normalizeInternship({
      ...header,
      type: "实习",
      start: cur.range.start,
      end: cur.range.end,
      bullets: body
    }));
  }
  return chunks.filter(work => work.company || work.position || work.description).length >= 2
    ? chunks.filter(work => work.company || work.position || work.description)
    : list;
}



function isInternshipSectionTitle(line) {
  const text = String(line || "").trim();
  return /实习经历|工作经历|工作经验/.test(text) || /^实习经/.test(text);
}

function isInternshipSectionEnd(line) {
  const text = String(line || "").trim();
  return /^(教育背景|教育经历|教育|项目经历|项目经验|校园经历|科研经历|科研|技能|证书|获奖|荣誉|自我评价|个人总结|作品|论文|学术成果|学术研究|AI项目经历|AI实践|AI项目|其他)([\s\/·•|\-].*)?$/.test(text);
}

function isAcademicNoiseLine(line) {
  return /^(学术研究|发表论文|学生助理|论文|专利)\s*[:：]?/.test(String(line || "").trim());
}

function isDateOnlyLine(line) {
  const text = String(line || "").trim();
  const range = resumeDateRange(text);
  if (!range) return false;
  return !text.replace(range.source, "").trim();
}

function isInternshipHeaderLine(line) {
  const text = String(line || "").trim();
  if (!text || isInternshipSectionTitle(text) || isInternshipSectionEnd(text) || isAcademicNoiseLine(text)) return false;
  if (isDateOnlyLine(text)) return false;
  // Real PDFs usually put company|dept-role on its own line (date on the next line).
  if (/[|｜]/.test(text)) {
    const left = text.split(/[|｜]/)[0].replace(resumeDateRange(text)?.source || "", "").trim();
    if (left.length >= 2 && left.length <= 40) return true;
  }
  const range = resumeDateRange(text);
  const withoutDate = range ? text.replace(range.source, "").trim() : text;
  if (range && withoutDate.length >= 2) {
    if (/\s[-–—-]\s/.test(withoutDate) || /实习生|产品经理|研究|分析|承做|助理|专家/.test(withoutDate)) return true;
    if (/(?:公司|集团|银行|证券|科技|跳动|海通|美团|小红书|研究院|实验室|中心|学院)/.test(withoutDate)) return true;
    if (withoutDate.length <= 48) return true;
  }
  // Dash-only org headers without pipe, e.g. 复旦大学泛海学院 - 绿色金融研究中心
  if (!range && /[-–—-]/.test(text) && /(?:大学|学院|中心|研究院)/.test(text) && text.length <= 40) return true;
  return false;
}

function parseInternshipHeaderLine(line) {
  const range = resumeDateRange(line);
  const raw = String(line || "").replace(range?.source || "", "").trim();
  const clean = raw.replace(/\s+/g, " ");
  let company = "";
  let department = "";
  let position = "";
  if (/[|｜]/.test(clean)) {
    const parts = clean.split(/\s*[|｜]\s*/);
    company = (parts[0] || "").trim();
    const right = parts.slice(1).join(" | ").trim();
    const roleSplit = right.split(/\s*[-–—-]\s*/);
    if (roleSplit.length >= 2) {
      department = roleSplit.slice(0, -1).join(" - ").trim();
      position = roleSplit[roleSplit.length - 1].trim();
    } else {
      position = right;
    }
  } else if (/\s*[-–—-]\s*/.test(clean)) {
    const roleSplit = clean.split(/\s*[-–—-]\s*/).filter(Boolean);
    company = (roleSplit[0] || "").trim();
    position = roleSplit.slice(1).join(" - ").trim();
  } else {
    const fallback = internshipHeaderValues(`${clean} ${range?.source || ""}`);
    company = fallback.company;
    department = fallback.department;
    position = fallback.position;
  }
  return {
    company,
    department,
    position,
    start: range?.start || "",
    end: range?.end || ""
  };
}

function normalizeInternshipBody(header, bodyLines) {
  const bullets = [];
  let background = "";
  for (const item of bodyLines) {
    const line = String(item || "").trim();
    if (!line || isInternshipSectionTitle(line) || isInternshipHeaderLine(line) || isDateOnlyLine(line)) continue;
    if (/^业务背景\s*[:：]/.test(line)) {
      background = line.replace(/^业务背景\s*[:：]\s*/, "").trim();
      continue;
    }
    // PDF often emits a lone bullet glyph on its own line before the content line.
    if (/^[*●▪◦•·]$/.test(line)) continue;
    bullets.push(line.replace(/^[*●▪◦•·|\-–—]\s*/, "").trim());
  }
  return normalizeInternship({
    ...header,
    type: "实习",
    businessBackground: background,
    bullets: bullets.filter(Boolean)
  });
}

function localInternships(resumeText) {
  const lines = healBrokenPdfLines(resumeTextLines(resumeText));
  const startIndex = lines.findIndex(isInternshipSectionTitle);
  const sectionStart = startIndex >= 0 ? startIndex + 1 : 0;
  let sectionEnd = lines.length;
  for (let index = sectionStart; index < lines.length; index += 1) {
    if (isInternshipSectionEnd(lines[index]) || isAcademicNoiseLine(lines[index])) {
      sectionEnd = index;
      break;
    }
  }
  // If the section title was missing/glued, still prefer content before 科研/学术.
  if (startIndex < 0) {
    const fallbackEnd = lines.findIndex((line, index) => index > 0 && (isInternshipSectionEnd(line) || isAcademicNoiseLine(line)));
    if (fallbackEnd > 0) sectionEnd = fallbackEnd;
  }
  const section = lines.slice(sectionStart, sectionEnd).filter(line => !isAcademicNoiseLine(line));

  const headerIndexes = [];
  for (let index = 0; index < section.length; index += 1) {
    if (isInternshipHeaderLine(section[index])) headerIndexes.push(index);
  }

  const entries = [];
  for (let i = 0; i < headerIndexes.length; i += 1) {
    const headerIndex = headerIndexes[i];
    const nextHeaderIndex = headerIndexes[i + 1] ?? section.length;
    let header = parseInternshipHeaderLine(section[headerIndex]);
    let bodyStart = headerIndex + 1;
    if ((!header.start || !header.end) && bodyStart < nextHeaderIndex && isDateOnlyLine(section[bodyStart])) {
      const range = resumeDateRange(section[bodyStart]);
      header = { ...header, start: range.start, end: range.end };
      bodyStart += 1;
    }
    const body = section.slice(bodyStart, nextHeaderIndex);
    const work = normalizeInternshipBody(header, body);
    const blob = `${work.company}${work.department}${work.position}${work.description}`;
    const looksContact = /@|微信|每周|意向岗位|产品经理\|不限Base|不限Base/.test(blob) && !work.start;
    const looksEducation = (/大学|学院/.test(work.company) && /学士|硕士|博士|本科|研究生|金融学/.test(`${work.department}${work.position}`))
      || (/学士|硕士|博士/.test(`${work.position}${work.department}`) && /大学/.test(work.company));
    const isResearchCenter = /研究中心|实验室|研究院/.test(blob);
    if (looksContact || (looksEducation && !isResearchCenter)) continue;
    if (!(work.start || work.end)) continue;
    // Drop pure research-paper rows that leaked after a weak section end.
    if (/管理世界|CSSCI|发表/.test(blob) && /化债|论文|期刊/.test(blob)) continue;
    if (work.company || work.position || work.description) entries.push(work);
  }
  if (entries.length) return entries;

  const dateIndexes = section
    .map((line, index) => (resumeDateRange(line) ? index : -1))
    .filter(index => index >= 0);
  return dateIndexes.map((dateIndex, entryIndex) => {
    const dateLine = section[dateIndex];
    const prevLine = section[dateIndex - 1] || "";
    const headerLine = isDateOnlyLine(dateLine) ? prevLine : dateLine;
    const range = resumeDateRange(dateLine);
    const header = {
      ...parseInternshipHeaderLine(headerLine),
      start: range?.start || "",
      end: range?.end || ""
    };
    const nextDateIndex = dateIndexes[entryIndex + 1] ?? section.length;
    const body = section.slice(dateIndex + 1, nextDateIndex);
    return normalizeInternshipBody(header, body);
  }).filter(work => {
    if (!(work.start || work.end)) return false;
    if (/@|微信|每周/.test(`${work.company}${work.position}`)) return false;
    if (/大学/.test(work.company) && /学士|硕士|金融学/.test(`${work.department}${work.position}`) && !/研究中心/.test(`${work.company}${work.position}`)) return false;
    return work.company || work.position || work.description;
  });
}





function parseResumeLocally(resumeText, fileName) {
  // Resume-version parse is internship-only. Labeled MD import has its own path
  // (parseLabeledResumeMarkdown) and must not hijack PDF/text upload parsing.
  return {
    versionName: fileName.replace(/\.[^.]+$/, ""),
    attachment: fileName,
    internships: localInternships(resumeText),
    personal: { name: "", email: "" },
    education: null,
    parseSource: "local",
    parserBuild: "2026-09-07-pdfjs-headers"
  };
}

function chatEndpoint(apiBase) {
  const base = apiBase.trim().replace(/\/+$/, "");
  if (/\/chat\/completions$/i.test(base)) return base;
  return `${base}/chat/completions`;
}

function shouldFallbackAi(error) {
  if (error?.retryable) return true;
  const status = Number(error?.status || 0);
  return status === 401 || status === 402 || status === 403 || status === 408 ||
    status === 409 || status === 429 || status >= 500;
}

async function requestInternshipParse(provider, body) {
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
    const error = new Error(`AI 服务请求失败（${response.status}）：${bodyText.slice(0, 180)}`);
    error.status = response.status;
    throw error;
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI 服务没有返回解析结果");
  return content;
}

async function parseInternships(resumeText, fileName, providers) {
  const systemPrompt = `你是简历信息抽取器。只提取“实习经历”或明确属于实习的工作经历，禁止总结、润色、改写、合并或遗漏原文。

输出必须是一个 JSON 对象，结构如下：
{
  "internships": [
    {
      "company": "公司全称",
      "department": "部门，原文没有则为空字符串",
      "position": "职位",
      "type": "实习",
      "city": "城市，原文没有则为空字符串",
      "start": "YYYY-MM，无法确定则保留原文",
      "end": "YYYY-MM或至今，无法确定则保留原文",
      "businessBackground": "业务背景完整原文，原文没有则为空字符串",
      "bullets": ["原文职责/成果条目1", "原文职责/成果条目2"]
    }
  ]
}

严格要求：
1. 有几段不同公司或不同起止时间的实习，就必须输出几个 internships 元素；严禁把多段实习合并成一段。
2. businessBackground 必须完整保留该段实习中的“业务背景”原文；不得总结、缩写或并入其他职责。
3. bullets 必须覆盖该段实习下的全部职责和成果；每个圆点/条目一个数组元素。
4. 保留小标题、冒号、数字、百分比、英文缩写和因果链，不得压缩成概述。
5. PDF 排版换行要拼回同一条完整句子；不要把半句话拆成两条 bullets。只有新的职责/成果条目才拆分。
6. 不提取姓名、邮箱、教育、校园、项目、论文、技能、证书、自我评价。
7. 不确定字段用空字符串，不得编造。只返回 JSON。`;

  const body = {
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `文件名：${fileName}\n\n简历全文：\n${resumeText.slice(0, 60000)}` }
    ]
  };

  const errors = [];
  let content = "";
  for (const provider of providers) {
    try {
      content = await requestInternshipParse(provider, body);
      break;
    } catch (error) {
      errors.push(`${provider.name || provider.model}: ${error.message || error}`);
      if (!shouldFallbackAi(error)) throw error;
    }
  }
  if (!content) throw new Error(`所有启用模型均不可用：${errors.join("；")}`);
  const json = parseJsonContent(content);
  const internships = Array.isArray(json.internships) ? json.internships : [];
  if (!internships.length) throw new Error("未识别到实习经历，请确认简历中包含“实习经历”部分");

  const normalized = internships.map(normalizeInternship);
  return {
    versionName: fileName.replace(/\.[^.]+$/, ""),
    attachment: fileName,
    internships: splitInternshipsIfMerged(normalized, resumeText)
  };
}

function parseJsonContent(content) {
  const source = String(content).replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI 返回内容不是有效 JSON");
  try {
    return JSON.parse(source.slice(start, end + 1));
  } catch {
    throw new Error("AI 返回的 JSON 无法解析，请重试");
  }
}

function splitBulletLines(value) {
  return String(value || "")
    .split(/\n+/)
    .map(line => line.trim().replace(/^[•●▪◦·\-–—]\s*/, ""))
    .filter(Boolean);
}

function normalizeInternship(work) {
  const dutyBullets = Array.isArray(work.bullets)
    ? work.bullets.map(item => String(item).trim()).filter(Boolean)
    : splitBulletLines(work.description);
  const background = String(work.businessBackground || "").trim();
  const hasBackground = dutyBullets.some(item => /^业务背景\s*[：:]/.test(item));
  const bullets = background && !hasBackground
    ? [`业务背景：${background.replace(/^业务背景\s*[：:]\s*/, "")}`, ...dutyBullets]
    : dutyBullets;
  return {
    company: String(work.company || "").trim(),
    department: String(work.department || "").trim(),
    position: String(work.position || "").trim(),
    type: String(work.type || "实习").trim(),
    city: String(work.city || "").trim(),
    start: String(work.start || "").trim(),
    end: String(work.end || "").trim(),
    businessBackground: background,
    bullets,
    description: bullets.map(item => `• ${item.replace(/^[•●▪◦·\-–—]\s*/, "")}`).join("\n")
  };
}

function renderParsedDraft() {
  $("#parseResult").innerHTML = `
    <div class="parse-preview">
      <div class="parse-preview-head">
        <div class="field"><label>新版本名称</label><input id="parsedVersionName" value="${safe(parsedDraft.versionName)}"></div>
        <button class="btn primary" id="createParsedVersion">确认并创建版本</button>
      </div>

      ${parsedDraft.internships.map((work, index) => `
        <div class="parsed-work" data-parsed-work="${index}">
          <div class="record-title">
            <strong>实习经历 ${index + 1}</strong>
            <button class="btn ghost small danger-btn" data-remove-parsed="${index}">移除</button>
          </div>
          <div class="modal-grid">
            <div class="field"><label>公司</label><input data-parsed-field="company" value="${safe(work.company)}"></div>
            <div class="field"><label>部门</label><input data-parsed-field="department" value="${safe(work.department)}"></div>
            <div class="field"><label>职位</label><input data-parsed-field="position" value="${safe(work.position)}"></div>
            <div class="field"><label>城市</label><input data-parsed-field="city" value="${safe(work.city)}"></div>
            <div class="field"><label>开始时间</label><input data-parsed-field="start" value="${safe(work.start)}"></div>
            <div class="field"><label>结束时间</label><input data-parsed-field="end" value="${safe(work.end)}"></div>
          </div>
          <div class="field">
            <label>职责与成果原文</label>
            <textarea data-parsed-field="description" rows="8">${safe(work.description)}</textarea>
            <div class="bullet-hint">每个原文条目单独一行；确认前可直接修正。</div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
  $("#createParsedVersion").onclick = createVersionFromParsed;
  $$("[data-remove-parsed]").forEach(button => {
    button.onclick = () => {
      parsedDraft.internships = readParsedWorkCards();
      parsedDraft.internships.splice(Number(button.dataset.removeParsed), 1);
      renderParsedDraft();
      setParseStatus(`当前保留 ${parsedDraft.internships.length} 段实习经历`, "success");
    };
  });
}

function readParsedWorkCards() {
  return $$("[data-parsed-work]").map(card => {
    const record = { type: "实习" };
    card.querySelectorAll("[data-parsed-field]").forEach(input => {
      record[input.dataset.parsedField] = input.value.trim();
    });
    record.bullets = splitBulletLines(record.description);
    record.description = record.bullets.map(item => `• ${item}`).join("\n");
    return record;
  });
}

function readParsedBasics() {
  return Object.fromEntries(
    $$("[data-parsed-basic]").map(input => [
      input.dataset.parsedBasic,
      input.value.trim()
    ])
  );
}

async function createVersionFromParsed() {
  const name = $("#parsedVersionName").value.trim();
  if (!name) return $("#parsedVersionName").focus();
  const works = readParsedWorkCards();
  if (!works.length) {
    setParseStatus("至少保留一段实习经历后才能创建版本", "error");
    return;
  }

  const profile = {
    id: crypto.randomUUID(),
    name,
    target: "",
    summary: "",
    attachment: parsedDraft.attachment,
    resumePath: parsedDraft.resumeFile?.name || "",
    resumeFile: parsedDraft.resumeFile || null,
    work: works,
    openQuestions: []
  };
  const previousActiveProfileId = db.activeProfileId;
  const previousPersonal = { ...(db.personal || {}) };
  const previousEducation = [...(db.education || [])];
  // Resume-version parse is internship-only: never overwrite personal/education here.
  db.profiles.push(profile);
  db.activeProfileId = profile.id;
  try {
    await chrome.storage.local.set({
      profiles: db.profiles,
      activeProfileId: db.activeProfileId,
      personal: db.personal,
      education: db.education
    });
    renderVersions();
    renderBasic();
    renderList("education");
  } catch (error) {
    db.profiles.pop();
    db.activeProfileId = previousActiveProfileId;
    db.personal = previousPersonal;
    db.education = previousEducation;
    setParseStatus("版本保存失败；可能是本地存储空间不足", "error");
    return;
  }
  $("#importPanel").classList.add("hidden");
  parsedDraft = null;
  $("#parseResult").innerHTML = "";
  $("#resumeFile").value = "";
  $("#fileName").textContent = "选择 PDF、DOCX、TXT 或 Markdown 简历";
  setParseStatus("");
  openedVersionId = profile.id;
  openVersion(profile.id);
  renderVersions();
  $("#versionEditor").scrollIntoView({ behavior: "smooth", block: "start" });
}

function setMdImportStatus(message, state = "") {
  const node = $("#mdImportStatus");
  if (!node) {
    if (message) toast(message, state === "error" ? "error" : "info");
    return;
  }
  node.textContent = message;
  node.className = `parse-status ${state}`.trim();
}

function mergePersonalFields(target, source = {}) {
  const next = { ...(target || {}) };
  Object.entries(source || {}).forEach(([key, value]) => {
    const text = String(value || "").trim();
    if (!text) return;
    if (!String(next[key] || "").trim()) next[key] = text;
  });
  return next;
}

function appendUniqueRecords(existing, incoming, keyFn) {
  const list = Array.isArray(existing) ? [...existing] : [];
  const seen = new Set(list.map(keyFn));
  for (const item of incoming || []) {
    const key = keyFn(item);
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    list.push(item);
  }
  return list;
}

async function applyLabeledMarkdownImport(parsed) {
  await downloadMigrationBackup("\u7b80\u586bMD\u5bfc\u5165\u524d\u56de\u6eda");
  const previous = {
    personal: { ...(db.personal || {}) },
    education: [...(db.education || [])],
    projects: [...(db.projects || [])],
    awards: [...(db.awards || [])],
    languages: [...(db.languages || [])],
    hobbies: db.hobbies || "",
    profiles: [...(db.profiles || [])],
    activeProfileId: db.activeProfileId
  };

  db.personal = mergePersonalFields(db.personal, parsed.personal);
  db.education = appendUniqueRecords(db.education, parsed.education, item =>
    `${item.school || ""}|${item.major || ""}|${item.level || ""}|${item.start || ""}`
  );
  db.projects = appendUniqueRecords(db.projects, parsed.projects, item =>
    `${item.name || ""}|${item.start || ""}|${(item.content || "").slice(0, 40)}`
  );
  db.awards = appendUniqueRecords(db.awards, parsed.awards, item =>
    `${item.name || ""}|${item.date || ""}`
  );
  db.languages = appendUniqueRecords(db.languages, parsed.languages, item =>
    `${item.language || ""}|${item.proficiency || ""}`
  );
  if (!String(db.hobbies || "").trim() && parsed.summary) db.hobbies = parsed.summary;
  if (!String(db.personal.specialty || "").trim() && parsed.summary) {
    db.personal.specialty = parsed.summary;
  }

  const works = (parsed.internships || []).map(work => ({
    company: work.company || "",
    department: work.department || "",
    position: work.position || "",
    type: work.type || "\u5b9e\u4e60",
    city: work.city || "",
    start: work.start || "",
    end: work.end || "",
    description: work.description || ""
  }));
  if (works.length) {
    const profile = {
      id: crypto.randomUUID(),
      name: parsed.versionName || "MD\u5bfc\u5165\u7248\u672c",
      target: "",
      summary: parsed.summary || "",
      attachment: parsed.attachment || "",
      resumePath: "",
      resumeFile: null,
      work: works,
      openQuestions: []
    };
    db.profiles = db.profiles || [];
    db.profiles.push(profile);
    if (!db.activeProfileId) db.activeProfileId = profile.id;
  }

  try {
    await chrome.storage.local.set({
      personal: db.personal,
      education: db.education,
      projects: db.projects,
      awards: db.awards,
      languages: db.languages,
      hobbies: db.hobbies,
      profiles: db.profiles,
      activeProfileId: db.activeProfileId
    });
  } catch (error) {
    Object.assign(db, previous);
    throw new Error(`\u5199\u5165\u5931\u8d25\uff1a${error.message || error}`);
  }

  renderBasic();
  ["education", "projects", "awards", "languages"].forEach(type => renderList(type));
  if ($("#hobbiesText")) $("#hobbiesText").value = db.hobbies || "";
  renderVersions();
  return parsed.stats || {};
}

async function importResumeMarkdownFile(file) {
  if (typeof parseLabeledResumeMarkdown !== "function") {
    throw new Error("MD \u89e3\u6790\u6a21\u5757\u672a\u52a0\u8f7d");
  }
  const text = await file.text();
  if (text.trim().length < 30) throw new Error("MD \u5185\u5bb9\u8fc7\u77ed\uff0c\u8bf7\u786e\u8ba4\u6587\u4ef6\u6709\u6548");
  const parsed = parseLabeledResumeMarkdown(text, file.name);
  const stats = parsed.stats || {};
  const total = (stats.education || 0) + (stats.internships || 0) + (stats.projects || 0) + (stats.personalFields || 0);
  if (total <= 0 && !stats.hasSummary) {
    throw new Error("\u672a\u8bc6\u522b\u5230\u53ef\u5bfc\u5165\u7684\u7b80\u5386\u5b57\u6bb5");
  }
  return applyLabeledMarkdownImport(parsed);
}

$("#importResumeMarkdown")?.addEventListener("change", async event => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  const label = document.querySelector('label[for="importResumeMarkdown"]');
  setMigrationBusy(true, label);
  setMdImportStatus("\u6b63\u5728\u89e3\u6790 MD \u5e76\u5199\u5165\u8d44\u6599\u5e93\u2026");
  try {
    const stats = await importResumeMarkdownFile(file);
    setMdImportStatus(
      `\u5df2\u5bfc\u5165\uff1a\u4e2a\u4eba\u4fe1\u606f ${stats.personalFields || 0} \u9879\uff0c\u6559\u80b2 ${stats.education || 0}\uff0c\u5b9e\u4e60/\u5de5\u4f5c ${stats.internships || 0}\uff0c\u9879\u76ee ${stats.projects || 0}\uff0c\u8bed\u8a00 ${stats.languages || 0}\uff0c\u83b7\u5956 ${stats.awards || 0}`,
      "success"
    );
    toast("MD \u7b80\u5386\u5df2\u5bfc\u5165\u8d44\u6599\u5e93", "info");
  } catch (error) {
    console.error(error);
    setMdImportStatus(error.message || "MD \u5bfc\u5165\u5931\u8d25", "error");
    toast(error.message || "MD \u5bfc\u5165\u5931\u8d25", "error");
  } finally {
    setMigrationBusy(false, label);
  }
});

async function persistAiSettings() {
  const providers = normalizeAiProviders(db.settings || {});
  db.settings = {
    ...(db.settings || {}),
    aiProviders: providers,
    apiBase: providers[0]?.apiBase || "",
    model: providers[0]?.model || "",
    apiKey: providers[0]?.apiKey || "",
    apiConfigured: providers.some(provider =>
      provider.enabled && provider.apiBase && provider.model && provider.apiKey
    ),
    aiRules: db.settings?.aiRules || defaultAiRules.map(rule => ({ ...rule }))
  };
  await chrome.storage.local.set({ settings: db.settings });
}

function renderAiProviders() {
  const box = $("#aiProviderList");
  if (!box) return;
  const providers = normalizeAiProviders(db.settings || {});
  db.settings.aiProviders = providers;
  box.className = "ai-provider-list";
  box.innerHTML = providers.length ? providers.map((provider, index) => `
    <div class="ai-provider-card ${provider.enabled === false ? "disabled" : ""}" data-provider-id="${safeAttr(provider.id)}">
      <span class="drag-handle" draggable="true" data-provider-drag="${safeAttr(provider.id)}" title="拖动排序" aria-label="拖动排序">
        <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="5" cy="4" r="1.25"/><circle cx="11" cy="4" r="1.25"/><circle cx="5" cy="8" r="1.25"/><circle cx="11" cy="8" r="1.25"/><circle cx="5" cy="12" r="1.25"/><circle cx="11" cy="12" r="1.25"/></svg>
      </span>
      <div class="ai-provider-name">${safe(provider.name || provider.model || "未命名模型")}</div>
      <div class="ai-provider-actions">
        <label class="compact-switch" title="${provider.enabled === false ? "启用模型" : "停用模型"}">
          <input type="checkbox" data-provider-toggle="${index}" ${provider.enabled === false ? "" : "checked"} aria-label="${provider.enabled === false ? "启用" : "停用"}${safeAttr(provider.name || provider.model || "模型")}">
          <span></span>
        </label>
        <button class="btn ghost small" data-provider-edit="${index}">编辑</button>
      </div>
    </div>
  `).join("") : '<div class="empty">暂无模型版本，点击右上角添加</div>';

  $$("[data-provider-toggle]").forEach(input => {
    input.onchange = async () => {
      const provider = providers[Number(input.dataset.providerToggle)];
      provider.enabled = input.checked;
      db.settings.aiProviders = providers;
      await persistAiSettings();
      renderAiProviders();
      renderMailSettings();
    };
  });
  $$("[data-provider-edit]").forEach(button => {
    button.onclick = () => openAiProvider(Number(button.dataset.providerEdit));
  });
  let draggedProviderId = "";
  $$("[data-provider-drag]").forEach(handle => {
    handle.ondragstart = event => {
      draggedProviderId = handle.dataset.providerDrag;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", draggedProviderId);
      handle.closest(".ai-provider-card").classList.add("dragging");
    };
    handle.ondragend = () => {
      draggedProviderId = "";
      $$(".ai-provider-card").forEach(card => card.classList.remove("dragging", "drag-over"));
    };
  });
  $$(".ai-provider-card").forEach(card => {
    card.ondragover = event => {
      event.preventDefault();
      if (card.dataset.providerId !== draggedProviderId) card.classList.add("drag-over");
    };
    card.ondragleave = () => card.classList.remove("drag-over");
    card.ondrop = async event => {
      event.preventDefault();
      const sourceId = draggedProviderId || event.dataTransfer.getData("text/plain");
      const targetId = card.dataset.providerId;
      if (!sourceId || !targetId || sourceId === targetId) return;
      const sourceIndex = providers.findIndex(provider => provider.id === sourceId);
      const targetIndex = providers.findIndex(provider => provider.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return;
      const [moved] = providers.splice(sourceIndex, 1);
      providers.splice(targetIndex, 0, moved);
      db.settings.aiProviders = orderedProviders(providers);
      await persistAiSettings();
      renderAiProviders();
      renderMailSettings();
    };
  });
}

function openAiProvider(index = -1) {
  const providers = normalizeAiProviders(db.settings || {});
  const provider = index < 0 ? {
    enabled: true,
    apiBase: "https://api.deepseek.com",
    model: "deepseek-chat"
  } : providers[index];
  $("#modalBody").innerHTML = `
    <div class="section-title">${index < 0 ? "添加" : "编辑"}模型版本</div>
    <div class="modal-grid">
      <div class="field"><label>版本名称</label><input id="providerName" value="${safe(provider.name)}" placeholder="例如：DeepSeek 主力"></div>
      <label class="switch-row"><input id="providerEnabled" type="checkbox" ${provider.enabled !== false ? "checked" : ""}><span><b>启用模型</b></span></label>
      <div class="field full-span"><label>OpenAI-compatible API 地址</label><input id="providerApiBase" value="${safe(provider.apiBase)}" placeholder="https://api.deepseek.com"></div>
      <div class="field"><label>模型名称</label><input id="providerModel" value="${safe(provider.model)}" placeholder="deepseek-chat"></div>
      <div class="field"><label>API Key</label><input id="providerApiKey" type="password" autocomplete="off" value="${safe(provider.apiKey)}" placeholder="sk-..."></div>
    </div>
    <div class="row">${index < 0 ? "" : '<button class="btn ghost danger-btn" id="deleteAiProvider">删除</button>'}<span class="modal-spacer"></span><button class="btn ghost" id="cancelModal">取消</button><button class="btn primary" id="saveAiProvider">保存模型</button></div>
  `;
  openModal();
  $("#saveAiProvider").onclick = async () => {
    const apiBase = $("#providerApiBase").value.trim() || "https://api.deepseek.com";
    const model = $("#providerModel").value.trim();
    const apiKey = $("#providerApiKey").value.trim();
    if (!model) return $("#providerModel").focus();
    if (!apiKey) return $("#providerApiKey").focus();
    const permitted = await ensureProviderPermissions([{ apiBase }]);
    if (!permitted) return alert("未获得该模型服务域名访问权限，无法保存");
    const record = {
      id: provider.id || crypto.randomUUID(),
      name: $("#providerName").value.trim() || model,
      apiBase,
      model,
      apiKey,
      enabled: $("#providerEnabled").checked,
      order: index < 0 ? providers.length : index
    };
    if (index < 0) providers.push(record);
    else providers[index] = record;
    db.settings.aiProviders = providers;
    await persistAiSettings();
    closeModal();
    renderAiProviders();
    renderMailSettings();
  };
  if ($("#deleteAiProvider")) {
    $("#deleteAiProvider").onclick = async () => {
      if (!confirm(`确认删除模型“${provider.name || provider.model}”？`)) return;
      providers.splice(index, 1);
      db.settings.aiProviders = orderedProviders(providers);
      await persistAiSettings();
      closeModal();
      renderAiProviders();
      renderMailSettings();
    };
  }
}

$("#addAiProvider").addEventListener("click", () => openAiProvider());

function renderAiRules() {
  const box = $("#aiRuleList");
  if (!box) return;
  const rules = db.settings?.aiRules || [];
  box.innerHTML = rules.length ? rules.map((rule, index) => `
    <div class="rule-row ${rule.enabled === false ? "disabled" : ""}">
      <div class="rule-answer">${safe(rule.value)}</div>
      <div class="rule-copy">
        <strong>${safe(rule.label)}</strong>
        <span>${safe(rule.aliases || "未设置网页问题别名")}</span>
      </div>
      <span class="rule-state">${rule.enabled === false ? "已停用" : "已启用"}</span>
      <div class="record-actions">
        <button class="btn ghost small" data-rule-toggle="${index}">${rule.enabled === false ? "启用" : "停用"}</button>
        <button class="btn ghost small" data-rule-edit="${index}">编辑</button>
        <button class="btn ghost small danger-btn" data-rule-delete="${index}">删除</button>
      </div>
    </div>
  `).join("") : '<div class="empty">暂无自动回答规则</div>';

  $$("[data-rule-toggle]").forEach(button => {
    button.onclick = async () => {
      const rule = rules[Number(button.dataset.ruleToggle)];
      rule.enabled = rule.enabled === false;
      await chrome.storage.local.set({ settings: db.settings });
      renderAiRules();
    };
  });
  $$("[data-rule-edit]").forEach(button => {
    button.onclick = () => openAiRule(Number(button.dataset.ruleEdit));
  });
  $$("[data-rule-delete]").forEach(button => {
    button.onclick = async () => {
      const index = Number(button.dataset.ruleDelete);
      if (!confirm(`确认删除规则“${rules[index].label}”？`)) return;
      rules.splice(index, 1);
      await chrome.storage.local.set({ settings: db.settings });
      renderAiRules();
    };
  });
}

function openAiRule(index = -1) {
  const rules = db.settings.aiRules;
  const rule = index < 0 ? { enabled: true } : rules[index];
  $("#modalBody").innerHTML = `
    <div class="section-title">${index < 0 ? "添加" : "编辑"} AI 回答规则</div>
    <div class="modal-grid">
      <div class="field"><label>规则名称</label><input id="ruleLabel" value="${safe(rule.label)}" placeholder="例如：接受工作城市调剂"></div>
      <div class="field"><label>固定答案</label><input id="ruleValue" value="${safe(rule.value)}" placeholder="例如：是 / 否"></div>
      <div class="field full-span"><label>网页问题别名</label><textarea id="ruleAliases" rows="4" placeholder="多个问法用逗号分隔">${safe(rule.aliases)}</textarea></div>
      <div class="field"><label>状态</label><select id="ruleEnabled"><option value="true" ${rule.enabled !== false ? "selected" : ""}>启用</option><option value="false" ${rule.enabled === false ? "selected" : ""}>停用</option></select></div>
    </div>
    <div class="row"><button class="btn ghost" id="cancelModal">取消</button><button class="btn primary" id="saveAiRule">保存规则</button></div>
  `;
  openModal();
  $("#saveAiRule").onclick = async () => {
    const label = $("#ruleLabel").value.trim();
    const value = $("#ruleValue").value.trim();
    if (!label) return $("#ruleLabel").focus();
    if (!value) return $("#ruleValue").focus();
    const record = {
      id: rule.id || crypto.randomUUID(),
      label,
      value,
      aliases: $("#ruleAliases").value.trim(),
      enabled: $("#ruleEnabled").value === "true"
    };
    if (index < 0) rules.push(record);
    else rules[index] = record;
    await chrome.storage.local.set({ settings: db.settings });
    closeModal();
    renderAiRules();
  };
}

$("#addAiRule").addEventListener("click", () => openAiRule());

init();
