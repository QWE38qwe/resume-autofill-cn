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
    ["current", "是否至今"], ["city", "学校所在城市"],
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
      ["phoneCountryCode", "电话区号"], ["phone", "手机号"],
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
      ["portfolioUrl", "作品集链接"], ["resumeAttachment", "简历附件文件名"]
    ]
  }
];

const basicFields = basicGroups.flatMap(group => group.fields);

const defaultAiRules = [];

let db = {};
let modalCtx = null;
let openedVersionId = null;
let parsedDraft = null;

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
  Object.keys(schemas).forEach(type => {
    db[type] = db[type] || [];
  });

  renderBasic();
  renderAvatar();
  renderCustomFields();
  Object.keys(schemas).forEach(renderList);
  renderVersions();
  renderHistoryFilters();
  renderHistory();
  renderMailSettings();
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

  const requestedTab = location.hash.replace(/^#/, "");
  if (requestedTab && document.getElementById(requestedTab)) activateTab(requestedTab);
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
  $("#modalBody").innerHTML = `
    <div class="section-title">${index < 0 ? "添加" : "编辑"}记录</div>
    <div class="modal-grid">
      ${schemas[type].map(([key, label]) => `
        <div class="field ${longFields.includes(key) ? "full-span" : ""}">
          <label>${label}</label>
          ${longFields.includes(key)
            ? `<textarea data-field="${key}" rows="4">${safe(record[key])}</textarea>`
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
            <div class="muted">实习 ${profile.work?.length || 0} 段｜附件 ${safe(profile.attachment || "未绑定")}｜本地简历 ${safe(profile.resumePath || "未填写")}</div>
          </div>
          <div class="record-actions">
            <button class="btn primary small" data-open-version="${profile.id}">${openedVersionId === profile.id ? "收起" : "编辑"}</button>
            ${isDefault ? "" : `<button class="btn ghost small" data-default-version="${profile.id}">设为默认</button>`}
            <button class="btn ghost small" data-copy-version="${profile.id}">复制</button>
            <button class="btn ghost small" data-rename="${profile.id}">重命名</button>
            <button class="btn ghost small danger-btn" data-del-version="${profile.id}">删除</button>
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
  $$("[data-rename]").forEach(button => {
    button.onclick = () => renameVersion(button.dataset.rename);
  });
  $$("[data-del-version]").forEach(button => {
    button.onclick = () => deleteVersion(button.dataset.delVersion);
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
        <div><span class="section-kicker">版本编辑</span><h2>${safe(profile.name)} / 实习经历</h2><p>工作内容逐条完整显示，不做省略。</p></div>
        <div class="head-actions"><button class="btn secondary" id="collapseVersion">收起</button><button class="btn primary" id="addWork">添加经历</button></div>
      </div>
      <div class="form-grid">
        <div class="field"><label>简历版本命名</label><input id="vName" value="${safe(profile.name)}"></div>
        <div class="field"><label>附件</label><input id="vAttachment" value="${safe(profile.attachment)}"></div>
        <div class="field full-span"><label>本地简历路径</label><input id="vResumePath" value="${safe(profile.resumePath)}" placeholder="例如：/Users/you/Documents/resume-product.pdf"></div>
      </div>
      <div id="workList"></div>
      <div class="version-summary">
        <div class="section-kicker">自我评价</div>
        <textarea id="vSummary" rows="4" placeholder="填写该版本专属的自我评价">${safe(profile.summary)}</textarea>
      </div>
      <div class="settings-actions"><span></span><button class="btn primary" id="saveVersionBase">保存版本</button></div>
    </div>
  `;
  renderWork(profile);
  $("#collapseVersion").onclick = () => toggleVersion(id);
  $("#addWork").onclick = () => openWork(id, -1);
  $("#saveVersionBase").onclick = async () => {
    const name = $("#vName").value.trim();
    if (!name) return $("#vName").focus();
    profile.name = name;
    profile.attachment = $("#vAttachment").value.trim();
    profile.resumePath = $("#vResumePath").value.trim();
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
      <div class="field full-span"><label>本地简历路径</label><input id="newVersionPath" placeholder="可选，例如：/Users/you/Documents/resume-product.pdf"></div>
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
    const profile = {
      id: crypto.randomUUID(),
      name,
      target: "",
      summary: "",
      attachment: "",
      resumePath: $("#newVersionPath").value.trim(),
      work: []
    };
    db.profiles.push(profile);
    if (!db.activeProfileId) db.activeProfileId = profile.id;
    await saveProfiles();
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
  await saveProfiles();
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

function historyCompanyKey(record) {
  return String(record.company || record.site || "").trim().toLocaleLowerCase("zh-CN");
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

function renderHistoryFilters() {
  const current = $("#companyFilter").value;
  const companies = [...new Set(db.fillHistory.map(record => record.company || record.site).filter(Boolean))]
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

function statusTag(status) {
  const value = status || "未完成";
  return `<span class="field-chip ${value === "已完成" ? "matched" : "unmatched"}">${safe(value)}</span>`;
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
      const companyName = record.company || record.site || "";
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
            const company = safe(record.company || record.site || "未命名公司");
            return `
              <tr class="history-row">
                <td>
                  <div class="company-cell">
                    <input class="history-company" data-company="${index}" value="${company}" aria-label="编辑公司名称">
                    ${statusTag(record.status)}
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
    const original = db.fillHistory[index].company || db.fillHistory[index].site || "";
    input.onkeydown = event => {
      if (event.key === "Enter") input.blur();
      if (event.key === "Escape") {
        input.value = original;
        input.blur();
      }
    };
    input.onchange = async () => {
      const company = input.value.trim();
      if (!company) {
        input.value = original;
        return;
      }
      db.fillHistory[index].company = company;
      db.fillHistory = dedupeLatestHistory(db.fillHistory);
      await chrome.storage.local.set({ fillHistory: db.fillHistory });
      renderHistoryFilters();
      renderHistory();
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
    dryRun: true,
    syncIntervalMinutes: 120,
    tableId: "tblhXjQP5FKvqWUm",
    companyField: "公司",
    noteField: "note",
    assessmentLinkField: "测评链接",
    ddlField: "ddl"
  };
}

function renderMailSettings() {
  const settings = { ...mailSettingsDefaults(), ...(db.mailSettings || {}) };
  $("#mailAddress").value = settings.address || "";
  $("#mailAuthCode").value = settings.authCode || "";
  $("#mailHost").value = settings.host;
  $("#mailPort").value = settings.port;
  $("#mailFeishuAppId").value = settings.appId || "";
  $("#mailFeishuSecret").value = settings.appSecret || "";
  $("#mailBaseToken").value = settings.baseToken || "";
  $("#mailTableId").value = settings.tableId;
  $("#mailCompanyField").value = settings.companyField;
  $("#mailNoteField").value = settings.noteField;
  $("#mailLinkField").value = settings.assessmentLinkField;
  $("#mailDdlField").value = settings.ddlField;
  $("#mailAutoSync").checked = Boolean(settings.autoSync);
  $("#mailDryRun").checked = Boolean(settings.dryRun);

  const providers = activeAiProviders();
  $("#mailAiSummary").textContent = providers.length
    ? `共用 ${providers.length} 个启用模型 · 优先 ${providers[0].name || providers[0].model}`
    : "尚未启用 AI 模型版本，邮件同步前请先完成设置。";
  $("#mailInstallCommand").textContent =
    `./native-host/install.sh ${chrome.runtime.id}`;
  updateBridgeState("idle", "检测本地桥接");
}

function mailSettingsFromForm() {
  return {
    address: $("#mailAddress").value.trim(),
    authCode: $("#mailAuthCode").value.trim(),
    host: $("#mailHost").value.trim() || "imap.126.com",
    port: Number($("#mailPort").value) || 993,
    folder: "INBOX",
    appId: $("#mailFeishuAppId").value.trim(),
    appSecret: $("#mailFeishuSecret").value.trim(),
    baseToken: $("#mailBaseToken").value.trim(),
    tableId: $("#mailTableId").value.trim(),
    companyField: $("#mailCompanyField").value.trim() || "公司",
    noteField: $("#mailNoteField").value.trim() || "note",
    assessmentLinkField: $("#mailLinkField").value.trim() || "测评链接",
    ddlField: $("#mailDdlField").value.trim() || "ddl",
    autoSync: $("#mailAutoSync").checked,
    dryRun: $("#mailDryRun").checked,
    syncIntervalMinutes: 120
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
  if (status === "已写入" || status === "将写入") return "matched";
  if (status === "待确认") return "unmatched";
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

function filteredMailHistory() {
  const status = $("#mailStatusFilter").value;
  const category = $("#mailCategoryFilter").value;
  return (db.mailHistory || []).filter(item =>
    (!status || item.status === status) &&
    (!category || item.category === category)
  );
}

function renderMailDashboard() {
  const status = db.mailSyncStatus || {};
  const summary = status.summary || {};
  $("#mailFetchedMetric").textContent = summary.fetched || 0;
  $("#mailUpdatedMetric").textContent = summary.updated || 0;
  $("#mailIgnoredMetric").textContent = summary.irrelevant || 0;
  $("#mailReviewMetric").textContent = summary.needsReview || 0;
  if (status.state === "syncing") {
    $("#mailLastSync").textContent = "正在读取邮箱并核对飞书…";
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
    return;
  }
  $("#mailHistoryTable").innerHTML = `
    <div class="mail-table-wrap">
      <table class="mail-table">
        <thead><tr><th>状态</th><th>邮件</th><th>分类</th><th>DDL</th><th>接收时间</th></tr></thead>
        <tbody>
          ${rows.map(item => {
            const link = httpUrl(item.assessmentUrl);
            return `
              <tr>
                <td><span class="field-chip ${mailStatusClass(item.status)}">${safe(item.status || "未知")}</span></td>
                <td>
                  <div class="mail-subject" title="${safeAttr(item.subject || "")}">${safe(item.subject || "无主题")}</div>
                  <small>${safe(item.company || item.reason || "未识别公司")}</small>
                </td>
                <td>${item.category ? `<span class="mail-category">${safe(item.category)}</span>` : '<span class="cell-empty">—</span>'}</td>
                <td>${item.deadline ? `<time>${safe(item.deadline)}</time>` : '<span class="cell-empty">—</span>'}</td>
                <td>
                  <time>${safe(formatMailTime(item.receivedAt))}</time>
                  ${link ? `<a class="mail-open" href="${safeAttr(link)}" target="_blank" rel="noopener">打开 ↗</a>` : ""}
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
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

$("#testMailBridge").addEventListener("click", async () => {
  updateBridgeState("loading", "正在连接");
  const result = await chrome.runtime.sendMessage({ type: "MAIL_PING" });
  updateBridgeState(result?.ok ? "success" : "error", result?.ok ? "本地桥接可用" : "本地桥接未安装");
});

$("#syncMailNow").addEventListener("click", async () => {
  const button = $("#syncMailNow");
  button.disabled = true;
  button.textContent = "同步中…";
  try {
    const mailSettings = await persistMailSettings(false);
    if (!activeAiProviders().length) throw new Error("请先在设置中启用至少一个 AI 模型版本");
    const result = await chrome.runtime.sendMessage({
      type: "MAIL_SYNC",
      dryRun: Boolean(mailSettings.dryRun)
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
  alert(`已解除 ${result.cleared || 0} 封待确认邮件的去重状态，请重新同步。`);
});

$("#goAiSettings")?.addEventListener("click", () => activateTab("api"));
$("#mailStatusFilter").addEventListener("change", renderMailDashboard);
$("#mailCategoryFilter").addEventListener("change", renderMailDashboard);
$("#copyMailInstall").addEventListener("click", async () => {
  await navigator.clipboard.writeText($("#mailInstallCommand").textContent);
  $("#copyMailInstall").textContent = "已复制";
  setTimeout(() => { $("#copyMailInstall").textContent = "复制"; }, 1200);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || (!changes.mailHistory && !changes.mailSyncStatus)) return;
  if (changes.mailHistory) db.mailHistory = changes.mailHistory.newValue || [];
  if (changes.mailSyncStatus) db.mailSyncStatus = changes.mailSyncStatus.newValue || {};
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
  if (!providers.length) {
    setParseStatus("请先在“设置”中启用至少一个模型版本，再执行解析", "error");
    return;
  }

  const button = $("#parseResume");
  button.disabled = true;
  try {
    const permitted = await ensureProviderPermissions(providers);
    if (!permitted) throw new Error("未获得 AI 服务域名的访问权限");
    setParseStatus("正在本地读取简历文本…");
    const text = await extractResumeText(file);
    if (text.trim().length < 30) throw new Error("没有读取到足够的简历文本，请确认文件不是扫描图片");
    setParseStatus(`已读取 ${text.length.toLocaleString()} 个字符，正在逐条提取实习经历…`);
    parsedDraft = await parseInternships(text, file.name, providers);
    renderParsedDraft();
    setParseStatus(`解析完成：识别到 ${parsedDraft.internships.length} 段实习经历，请逐条核对原文`, "success");
  } catch (error) {
    console.error(error);
    setParseStatus(error.message || "解析失败，请检查文件和 API 设置", "error");
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
1. businessBackground 必须完整保留该段实习中的“业务背景”原文；不得总结、缩写或并入其他职责。
2. bullets 必须覆盖该段实习下的全部职责和成果，每个圆点或分条单独成为一个数组元素。
3. 保留每条中的小标题、冒号、数字、百分比、英文缩写和因果链，不得压缩为一句概述。
4. PDF 换行只是排版换行时，应还原为同一条；只有新的职责/成果条目才拆分。
5. 不提取教育、校园、项目、论文、技能、证书、自我评价等其他部分。
6. 不确定的字段使用空字符串，不得编造。只返回 JSON。`;

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

  return {
    versionName: fileName.replace(/\.[^.]+$/, ""),
    attachment: fileName,
    internships: internships.map(normalizeInternship)
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
        <div class="field"><label>本地简历路径</label><input id="parsedResumePath" value="${safe(parsedDraft.resumePath)}" placeholder="可选，浏览器无法自动读取完整路径"></div>
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
    resumePath: $("#parsedResumePath")?.value.trim() || "",
    work: works,
    openQuestions: []
  };
  db.profiles.push(profile);
  db.activeProfileId = profile.id;
  await saveProfiles();
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
    <div class="ai-provider-card ${provider.enabled === false ? "disabled" : ""}">
      <div class="record-title">
        <strong><span class="ai-provider-order">${index + 1}</span>${safe(provider.name || provider.model || "未命名模型")}</strong>
        <div class="record-actions">
          <button class="btn ghost small" data-provider-up="${index}" ${index === 0 ? "disabled" : ""}>上移</button>
          <button class="btn ghost small" data-provider-down="${index}" ${index === providers.length - 1 ? "disabled" : ""}>下移</button>
          <button class="btn ghost small" data-provider-toggle="${index}">${provider.enabled === false ? "启用" : "停用"}</button>
          <button class="btn ghost small" data-provider-edit="${index}">编辑</button>
          <button class="btn ghost small danger-btn" data-provider-delete="${index}">删除</button>
        </div>
      </div>
      <div class="ai-provider-meta">
        <span>${provider.enabled === false ? "已停用" : "已启用"}</span>
        <span>${safe(provider.model || "未填写模型名")}</span>
        <span>${safe(provider.apiBase || "未填写 API 地址")}</span>
      </div>
    </div>
  `).join("") : '<div class="empty">暂无模型版本，点击右上角添加</div>';

  $$("[data-provider-up]").forEach(button => {
    button.onclick = async () => {
      const index = Number(button.dataset.providerUp);
      if (index <= 0) return;
      [providers[index - 1], providers[index]] = [providers[index], providers[index - 1]];
      db.settings.aiProviders = providers;
      await persistAiSettings();
      renderAiProviders();
      renderMailSettings();
    };
  });
  $$("[data-provider-down]").forEach(button => {
    button.onclick = async () => {
      const index = Number(button.dataset.providerDown);
      if (index >= providers.length - 1) return;
      [providers[index], providers[index + 1]] = [providers[index + 1], providers[index]];
      db.settings.aiProviders = providers;
      await persistAiSettings();
      renderAiProviders();
      renderMailSettings();
    };
  });
  $$("[data-provider-toggle]").forEach(button => {
    button.onclick = async () => {
      const provider = providers[Number(button.dataset.providerToggle)];
      provider.enabled = provider.enabled === false;
      db.settings.aiProviders = providers;
      await persistAiSettings();
      renderAiProviders();
      renderMailSettings();
    };
  });
  $$("[data-provider-edit]").forEach(button => {
    button.onclick = () => openAiProvider(Number(button.dataset.providerEdit));
  });
  $$("[data-provider-delete]").forEach(button => {
    button.onclick = async () => {
      const index = Number(button.dataset.providerDelete);
      if (!confirm(`确认删除模型版本“${providers[index].name || providers[index].model}”？`)) return;
      providers.splice(index, 1);
      db.settings.aiProviders = providers;
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
      <div class="field"><label>状态</label><select id="providerEnabled"><option value="true" ${provider.enabled !== false ? "selected" : ""}>启用</option><option value="false" ${provider.enabled === false ? "selected" : ""}>停用</option></select></div>
      <div class="field full-span"><label>OpenAI-compatible API 地址</label><input id="providerApiBase" value="${safe(provider.apiBase)}" placeholder="https://api.deepseek.com"></div>
      <div class="field"><label>模型名称</label><input id="providerModel" value="${safe(provider.model)}" placeholder="deepseek-chat"></div>
      <div class="field"><label>API Key</label><input id="providerApiKey" type="password" autocomplete="off" value="${safe(provider.apiKey)}" placeholder="sk-..."></div>
    </div>
    <div class="row"><button class="btn ghost" id="cancelModal">取消</button><button class="btn primary" id="saveAiProvider">保存模型</button></div>
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
      enabled: $("#providerEnabled").value === "true",
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
