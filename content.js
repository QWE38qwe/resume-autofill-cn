const FIELD_DEFS = {
  name: ["姓名", "真实姓名", "中文姓名", "应聘人姓名", "候选人姓名", "name"],
  englishName: ["英文姓名", "英文名", "english name"],
  gender: ["性别", "gender"],
  birthDate: ["出生日期", "出生年月", "生日", "birth date", "birthday"],
  age: ["年龄", "age"],
  nationality: ["国籍（地区）", "国家/地区", "国籍", "nationality"],
  ethnicity: ["民族"],
  politics: ["政治面貌"],
  maritalStatus: ["婚姻状况", "婚姻状态"],
  health: ["健康状况", "健康状态"],
  height: ["身高"],
  weight: ["体重"],
  nativePlace: ["籍贯"],
  birthplace: ["生源地", "出生地"],
  household: ["户籍所在地", "户籍地址", "户口所在地", "户籍"],
  currentCity: ["所在地点", "所在地", "现居住地", "当前居住城市", "现居城市", "居住地"],
  address: ["通信地址", "联系地址", "详细地址", "现居住地址"],
  country: ["国家", "所在国家", "居住国家", "country"],
  province: ["省份", "省/州", "州", "省市", "province", "state"],
  city: ["城市", "市", "居住城市", "city"],
  postalCode: ["邮政编码", "邮编", "zip code", "postal code", "postcode"],
  phone: ["手机号码", "手机号", "联系电话", "移动电话", "手机", "mobile", "phone"],
  phoneCountryCode: ["电话区号", "手机区号", "国家区号", "country code", "phone code"],
  email: ["电子邮箱", "邮箱地址", "邮箱", "email"],
  wechat: ["微信号", "微信"],
  qq: ["QQ号", "QQ"],
  linkedin: ["LinkedIn", "领英", "领英主页", "linkedin profile", "linkedin url"],
  github: ["GitHub", "github profile", "github url"],
  personalWebsite: ["个人网站", "个人主页", "网站", "website", "personal website"],
  portfolioUrl: ["作品集链接", "作品集", "portfolio", "portfolio url"],
  specialty: ["个人特长", "特长"],
  identityNumber: ["身份证号码", "证件号码", "身份证号"],
  identityType: ["证件类型", "证件类别"],
  emergencyContactName: ["紧急联系人姓名", "紧急联系人", "emergency contact name"],
  emergencyContactRelation: ["紧急联系人关系", "与紧急联系人关系", "emergency contact relationship"],
  emergencyContactPhone: ["紧急联系人电话", "紧急联系人手机号", "emergency contact phone"],
  graduationYear: ["毕业年份", "毕业年度", "预计毕业年份", "graduation year"],
  graduationDate: ["毕业日期", "预计毕业时间", "预计毕业日期", "graduation date", "expected graduation date"],
  overseasExperience: ["是否有海外经历", "海外经历", "留学经历", "international experience"],
  expectedRole: ["期望岗位", "目标岗位", "意向岗位", "申请职位", "desired role", "target role"],
  targetIndustry: ["期望行业", "意向行业", "目标行业", "desired industry", "target industry"],
  targetFunction: ["期望职能", "意向职能", "职位类别", "岗位类别", "job function", "job category"],
  expectedCity: ["期望工作地点", "期望工作城市", "意向城市", "期望城市", "其他意向城市"],
  jobType: ["岗位类型", "职位类型", "工作类型", "job type"],
  latestCompany: ["最近公司", "当前公司"],
  currentPosition: ["当前职位", "目前职位", "最近职位", "current position", "current title"],
  currentDepartment: ["当前部门", "目前部门", "最近部门", "current department"],
  availableDate: ["到岗时间", "可入职时间", "入职时间", "available date", "start date"],
  availableDays: ["每周可实习天数", "每周出勤天数", "可实习天数"],
  internshipStartDate: ["最早实习时间", "实习开始时间", "可开始实习时间", "internship start date"],
  internshipDuration: ["可实习时长", "实习周期", "可连续实习月数", "internship duration"],
  willingRelocate: ["是否接受调动", "是否接受异地", "是否愿意搬迁", "relocate", "relocation"],
  recruitmentSource: ["如何了解到招聘信息", "如何了解到校招信息", "如何了解到讯飞校招信息", "招聘信息来源", "获知渠道", "应聘渠道", "申请渠道", "source of application", "how did you hear about us"],
  relativesAtCompany: ["是否有亲属在本公司", "亲属任职情况", "relative employed", "relatives at company"],
  drivingLicense: ["是否有驾驶证", "驾驶证", "驾照"],
  avatarFile: ["头像", "照片", "证件照", "个人照片", "免冠照", "生活照", "avatar", "photo", "portrait", "headshot", "profile photo"],
  resumeAttachment: ["简历附件", "上传简历", "resume", "cv", "attach resume"],
  school: ["学校名称", "毕业院校", "就读学校", "院校名称", "学校"],
  college: ["学院名称", "学院"],
  major: ["专业名称", "所学专业", "就读专业", "专业"],
  educationLevel: ["最高学历", "学历层次", "学历"],
  degree: ["学位"],
  educationType: ["学历类型", "学习形式", "培养方式"],
  gpa: ["平均绩点", "绩点", "GPA"],
  rank: ["专业排名", "成绩排名", "排名"],
  courses: ["主修课程", "专业课程", "课程"],
  skillsSummary: ["擅长的开发语言", "开发语言", "专业技能", "技能特长", "计算机技能"],
  languagesSummary: ["外语能力", "语言能力", "外语水平"],
  summary: ["自我评价", "自我描述", "个人评价", "个人总结", "个人简介"]
};

const REPEAT_DEFS = [
  {
    type: "education",
    titles: ["教育经历", "教育背景", "学习经历", "education", "education history", "academic background"],
    anchors: ["学校名称", "毕业院校", "就读学校", "院校名称", "学校", "school", "university", "college"],
    fields: {
      school: FIELD_DEFS.school,
      college: FIELD_DEFS.college,
      major: FIELD_DEFS.major,
      level: FIELD_DEFS.educationLevel,
      degree: FIELD_DEFS.degree,
      type: FIELD_DEFS.educationType,
      city: ["学校所在地", "学校城市", "就读城市", "location"],
      gpa: FIELD_DEFS.gpa,
      rank: FIELD_DEFS.rank,
      courses: FIELD_DEFS.courses,
      research: ["研究方向", "研究领域", "research area", "field of research"],
      thesis: ["毕业论文", "论文题目", "thesis", "dissertation"],
      mentor: ["导师", "指导教师", "supervisor", "advisor"],
      current: ["至今", "仍在就读", "是否在读", "currently studying"]
    },
    label: record => `${record.school || "未填写学校"} / ${record.major || "未填写专业"}`
  },
  {
    type: "work",
    titles: ["实习经历", "实习经验", "工作经历", "工作经验", "工作信息", "任职经历", "work experience", "employment history", "experience"],
    anchors: ["公司名称", "单位名称", "实习单位", "任职公司", "公司", "company", "employer", "organization"],
    fields: {
      company: ["公司名称", "单位名称", "实习单位", "任职公司", "公司", "company", "employer", "organization"],
      department: ["所在部门", "部门名称", "任职部门", "实习部门", "部门", "department", "team"],
      position: ["职位名称", "岗位名称", "任职岗位", "担任岗位", "实习岗位", "担任职务", "职位", "岗位", "job title", "title", "position"],
      type: ["工作性质", "经历类型", "实习/全职", "employment type"],
      city: ["工作地点", "工作城市", "实习地点", "城市", "location", "city"],
      description: ["工作职责", "工作内容", "实习内容", "工作描述", "职责描述", "经历描述", "内容", "描述", "description", "responsibilities"],
    },
    label: record => `${record.company || "未填写公司"} / ${record.position || "未填写职位"}`
  },
  {
    type: "projects",
    titles: ["项目经历", "项目经验", "项目实践", "在校实践", "社会实践", "校园实践", "projects", "project experience"],
    anchors: ["项目名称", "课题名称", "实践名称", "project name"],
    fields: {
      name: ["项目名称", "课题名称", "实践名称"],
      role: ["项目角色", "担任角色", "项目职位", "实践角色", "职责"],
      content: ["项目内容", "项目描述", "实践描述", "实践内容", "内容"],
      duty: ["本人职责", "项目中职责", "主要职责"],
      result: ["项目成果", "项目业绩", "成果"],
      link: ["项目链接", "项目地址", "project url", "project link"],
      current: ["至今", "仍在进行", "currently ongoing"]
    },
    label: record => record.name || "未填写项目"
  },
  {
    type: "languages",
    titles: ["语言能力", "外语能力", "语言技能", "languages", "language skills"],
    anchors: ["语言类型", "外语语种", "语种", "语言", "language"],
    fields: {
      language: ["语言类型", "外语语种", "语种", "语言"],
      exam: ["考试类型", "证书", "考试/水平", "等级"],
      score: ["考试成绩", "分数", "成绩"],
      proficiency: ["掌握程度", "熟练程度", "读写能力"],
      speaking: ["听说能力", "口语能力"],
      writing: ["读写能力", "书写能力"]
    },
    label: record => record.language || "未填写语种"
  },
  {
    type: "skills",
    titles: ["专业技能", "技能特长", "技能列表", "skills", "technical skills"],
    anchors: ["技能名称", "技能", "skill name", "skill"],
    fields: {
      name: ["技能名称", "技能", "skill name"],
      level: ["掌握程度", "熟练程度", "技能等级", "proficiency", "skill level"],
      years: ["使用年限", "掌握年限", "years of experience"],
      description: ["技能说明", "技能描述", "description"]
    },
    label: record => record.name || "未填写技能"
  },
  {
    type: "awards",
    titles: ["获奖经历", "获奖情况", "奖励情况", "荣誉奖励", "awards", "honors"],
    anchors: ["奖项名称", "奖励名称", "荣誉名称", "获奖项", "award", "honor"],
    fields: {
      name: ["奖项名称", "奖励名称", "荣誉名称", "获奖项"],
      date: ["获奖时间", "奖励时间", "获奖日期", "award date"],
      level: ["奖励等级", "奖项级别", "级别"],
      issuer: ["颁奖机构", "授予单位", "颁发单位", "issuer"],
      description: ["奖励描述", "奖项描述", "获奖描述", "说明"]
    },
    label: record => record.name || "未填写奖项"
  },
  {
    type: "papers",
    titles: ["论文/专著", "论文期刊", "论文经历", "学术成果", "publications", "papers"],
    anchors: ["论文名称", "专著名称", "名称", "publication", "paper"],
    fields: {
      name: ["论文名称", "专著名称", "名称"],
      date: ["发布时间", "发表时间", "出版时间"],
      journal: ["刊物名称", "期刊名称"],
      level: ["刊物层级", "期刊级别", "journal level"],
      authorOrder: ["作者顺序", "作者排名", "author order"],
      factor: ["影响因子", "impact factor"],
      link: ["论文链接", "DOI", "publication url"],
      description: ["成果描述", "论文描述", "专著描述", "描述"]
    },
    label: record => record.name || "未填写论文"
  },
  {
    type: "certificates",
    titles: ["证书", "资格证书", "技能证书", "certifications", "certificates", "licenses"],
    anchors: ["证书名称", "certificate", "certification", "license"],
    fields: {
      name: ["证书名称"],
      level: ["证书级别", "级别"],
      date: ["获得时间", "取得时间"],
      issuer: ["颁发机构", "发证机构"],
      description: ["证书描述", "说明"]
    },
    label: record => record.name || "未填写证书"
  },
  {
    type: "portfolio",
    titles: ["作品集", "个人作品", "作品经历", "portfolio", "work samples"],
    anchors: ["作品名称", "作品标题", "portfolio name", "work sample"],
    fields: {
      name: ["作品名称", "作品标题", "名称"],
      type: ["作品类型", "作品类别", "type"],
      link: ["作品链接", "作品地址", "portfolio url", "work sample url"],
      description: ["作品描述", "作品说明", "description"]
    },
    label: record => record.name || "未填写作品"
  }
];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function normalizeText(value) {
  return String(value || "")
    .replace(/[\s\u00a0]+/g, "")
    .replace(/[＊*：:]/g, "")
    .toLocaleLowerCase("zh-CN");
}

function isVisible(element) {
  if (!element || !element.isConnected) return false;
  const style = getComputedStyle(element);
  return style.visibility !== "hidden" &&
    style.display !== "none" &&
    element.getClientRects().length > 0;
}

function queryAllDeep(root, selectors) {
  const roots = [root || document];
  const result = [];
  for (let index = 0; index < roots.length; index += 1) {
    const scope = roots[index];
    scope.querySelectorAll?.(selectors).forEach(element => {
      if (!result.includes(element)) result.push(element);
    });
    scope.querySelectorAll?.("*").forEach(element => {
      if (element.shadowRoot) roots.push(element.shadowRoot);
    });
  }
  return result;
}

function ownerRoot(element) {
  return element?.getRootNode?.() || document;
}

function rootById(root, id) {
  if (!id) return null;
  return root?.getElementById?.(id) || document.getElementById(id);
}

function controls(root = document) {
  const selectors = [
    "input:not([type=hidden]):not([type=file])",
    "textarea",
    "select",
    "[contenteditable=true]",
    "[role=combobox]"
  ].join(",");
  const result = [];
  queryAllDeep(root, selectors).forEach(element => {
    if (!isVisible(element) || element.disabled || element.getAttribute("aria-disabled") === "true") return;
    if (element.matches("[role=combobox]") && element.querySelector("input,textarea,select")) return;
    if (!result.includes(element)) result.push(element);
  });
  return result;
}

function fileControls(root = document) {
  return queryAllDeep(root, "input[type=file]")
    .filter(element => {
      if (element.disabled) return false;
      const text = normalizeText(`${element.accept || ""} ${labelOf(element)} ${nearbyTextOf(element)}`);
      return isVisible(element) || /image|头像|照片|证件照|photo|avatar|portrait|headshot/.test(text);
    });
}

function radioGroups(root = document) {
  const selectors = [
    ".phoenix-radio-group",
    "[role=radiogroup]",
    "[class*='radio-group']",
    "[class*='radioGroup']",
    "[class*='RadioGroup']",
    "[class*='button-group']",
    "[class*='ButtonGroup']"
  ].join(",");
  return queryAllDeep(root, selectors)
    .filter(element =>
      isVisible(element) &&
      !element.closest("[aria-disabled=true]") &&
      groupOptionNodes(element).length >= 2
    );
}

function fieldTargets(root = document) {
  const groups = radioGroups(root);
  const base = controls(root).filter(element =>
    !(element instanceof HTMLInputElement && element.type === "radio" && groups.some(group => group.contains(element)))
  );
  return [...base, ...groups, ...fileControls(root)];
}

function groupOptionNodes(element) {
  const candidates = queryAllDeep(element, [
    ".phoenix-radio-group__radioItem",
    "[role=radio]",
    "input[type=radio]",
    "label:has(input[type=radio])",
    "button",
    "[role=button]"
  ].join(",")).filter(node => isVisible(node) && normalizeText(node.innerText || node.textContent || node.value).length < 50);
  return candidates.filter(node => !candidates.some(other => other !== node && other.contains(node)));
}

function textFromIdList(value, root = document) {
  return String(value || "").split(/\s+/).map(id => rootById(root, id)?.textContent || "").join(" ");
}

function shortText(element) {
  if (!element || element === document.body) return "";
  const text = (element.innerText || element.textContent || "").trim();
  return text.length <= 80 ? text : "";
}

function labelOf(element) {
  const pieces = [];
  const root = ownerRoot(element);
  const id = element.id;
  if (id) {
    try {
      pieces.push(root.querySelector?.(`label[for="${CSS.escape(id)}"]`)?.innerText);
      pieces.push(document.querySelector(`label[for="${CSS.escape(id)}"]`)?.innerText);
    } catch {}
  }
  pieces.push(
    element.getAttribute("aria-label"),
    textFromIdList(element.getAttribute("aria-labelledby"), root),
    textFromIdList(element.getAttribute("aria-describedby"), root),
    element.getAttribute("placeholder"),
    element.getAttribute("name"),
    element.getAttribute("autocomplete"),
    element.getAttribute("title"),
    element.getAttribute("data-field"),
    element.getAttribute("data-field-name"),
    element.getAttribute("data-label"),
    element.getAttribute("data-testid"),
    element.getAttribute("data-test-id"),
    element.getAttribute("data-qa"),
    element.getAttribute("data-automation-id"),
    element.getAttribute("formcontrolname"),
    id
  );
  const exactFormItem = element.closest([
    ".form-item",
    ".ant-form-item",
    ".el-form-item",
    ".ivu-form-item",
    ".form-group",
    ".form-field",
    ".field",
    ".field-wrapper",
    ".question",
    ".application-question",
    "[class*='FormField']",
    "[class*='formField']",
    "[class*='fieldItem']",
    "[class*='FieldItem']",
    "[class*='FormItem']",
    "[class*='formItem']",
    "[data-automation-id*='formField']"
  ].join(","));
  if (exactFormItem) {
    const title = exactFormItem.querySelector([
      ":scope > .form-item__title",
      ":scope .form-item__title",
      ":scope .ant-form-item-label",
      ":scope .el-form-item__label",
      ":scope .ivu-form-item-label",
      ":scope label",
      ":scope [class*='question']",
      ":scope [class*='Question']",
      ":scope [class*='field-label']",
      ":scope [class*='FieldLabel']",
      ":scope [class*='labelText']",
      ":scope [class*='LabelText']",
      ":scope [class*='label']",
      ":scope [class*='Label']",
      ":scope [class*='title']",
      ":scope [class*='Title']"
    ].join(","));
    if (title) pieces.push(shortText(title));
  }

  let item = element.parentElement;
  for (let depth = 0; item && item !== document.body && depth < 14; depth += 1, item = item.parentElement) {
    const labelNodes = item.querySelectorAll([
      "label",
      ".ant-form-item-label",
      ".el-form-item__label",
      ".ivu-form-item-label",
      ".form-item__title",
      ".form-label",
      ".control-label",
      "[class*='question']",
      "[class*='Question']",
      "[class*='field-label']",
      "[class*='FieldLabel']",
      "[class*='labelText']",
      "[class*='LabelText']",
      "[class*='label']",
      "[class*='Label']",
      "[class*='title']",
      "[class*='Title']"
    ].join(","));
    const labels = [...labelNodes]
      .filter(node => !node.contains(element))
      .map(shortText)
      .filter(Boolean);
    if (labels.length) {
      pieces.push(...labels.slice(0, 4));
      break;
    }
    const itemText = shortText(item);
    const itemControls = controls(item);
    if (itemText && itemControls.length <= 2 && !/^(请输入|请选择|\d+\/\d+)$/.test(itemText)) {
      pieces.push(itemText);
      break;
    }
  }

  if (pieces.length <= 8) {
    let sibling = element.parentElement?.previousElementSibling;
    for (let index = 0; sibling && index < 2; index += 1, sibling = sibling.previousElementSibling) {
      if (!queryAllDeep(sibling, "input,textarea,select,[role=combobox]").length) {
        pieces.push(shortText(sibling));
      }
    }
  }
  return pieces.filter(Boolean).join(" ");
}

function aliasScore(label, alias) {
  const source = normalizeText(label);
  const target = normalizeText(alias);
  if (!source || !target) return 0;
  if (source === target) return 100;
  if (source.startsWith(target) || source.endsWith(target)) return 88;
  if (source.includes(target)) return Math.max(62, 82 - Math.floor((source.length - target.length) / 5));
  return 0;
}

function bestAlias(label, aliases) {
  let best = null;
  aliases.forEach(alias => {
    const score = aliasScore(label, alias);
    if (score && (!best || score > best.score)) best = { alias, score };
  });
  return best;
}

function nearbyTextOf(element, root) {
  const pieces = [];
  let node = element;
  for (let depth = 0; node && node !== document.body && depth < 8; depth += 1, node = node.parentElement) {
    if (root && node === root.parentElement) break;
    const count = controls(node).length;
    if (count > 3 && node !== element.parentElement) continue;
    const text = (node.innerText || node.textContent || "").trim();
    if (text && text.length <= 220) pieces.push(text);
  }
  let sibling = element.parentElement?.previousElementSibling;
  for (let index = 0; sibling && index < 2; index += 1, sibling = sibling.previousElementSibling) {
    const text = (sibling.innerText || sibling.textContent || "").trim();
    if (text && text.length <= 120) pieces.push(text);
  }
  return pieces.join(" ");
}

function bestControlAlias(element, aliases, root) {
  const labelMatch = bestAlias(labelOf(element), aliases);
  const nearbyMatch = bestAlias(nearbyTextOf(element, root), aliases);
  if (!labelMatch) return nearbyMatch ? { ...nearbyMatch, score: nearbyMatch.score - 6 } : null;
  if (!nearbyMatch || labelMatch.score >= nearbyMatch.score) return labelMatch;
  return { ...nearbyMatch, score: nearbyMatch.score - 4 };
}

function directText(element) {
  return [...element.childNodes]
    .filter(node => node.nodeType === Node.TEXT_NODE)
    .map(node => node.textContent || "")
    .join(" ")
    .trim();
}

function nearestControlsFromLabel(root, labelNode, key, used) {
  let node = labelNode;
  const wantsLongText = ["description", "content", "duty", "result"].includes(key);
  for (let depth = 0; node && node !== document.body && node !== root.parentElement && depth < 8; depth += 1, node = node.parentElement) {
    const candidates = controls(node).filter(control => !used.has(control) && !labelNode.contains(control));
    if (!candidates.length || candidates.length > 6) continue;
    if (wantsLongText) {
      const textarea = candidates.find(control => control instanceof HTMLTextAreaElement || control.isContentEditable);
      if (textarea) return textarea;
    }
    if (/start|end|date|时间|日期/.test(key)) {
      const date = candidates.find(control =>
        control instanceof HTMLInputElement &&
        (/date|month/.test(control.type) || /请选择|时间|日期/.test(`${control.placeholder || ""}${nearbyTextOf(control, node)}`))
      );
      if (date) return date;
    }
    return candidates[0];
  }
  return null;
}

function findControlNearLabel(root, aliases, key, used) {
  let best = null;
  queryAllDeep(root, "label,span,div,p,dt,dd").forEach(node => {
    if (!isVisible(node) || queryAllDeep(node, "input,textarea,select,[role=combobox]").length) return;
    const text = `${directText(node)} ${node.getAttribute("aria-label") || ""}`.trim();
    if (!text || text.length > 80) return;
    const match = bestAlias(text, aliases);
    if (!match) return;
    const control = nearestControlsFromLabel(root, node, key, used);
    if (control && (!best || match.score > best.score)) best = { element: control, score: match.score };
  });
  return best?.element || null;
}

function customDefinitions(customFields = []) {
  return customFields
    .filter(field => field?.label && field?.value != null)
    .map(field => ({
      key: `custom:${field.id}`,
      label: field.label,
      aliases: [
        field.label,
        ...String(field.aliases || "").split(/[,，、\n]/).map(item => item.trim()).filter(Boolean)
      ],
      value: field.value
    }));
}

function ruleDefinitions(aiRules = []) {
  return aiRules
    .filter(rule => rule?.enabled !== false && rule?.label && rule?.value != null && String(rule.value).trim())
    .map(rule => ({
      key: `rule:${rule.id}`,
      label: rule.label,
      aliases: [
        rule.label,
        ...String(rule.aliases || "").split(/[,，、\n]/).map(item => item.trim()).filter(Boolean)
      ],
      value: String(rule.value).trim()
    }));
}

function availableCandidates(data, customFields = [], settings = {}) {
  const candidates = Object.entries(FIELD_DEFS)
    .filter(([key]) => data[key] != null && String(data[key]).trim() !== "")
    .map(([key, aliases]) => ({ key, label: aliases[0], aliases }));
  customDefinitions(customFields).forEach(definition => {
    candidates.push({ key: definition.key, label: definition.label, aliases: definition.aliases });
  });
  ruleDefinitions(settings.aiRules || []).forEach(definition => {
    candidates.push({ key: definition.key, label: definition.label, aliases: definition.aliases, policy: true });
  });
  return candidates;
}

function componentType(element) {
  if (element instanceof HTMLInputElement && element.type === "file") return "file";
  if (radioGroups(element.parentElement || document).includes(element)) return "option-group";
  if (element.closest?.(".phoenix-select")) {
    const label = normalizeText(labelOf(element));
    return /日期|时间|年月/.test(label) ? "calendar" : "select";
  }
  if (element instanceof HTMLInputElement && /date|month|time/.test(element.type)) return "calendar";
  if (element instanceof HTMLTextAreaElement || element.isContentEditable) return "textarea";
  if (element instanceof HTMLSelectElement || element.getAttribute?.("role") === "combobox") return "select";
  if (element.type === "checkbox" || element.type === "radio") return element.type;
  return "text";
}

function targetOptions(element) {
  if (componentType(element) === "option-group") {
    return groupOptionNodes(element)
      .map(item => (item.innerText || item.textContent || "").trim())
      .filter(Boolean)
      .slice(0, 20);
  }
  if (element instanceof HTMLSelectElement) {
    return [...element.options].map(option => option.textContent.trim()).filter(Boolean).slice(0, 30);
  }
  if (element instanceof HTMLInputElement && element.getAttribute("list")) {
    const list = rootById(ownerRoot(element), element.getAttribute("list"));
    return [...(list?.querySelectorAll("option") || [])]
      .map(option => option.value || option.textContent.trim())
      .filter(Boolean)
      .slice(0, 30);
  }
  const popupId = element.getAttribute?.("aria-controls") || element.getAttribute?.("aria-owns");
  const popup = rootById(ownerRoot(element), popupId) || rootById(document, popupId);
  if (popup) {
    return queryAllDeep(popup, "[role=option],li,button")
      .map(option => (option.innerText || option.textContent || "").trim())
      .filter(Boolean)
      .slice(0, 30);
  }
  if (element instanceof HTMLInputElement && (element.type === "radio" || element.type === "checkbox") && element.name) {
    return queryAllDeep(ownerRoot(element), `input[name="${CSS.escape(element.name)}"]`)
      .map(item => labelOf(item).trim() || item.value)
      .filter(Boolean)
      .slice(0, 30);
  }
  return [];
}

function describeTargets(targets) {
  return targets.map((element, index) => {
    const label = labelOf(element).trim() || nearbyTextOf(element).trim();
    return {
      fieldId: `field-${index}`,
      label: label.slice(0, 180),
      component: componentType(element),
      id: (element.id || "").slice(0, 80),
      name: (element.getAttribute?.("name") || "").slice(0, 80),
      autocomplete: (element.getAttribute?.("autocomplete") || "").slice(0, 80),
      placeholder: (element.getAttribute?.("placeholder") || "").slice(0, 80),
      options: targetOptions(element)
    };
  });
}

async function requestAiMappings(targets, data, customFields, settings) {
  const providers = Array.isArray(settings?.aiProviders) ? settings.aiProviders : [];
  const hasProvider = providers.some(provider =>
    provider.enabled !== false && provider.apiBase && provider.model && provider.apiKey
  );
  if (!(hasProvider || settings?.apiKey) || !targets.length) {
    return { mappings: new Map(), source: "disabled", error: "" };
  }
  const candidates = availableCandidates(data, customFields, settings);
  if (!candidates.length) return { mappings: new Map(), source: "empty", error: "" };
  const fields = describeTargets(targets).filter(field => field.label);
  if (!fields.length) return { mappings: new Map(), source: "empty", error: "" };
  try {
    const response = await chrome.runtime.sendMessage({
      type: "AI_MATCH_FIELDS",
      hostname: location.hostname,
      fields,
      candidates
    });
    if (response?.error) return { mappings: new Map(), source: "error", error: response.error };
    const mappings = new Map();
    (response?.matches || []).forEach(match => {
      if (match.targetKey && match.confidence >= 0.65) {
        mappings.set(match.fieldId, match);
      }
    });
    return { mappings, source: response?.source || "deepseek", error: "" };
  } catch (error) {
    return { mappings: new Map(), source: "error", error: error.message || "AI 字段匹配失败" };
  }
}

function matchControl(element, customFields = []) {
  const label = labelOf(element);
  let best = null;
  customDefinitions(customFields).forEach(definition => {
    const match = bestAlias(label, definition.aliases);
    if (match && (!best || match.score + 4 > best.confidence)) {
      best = { key: definition.key, label: definition.label, confidence: match.score + 4, value: definition.value };
    }
  });
  Object.entries(FIELD_DEFS).forEach(([key, aliases]) => {
    const match = bestAlias(label, aliases);
    if (match && (!best || match.score > best.confidence)) {
      best = { key, label: match.alias, confidence: match.score };
    }
  });
  if (!best && element instanceof HTMLInputElement && element.type === "file") {
    const text = normalizeText(`${element.accept || ""} ${label} ${nearbyTextOf(element)}`);
    if (/image|头像|照片|证件照|photo|avatar|portrait|headshot/.test(text)) {
      best = { key: "avatarFile", label: "头像照片", confidence: 86 };
    }
  }
  return best;
}

function matchRepeatControl(element) {
  const label = labelOf(element);
  let best = null;
  REPEAT_DEFS.forEach(definition => {
    Object.entries(definition.fields).forEach(([key, aliases]) => {
      const match = bestAlias(label, aliases);
      if (match && (!best || match.score > best.confidence)) {
        best = { key: `${definition.type}.${key}`, label: match.alias, confidence: match.score };
      }
    });
  });
  if (best) return best;
  const placeholder = normalizeText(element.getAttribute("placeholder"));
  if (placeholder === "年" || placeholder === "月") {
    return { key: "record.date", label: placeholder, confidence: 70 };
  }
  return null;
}

function setNativeValue(element, value) {
  const stringValue = String(value ?? "");
  if (element.isContentEditable) {
    element.textContent = stringValue;
  } else if (element instanceof HTMLSelectElement) {
    const option = [...element.options].find(item =>
      normalizeText(item.value) === normalizeText(stringValue) ||
      normalizeText(item.textContent) === normalizeText(stringValue)
    );
    if (!option) return false;
    element.value = option.value;
  } else {
    const prototype = element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (setter) setter.call(element, stringValue);
    else element.value = stringValue;
  }
  ["input", "change", "blur"].forEach(type => {
    element.dispatchEvent(new Event(type, { bubbles: true }));
  });
  return true;
}

function fileFromStoredAvatar(value) {
  if (!value?.dataUrl || !value?.name) return null;
  const match = String(value.dataUrl).match(/^data:([^;,]+);base64,(.*)$/);
  if (!match) return null;
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new File([bytes], value.name, {
    type: value.type || match[1] || "image/jpeg",
    lastModified: Date.parse(value.updatedAt || "") || Date.now()
  });
}

function setFileInput(element, file) {
  if (!(element instanceof HTMLInputElement) || element.type !== "file" || !file) return false;
  const transfer = new DataTransfer();
  transfer.items.add(file);
  element.files = transfer.files;
  ["input", "change"].forEach(type => {
    element.dispatchEvent(new Event(type, { bubbles: true }));
  });
  return element.files?.length > 0;
}

function setSearchValue(element, value) {
  const stringValue = String(value ?? "");
  const previous = String(element.value ?? "");
  element.focus?.();
  const prototype = element instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  if (setter) setter.call(element, stringValue);
  else element.value = stringValue;
  if (element._valueTracker) element._valueTracker.setValue(previous);
  element.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: stringValue }));
  element.dispatchEvent(new InputEvent("beforeinput", {
    bubbles: true,
    inputType: "insertText",
    data: stringValue
  }));
  element.dispatchEvent(new InputEvent("input", {
    bubbles: true,
    inputType: "insertText",
    data: stringValue
  }));
  element.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: stringValue }));
  return true;
}

function forceNativeValue(element, value) {
  const stringValue = String(value ?? "");
  const wasReadonly = element instanceof HTMLInputElement && element.readOnly;
  element.focus?.();
  element.click?.();
  if (wasReadonly) element.readOnly = false;
  const ok = setNativeValue(element, stringValue);
  if (!element.isContentEditable) {
    element.setAttribute("value", stringValue);
    element.value = stringValue;
  }
  if (element._valueTracker) element._valueTracker.setValue("");
  element.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: stringValue }));
  element.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: stringValue }));
  element.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, inputType: "insertText", data: stringValue }));
  element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: stringValue }));
  ["change", "keyup", "blur"].forEach(type => element.dispatchEvent(new Event(type, { bubbles: true })));
  element.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }));
  element.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", bubbles: true }));
  if (wasReadonly) element.readOnly = true;
  return ok;
}

function clickElement(element) {
  if (!element) return false;
  element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
  element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
  element.click();
  return true;
}

function visibleOne(selector) {
  return queryAllDeep(document, selector).find(isVisible) || null;
}

function panelNumber(selector) {
  const text = (visibleOne(selector)?.textContent || "").trim();
  const match = text.match(/\d{4}/);
  return match ? Number(match[0]) : 0;
}

async function choosePhoenixMonth(element, value) {
  if (!element.closest(".phoenix-select")) return false;
  const date = splitDate(value);
  const fullDate = String(value || "").match(/(\d{4})\D{0,3}(\d{1,2})\D{0,3}(\d{1,2})/);
  const targetYear = Number(date.year);
  const targetMonth = Number(date.month);
  const targetDay = Number(fullDate?.[3] || 0);
  if (!targetYear || !targetMonth) return false;

  clickElement(element.closest(".phoenix-select") || element);
  await sleep(240);

  let monthPanel = visibleOne(".phoenix-calendar-month-panel");
  if (!monthPanel) {
    const monthSwitch = visibleOne(".phoenix-calendar-month-select");
    if (monthSwitch) {
      clickElement(monthSwitch);
      await sleep(160);
      monthPanel = visibleOne(".phoenix-calendar-month-panel");
    }
  }
  if (!monthPanel) return false;

  let shownYear = panelNumber(".phoenix-calendar-month-panel-year-select-content");
  if (shownYear !== targetYear) {
    const yearSwitch = visibleOne(".phoenix-calendar-month-panel-year-select");
    if (yearSwitch) {
      clickElement(yearSwitch);
      await sleep(150);
      let yearPanel = visibleOne(".phoenix-calendar-year-panel");
      for (let attempt = 0; yearPanel && attempt < 12; attempt += 1) {
        const decadeText = (yearPanel.querySelector(".phoenix-calendar-year-panel-decade-select-content")?.textContent || "").trim();
        const years = decadeText.match(/\d{4}/g)?.map(Number) || [];
        if (years.length >= 2 && targetYear < years[0]) {
          clickElement(yearPanel.querySelector(".phoenix-calendar-year-panel-prev-decade-btn"));
          await sleep(100);
        } else if (years.length >= 2 && targetYear > years[years.length - 1]) {
          clickElement(yearPanel.querySelector(".phoenix-calendar-year-panel-next-decade-btn"));
          await sleep(100);
        } else {
          break;
        }
        yearPanel = visibleOne(".phoenix-calendar-year-panel");
      }
      const yearCell = [...(yearPanel?.querySelectorAll(".phoenix-calendar-year-panel-cell") || [])]
        .find(cell => normalizeText(cell.textContent) === String(targetYear) && !cell.classList.contains("phoenix-calendar-year-panel-disabled-cell"));
      if (yearCell) {
        clickElement(yearCell);
        await sleep(160);
        monthPanel = visibleOne(".phoenix-calendar-month-panel");
      }
    }
  }

  shownYear = panelNumber(".phoenix-calendar-month-panel-year-select-content");
  if (shownYear && shownYear !== targetYear) return false;
  const monthCells = [...(monthPanel?.querySelectorAll(".phoenix-calendar-month-panel-cell") || [])];
  const monthCell = monthCells[targetMonth - 1];
  if (!monthCell || monthCell.classList.contains("phoenix-calendar-month-panel-cell-disabled")) return false;
  clickElement(monthCell);
  await sleep(220);
  if (!String(element.value || "").trim() && targetDay) {
    const datePanel = visibleOne(".phoenix-calendar-date-panel");
    const dayCell = [...(datePanel?.querySelectorAll(".phoenix-calendar-cell") || [])]
      .find(cell =>
        normalizeText(cell.querySelector(".phoenix-calendar-date")?.textContent) === String(targetDay) &&
        !cell.classList.contains("phoenix-calendar-last-month-cell") &&
        !cell.classList.contains("phoenix-calendar-next-month-btn-day") &&
        !cell.classList.contains("phoenix-calendar-disabled-cell")
      );
    if (dayCell) {
      clickElement(dayCell);
      await sleep(220);
    }
  }
  return Boolean(String(element.value || "").trim());
}

function selectWrapperFor(element) {
  const libraryWrapper = element.closest(".phoenix-select,.ant-select,.el-select,.ivu-select,[role=combobox]");
  if (libraryWrapper) return libraryWrapper;
  const genericWrapper = element.closest("[class*='select'],[class*='Select'],[class*='picker'],[class*='Picker']");
  if (!genericWrapper || controls(genericWrapper).length > 2) return null;
  const text = normalizeText([
    genericWrapper.className,
    element.getAttribute("aria-haspopup"),
    element.getAttribute("aria-expanded"),
    element.getAttribute("aria-controls"),
    element.getAttribute("aria-owns"),
    element.getAttribute("placeholder"),
    labelOf(element)
  ].filter(Boolean).join(" "));
  if (element.readOnly || /true|listbox|dialog|选择|请选择|下拉|学校|院校|专业|学历|学位|时间|日期|年月|年|月|select|picker/.test(text)) {
    return genericWrapper;
  }
  return null;
}

function optionRoot(option) {
  return option.closest([
    "[role=listbox]",
    ".phoenix-select-dropdown",
    ".ant-select-dropdown",
    ".el-select-dropdown",
    ".ivu-select-dropdown",
    "[class*='dropdown']",
    "[class*='Dropdown']",
    "[class*='popper']",
    "[class*='Popper']",
    "[class*='menu']",
    "[class*='Menu']"
  ].join(",")) || option.parentElement || option;
}

function rectOverlap(left, right) {
  const horizontal = Math.min(left.right, right.right) - Math.max(left.left, right.left);
  const vertical = Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top);
  return { horizontal, vertical };
}

function optionNearTarget(option, target) {
  if (!target) return true;
  if (target.contains(option) || option.contains(target)) return true;
  const targetRect = target.getBoundingClientRect();
  const rootRect = optionRoot(option).getBoundingClientRect();
  if (!targetRect.width || !targetRect.height || !rootRect.width || !rootRect.height) return true;
  const overlap = rectOverlap(targetRect, rootRect);
  const horizontalOk = overlap.horizontal > Math.min(targetRect.width, rootRect.width) * 0.18 ||
    Math.abs(rootRect.left - targetRect.left) < 80;
  const verticalOk = rootRect.bottom >= targetRect.top - 20 && rootRect.top <= targetRect.bottom + 420;
  return horizontalOk && verticalOk;
}

function optionCandidates(target) {
  const selectors = [
    "[role=option]",
    ".ant-select-item-option",
    ".el-select-dropdown__item",
    ".ivu-select-item",
    "[class*='Select-common-item']",
    "[class*='Menu-container']",
    "[class*='option']",
    "[class*='Option']",
    ".dropdown-item",
    ".select-option",
    "li"
  ].join(",");
  return queryAllDeep(document, selectors).filter(item =>
    isVisible(item) &&
    optionNearTarget(item, target) &&
    (item.innerText || item.textContent || "").trim().length < 100
  );
}

function optionScore(text, value) {
  const option = normalizeText(text);
  const wanted = normalizeText(value);
  if (!option || !wanted) return 0;
  const yesWords = ["是", "有", "可以", "接受", "愿意", "yes", "true", "y"];
  const noWords = ["否", "无", "不需要", "不接受", "不愿意", "no", "false", "n"];
  const polarity = source => {
    if (noWords.some(word => source === normalizeText(word) || source.includes(normalizeText(word)))) return "no";
    if (yesWords.some(word => source === normalizeText(word) || source.includes(normalizeText(word)))) return "yes";
    return "";
  };
  const wantedPolarity = polarity(wanted);
  const optionPolarity = polarity(option);
  if (wantedPolarity) return wantedPolarity === optionPolarity ? 100 : 0;
  const wantedDigits = wanted.match(/\d+/g)?.join("") || "";
  const optionDigits = option.match(/\d+/g)?.join("") || "";
  if (wantedDigits && optionDigits) {
    const wantedNumber = String(Number(wantedDigits));
    const optionNumber = String(Number(optionDigits));
    return wantedNumber === optionNumber ? 96 : 0;
  }
  if (option === wanted) return 100;
  if (option.startsWith(wanted)) return 86;
  if (option.endsWith(wanted)) return 82;
  if (wanted.length >= 3 && option.includes(wanted)) return 70;
  if (option.length >= 3 && wanted.includes(option)) return 66;
  return 0;
}

function optionMatchText(text, value) {
  return optionScore(text, value) > 0;
}

function bestOption(options, value) {
  return options
    .map(option => ({ option, score: optionScore(option.innerText || option.textContent || option.value, value) }))
    .filter(item => item.score > 0)
    .sort((left, right) => right.score - left.score)[0]?.option || null;
}

function clickableOption(option) {
  if (!option) return null;
  if (option.matches([
    "[role=option]",
    ".ant-select-item-option",
    ".el-select-dropdown__item",
    ".ivu-select-item",
    "[class*='Menu-container']",
    "button",
    "li"
  ].join(","))) {
    return option;
  }
  return option.querySelector([
    "[role=option]",
    "[class*='Menu-container']",
    "button",
    "li"
  ].join(",")) || option;
}

function optionGroupHasValue(element) {
  return Boolean(element.querySelector([
    "input:checked",
    "[aria-checked=true]",
    "[aria-selected=true]",
    ".is-checked",
    ".selected",
    "[class*='selected']",
    "[class*='Selected']"
  ].join(",")));
}

function regionField(element) {
  return /地区|地点|城市|现居|户籍|籍贯|生源地|省份|city|province|location/.test(
    normalizeText(`${labelOf(element)} ${nearbyTextOf(element)}`)
  );
}

function regionTokens(value) {
  const source = String(value || "").trim();
  const tokens = source.match(/[^省市区县州盟]+(?:省|市|自治区|特别行政区|区|县|自治州|州|盟)/g) || [];
  return [...new Set([source, ...tokens].filter(Boolean))];
}

function regionOverlay() {
  const selectors = [
    "[role=dialog]",
    ".phoenix-unmodeled-layer",
    ".phoenix-popover",
    ".ant-modal",
    ".ant-cascader-menus",
    "[class*='region']",
    "[class*='Region']",
    "[class*='area']",
    "[class*='Area']"
  ].join(",");
  return queryAllDeep(document, selectors)
    .filter(isVisible)
    .find(node => /地区|省市|清空已选|确定|确认|搜索/.test(node.innerText || node.textContent || "")) || null;
}

function findTextOption(root, values) {
  const wanted = values.map(normalizeText).filter(Boolean);
  const nodes = queryAllDeep(root, "button,a,label,li,[role=option],[role=radio],span,div")
    .filter(node => {
      if (!isVisible(node) || node.children.length > 2) return false;
      const text = normalizeText(node.innerText || node.textContent);
      return text && text.length < 40;
    });
  return nodes.find(node => wanted.includes(normalizeText(node.innerText || node.textContent))) ||
    nodes.find(node => wanted.some(value => normalizeText(node.innerText || node.textContent).includes(value)));
}

async function chooseRegionControl(element, value) {
  if (!regionField(element)) return false;
  const target = selectWrapperFor(element) || element;
  clickElement(target);
  await sleep(220);
  const overlay = regionOverlay();
  if (!overlay) return false;

  const tokens = regionTokens(value);
  let selected = false;
  const search = [...overlay.querySelectorAll("input")].find(input =>
    /搜索|地区|城市/.test(`${input.placeholder || ""}${input.getAttribute("aria-label") || ""}`)
  );
  if (search) {
    forceNativeValue(search, value);
    await sleep(220);
    const searched = findTextOption(overlay, tokens);
    if (searched) {
      clickElement(searched);
      await sleep(160);
      selected = true;
    }
  }

  for (const token of tokens.slice(1)) {
    const option = findTextOption(overlay, [token]);
    if (!option) continue;
    clickElement(option);
    await sleep(140);
    selected = true;
  }

  const confirm = findTextOption(overlay, ["确定", "确认", "完成"]);
  if (confirm) {
    clickElement(confirm);
    await sleep(180);
    selected = true;
  }
  return selected;
}

async function chooseControl(element, value) {
  const target = selectWrapperFor(element) || element;
  target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  target.click();
  await sleep(220);
  const input = target.querySelector?.("input:not([type=hidden])") ||
    (element instanceof HTMLInputElement ? element : null);
  if (input && !input.readOnly) {
    setSearchValue(input, value);
    await sleep(260);
  }
  const options = optionCandidates(target);
  const option = bestOption(options, value);
  if (!option) {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    return false;
  }
  clickElement(clickableOption(option));
  await sleep(160);
  return true;
}

function formatDateValue(element, value) {
  const source = String(value || "").trim();
  const match = source.match(/(\d{4})\D{0,3}(\d{1,2})?\D{0,3}(\d{1,2})?/);
  if (!match) return source;
  const year = match[1];
  const month = (match[2] || "01").padStart(2, "0");
  const day = (match[3] || "01").padStart(2, "0");
  if (element instanceof HTMLInputElement && element.type === "month") return `${year}-${month}`;
  if (element instanceof HTMLInputElement && element.type === "date") return `${year}-${month}-${day}`;
  return `${year}-${month}${match[3] ? `-${day}` : ""}`;
}

async function fillDateLikeControl(element, value) {
  const label = normalizeText(`${labelOf(element)} ${nearbyTextOf(element)}`);
  const formatted = formatDateValue(element, value).replace(/[./年]/g, "-").replace(/月|日/g, "").replace(/-+/g, "-").replace(/-$/, "");
  if (!/日期|时间|年月|date|month|到岗|入职|开始|结束|有效期|到期|毕业|实习至/.test(label) &&
    !/date|month/.test(element.type || "")) return false;
  if (!/^\d{4}-\d{1,2}/.test(formatted)) return false;
  if (await choosePhoenixMonth(element, value)) return true;
  forceNativeValue(element, formatted);
  await sleep(100);
  return true;
}

function controlCurrentValue(element) {
  if (element instanceof HTMLSelectElement) {
    return element.selectedOptions?.[0]?.textContent?.trim() || element.value || "";
  }
  const wrapper = selectWrapperFor(element);
  const display = wrapper?.querySelector([
    "[class*='Input-display-value']",
    ".ant-select-selection-item",
    ".el-select__selected-item",
    ".ivu-select-selected-value",
    "[class*='selected-value']",
    "[class*='SelectedValue']"
  ].join(","));
  const displayValue = String(display?.innerText || display?.textContent || "").trim();
  if (displayValue || /sd-Select/.test(String(wrapper?.className || ""))) return displayValue;
  return String(element.value ?? element.textContent ?? "").trim();
}

async function fillControl(element, value, overwrite = false) {
  if (value == null || (typeof value !== "object" && String(value).trim() === "")) return "empty";
  if (element instanceof HTMLInputElement && element.type === "file") {
    if (!overwrite && element.files?.length) return "skipped";
    const file = fileFromStoredAvatar(value);
    return setFileInput(element, file) ? "filled" : "file";
  }
  if (componentType(element) === "option-group") {
    if (!overwrite && optionGroupHasValue(element)) return "skipped";
    const options = groupOptionNodes(element);
    const option = options.find(item => optionMatchText(item.innerText || item.textContent, value));
    if (!option) return "failed";
    const clickable = option.querySelector?.(".phoenix-radio,[role=radio],input,button") || option;
    clickElement(clickable);
    await sleep(80);
    return "filled";
  }

  if (element.type === "radio" || element.type === "checkbox") {
    const group = element.name
      ? queryAllDeep(ownerRoot(element), `input[name="${CSS.escape(element.name)}"]`)
      : [element];
    if (!overwrite && group.some(item => item.checked)) return "skipped";
    const option = group.find(item => {
      const optionLabel = labelOf(item);
      return optionMatchText(item.value, value) || optionMatchText(optionLabel, value);
    });
    if (!option && element.type === "checkbox" && group.length === 1) {
      const target = /^(是|有|可以|接受|愿意|yes|true|1)$/i.test(String(value).trim());
      if (element.checked !== target) element.click();
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return "filled";
    }
    if (!option) return "failed";
    option.click();
    option.dispatchEvent(new Event("change", { bubbles: true }));
    return "filled";
  }

  const current = controlCurrentValue(element);
  if (!overwrite && String(current).trim() && !/请选择|请输入|选择/.test(String(current))) return "skipped";

  if (element instanceof HTMLSelectElement) {
    return setNativeValue(element, value) ? "filled" : "failed";
  }

  const choiceWrapper = selectWrapperFor(element);
  const choice = element.getAttribute("role") === "combobox" ||
    (element.readOnly && /请选择|选择/.test(element.placeholder || "")) ||
    Boolean(choiceWrapper);
  if (choice) {
    const placeholder = normalizeText(element.getAttribute("placeholder"));
    if (placeholder === "年" || placeholder === "月") {
      const numericValue = String(Number(String(value).match(/\d+/)?.[0] || value));
      return await chooseControl(element, numericValue) ? "filled" : "failed";
    }
    if (await fillDateLikeControl(element, value)) return "filled";
    if (await chooseRegionControl(element, value)) return "filled";
    return await chooseControl(element, value) ? "filled" : "failed";
  }
  if (element.readOnly) return "readonly";
  return setNativeValue(element, value) ? "filled" : "failed";
}

function sectionFieldScore(node, definition) {
  if (!definition) return 0;
  const text = normalizeText(node.innerText || node.textContent);
  return Object.values(definition.fields).filter(aliases =>
    aliases.some(alias => text.includes(normalizeText(alias)))
  ).length;
}

function findSection(titles, definition) {
  const titleSet = titles.map(normalizeText);
  const headings = queryAllDeep(document, "h1,h2,h3,h4,h5,h6,legend,div,span,p,li")
    .filter(element => {
      if (!isVisible(element) || element.children.length > 5) return false;
      if (element.closest("nav,aside,[role=navigation]")) return false;
      const text = normalizeText(directText(element) || shortText(element));
      return titleSet.some(title => text === title || text.startsWith(title));
    });
  const candidates = [];
  headings.forEach(heading => {
    let node = heading;
    for (let depth = 1; depth <= 9 && node?.parentElement; depth += 1) {
      node = node.parentElement;
      const count = controls(node).length;
      if (count < 2 || count > 100) continue;
      const fieldScore = sectionFieldScore(node, definition);
      if (definition && fieldScore < 2) continue;
      const add = findAddButton(node);
      candidates.push({
        node,
        score: depth * 12 + count * 1.5 - fieldScore * 12 - (add ? 6 : 0)
      });
      if (add && fieldScore >= 3) break;
    }
  });
  candidates.sort((left, right) => left.score - right.score);
  return candidates[0]?.node || null;
}

function findAddButton(root) {
  const candidates = queryAllDeep(root, "button,a,[role=button],div,span").filter(element => {
    if (!isVisible(element) || element.disabled) return false;
    const text = normalizeText(element.innerText || element.textContent || element.getAttribute("aria-label"));
    return /^(添加|新增|增加|继续添加|添加一条|新增一条|添加经历|新增经历|add|addanother|addmore|\+)$/.test(text) ||
      /^(\+)?(添加|新增|增加)/.test(text) ||
      /^add(another|more|education|employment|experience|work|project|award|certificate)?/.test(text);
  });
  candidates.sort((left, right) => {
    const leftCursor = getComputedStyle(left).cursor === "pointer" ? 0 : 1;
    const rightCursor = getComputedStyle(right).cursor === "pointer" ? 0 : 1;
    return leftCursor - rightCursor || left.children.length - right.children.length;
  });
  return candidates[0] || null;
}

function workInfoHeadings() {
  const candidates = queryAllDeep(document, "h1,h2,h3,h4,h5,h6,legend,div,span,p,li")
    .filter(element => {
      if (!isVisible(element) || element.children.length > 5) return false;
      return /^工作信息\d*$/.test(normalizeText(element.textContent));
    });
  return candidates.filter(element =>
    !candidates.some(other => other !== element && element.contains(other))
  );
}

function commonAncestor(nodes) {
  if (!nodes.length) return null;
  let node = nodes[0];
  while (node && node !== document.body) {
    if (nodes.every(item => node.contains(item))) return node;
    node = node.parentElement;
  }
  return document.body;
}

function workInfoSection() {
  const headings = workInfoHeadings();
  if (!headings.length) return null;
  if (headings.length > 1) {
    const root = commonAncestor(headings);
    if (root && controls(root).length >= headings.length * 4) return root;
  }
  let node = headings[0];
  for (let depth = 0; depth < 10 && node && node !== document.body; depth += 1, node = node.parentElement) {
    const count = controls(node).length;
    if (count < 4 || count > 40) continue;
    if (dateLayoutControls(node).length >= 2 &&
      controls(node).some(control => control instanceof HTMLTextAreaElement || control.isContentEditable)) {
      return node;
    }
  }
  return headings[0].parentElement || null;
}

function findControlByAliases(root, aliases, used = new Set(), key = "") {
  const nearLabel = findControlNearLabel(root, aliases, key, used);
  if (nearLabel) return nearLabel;
  let best = null;
  controls(root).forEach(element => {
    if (used.has(element)) return;
    const match = bestControlAlias(element, aliases, root);
    if (!match) return;
    let score = match.score;
    if (element instanceof HTMLTextAreaElement && aliases.some(alias => /内容|描述|职责|成果|description|responsibilities/i.test(alias))) {
      score += 10;
    }
    if (element instanceof HTMLInputElement && /date|month/.test(element.type) &&
      aliases.some(alias => /时间|日期|date|from|to/i.test(alias))) {
      score += 8;
    }
    if (score && (!best || score > best.score)) best = { element, score };
  });
  return best?.element || null;
}

function fallbackControlByKey(block, definition, key, used) {
  const available = controls(block).filter(control => !used.has(control));
  if (!available.length) return null;
  if (key === "description" || key === "content" || key === "duty" || key === "result") {
    return available.find(control => control instanceof HTMLTextAreaElement || control.isContentEditable) || null;
  }
  if (definition.type === "work") {
    const textControls = available.filter(control =>
      !(control instanceof HTMLTextAreaElement) &&
      !control.isContentEditable &&
      control.type !== "checkbox" &&
      control.type !== "radio" &&
      !/日期|时间|请选择|date|month/.test(normalizeText(`${control.type || ""}${control.placeholder || ""}${labelOf(control)}${nearbyTextOf(control, block)}`))
    );
    const order = ["company", "position", "department", "city"];
    const index = order.indexOf(key);
    if (index >= 0) return textControls[index] || null;
  }
  return null;
}

function recordDescription(record) {
  const parts = [
    record.businessBackground,
    record.description,
    record.content,
    record.duty,
    record.result,
    record.responsibilities,
    record.detail,
    record.raw,
    record.text
  ].map(value => String(value || "").trim()).filter(Boolean);
  if (parts.length) return [...new Set(parts)].join("\n");
  if (Array.isArray(record.bullets)) {
    return record.bullets.map(item => String(item).trim()).filter(Boolean).join("\n");
  }
  return "";
}

function isBlankControl(element) {
  const current = controlCurrentValue(element);
  return !current || /^(请选择|请输入|选择)$/.test(current);
}

function dateLayoutControls(block) {
  return controls(block).filter(control => {
    if (!(control instanceof HTMLInputElement)) return false;
    if (control.type === "checkbox" || control.type === "radio" || control.type === "file") return false;
    const text = normalizeText(`${control.type || ""} ${control.placeholder || ""} ${labelOf(control)} ${control.className || ""}`);
    return /请选择|日期|时间|年月|date|month|calendar|picker/.test(text) || control.readOnly;
  });
}

async function fillWorkByLayout(block, record, overwrite, used) {
  let filled = 0;
  const notes = [];
  const diagnostics = [];
  const handledKeys = new Set();
  const blockControls = controls(block);
  const startAliases = ["开始时间", "起始时间", "开始日期", "起止时间", "start date", "from"];
  const endAliases = ["结束时间", "结束日期", "end date", "to"];
  const dateControls = dateLayoutControls(block);
  const textareas = blockControls.filter(control => control instanceof HTMLTextAreaElement || control.isContentEditable);
  const startControl = findControlNearLabel(block, startAliases, "start", new Set()) || dateControls[0];
  const endControl = findControlNearLabel(block, endAliases, "end", new Set()) ||
    dateControls.find(control => control !== startControl) ||
    dateControls[1];
  const description = recordDescription(record);

  diagnostics.push(`块控件${blockControls.length}`);
  diagnostics.push(`日期控件${dateControls.length}`);
  diagnostics.push(`文本域${textareas.length}`);
  diagnostics.push(`内容${description.length}字`);

  const partsResult = await fillYearMonthParts(block, record, overwrite, used);
  filled += partsResult.filled;
  if (partsResult.handled) {
    notes.push("起止年月");
  } else {
    if (startControl && record.start && (overwrite || isBlankControl(startControl))) {
      const selected = await choosePhoenixMonth(startControl, record.start);
      if (!selected) forceNativeValue(startControl, formatDateValue(startControl, record.start));
      used.add(startControl);
      filled += 1;
      notes.push(selected ? "开始时间（面板选择）" : "开始时间（写值兜底）");
    }
    if (endControl && record.end && (overwrite || isBlankControl(endControl))) {
      const selected = await choosePhoenixMonth(endControl, record.end);
      if (!selected) forceNativeValue(endControl, formatDateValue(endControl, record.end));
      used.add(endControl);
      filled += 1;
      notes.push(selected ? "结束时间（面板选择）" : "结束时间（写值兜底）");
    }
  }

  const textarea = findControlNearLabel(block, REPEAT_DEFS.find(item => item.type === "work").fields.description, "description", new Set()) ||
    textareas[0];
  if (textarea && description) {
    handledKeys.add("description");
    used.add(textarea);
    if (overwrite || isBlankControl(textarea)) {
      forceNativeValue(textarea, description);
      filled += 1;
      notes.push("实习内容");
    }
  }

  return { filled, failed: partsResult.failed, handledKeys, notes, diagnostics };
}

function recordContainer(anchor, root, anchorControls, definition) {
  let node = anchor;
  let best = null;
  let fallback = null;
  for (let depth = 0; depth < 18 && node && node !== root; depth += 1, node = node.parentElement) {
    const childControls = controls(node);
    if (childControls.length < 2 || childControls.length > 30) continue;
    const anchorCount = anchorControls.filter(control => node.contains(control)).length;
    if (anchorCount !== 1) continue;
    fallback = node;
    const textareas = childControls.filter(control =>
      control instanceof HTMLTextAreaElement || control.isContentEditable
    ).length;
    const dates = dateLayoutControls(node).length;
    const shapeScore = Object.values(definition.fields).filter(aliases =>
      aliases.some(alias => normalizeText(node.innerText || node.textContent).includes(normalizeText(alias)))
    ).length;
    const score = textareas * 120 + Math.min(dates, 2) * 45 + shapeScore * 8 - childControls.length - depth;
    if (!best || score > best.score) best = { node, score, textareas, dates };
    if (definition.type === "work" && textareas >= 1 && dates >= 2) return node;
  }
  return best?.node || fallback || root;
}

function recordAnchorControls(root, definition) {
  const result = controls(root).filter(control => {
    const controlRoot = ownerRoot(control);
    const explicit = [
      control.getAttribute("aria-label"),
      textFromIdList(control.getAttribute("aria-labelledby"), controlRoot),
      control.getAttribute("placeholder"),
      control.getAttribute("name"),
      control.getAttribute("data-field"),
      control.getAttribute("data-field-name"),
      control.getAttribute("data-label")
    ].filter(Boolean).join(" ");
    return bestAlias(explicit, definition.anchors);
  });
  queryAllDeep(root, "label,span,div,p,dt,dd").forEach(node => {
    if (!isVisible(node) || queryAllDeep(node, "input,textarea,select,[role=combobox]").length) return;
    const text = `${directText(node)} ${node.getAttribute("aria-label") || ""}`.trim();
    const match = bestAlias(text, definition.anchors);
    if (!match || match.score < 82) return;
    const control = nearestControlsFromLabel(root, node, "anchor", new Set());
    if (control && !result.includes(control)) result.push(control);
  });
  return result.sort((left, right) => {
    const position = left.compareDocumentPosition(right);
    return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  });
}

function recordBlocks(root, definition) {
  const anchorControls = recordAnchorControls(root, definition);
  if (anchorControls.length) {
    const blocks = [];
    anchorControls.forEach(anchor => {
      const block = recordContainer(anchor, root, anchorControls, definition);
      if (!blocks.includes(block)) blocks.push(block);
    });
    if (blocks.length) return blocks;
  }

  const fieldGroups = Object.values(definition.fields);
  const structural = queryAllDeep(root, "div,section,article,li").filter(node => {
    const count = controls(node).length;
    if (count < 2 || count > 20) return false;
    const text = normalizeText(node.innerText || node.textContent);
    const score = fieldGroups.filter(aliases =>
      aliases.some(alias => text.includes(normalizeText(alias)))
    ).length;
    if (score < 2) return false;
    return ![...node.children].some(child => {
      const childCount = controls(child).length;
      if (childCount < 2 || childCount > 20) return false;
      const childText = normalizeText(child.innerText || child.textContent);
      return fieldGroups.filter(aliases =>
        aliases.some(alias => childText.includes(normalizeText(alias)))
      ).length >= 2;
    });
  });
  if (structural.length) return structural;

  return controls(root).length >= 2 ? [root] : [];
}

async function ensureRecordBlocks(root, definition, count) {
  let blocks = recordBlocks(root, definition);
  let attempts = 0;
  while (blocks.length < count && attempts < count + 2) {
    const button = findAddButton(root);
    if (!button) break;
    button.click();
    await sleep(420);
    const next = recordBlocks(root, definition);
    if (next.length <= blocks.length) {
      attempts += 1;
      if (attempts >= 2) break;
    } else {
      blocks = next;
      attempts = 0;
    }
  }
  return blocks;
}

function splitDate(value) {
  const match = String(value || "").match(/(\d{4})\D{0,3}(\d{1,2})?/);
  return match ? { year: match[1], month: (match[2] || "").padStart(2, "0") } : { year: "", month: "" };
}

function numericPart(value) {
  const digits = String(value || "").match(/\d+/)?.[0];
  return digits ? String(Number(digits)) : "";
}

function numericControlMatches(control, value) {
  const expected = numericPart(value);
  const actual = numericPart(controlCurrentValue(control));
  return Boolean(expected && actual && expected === actual);
}

async function fillYearMonthControl(control, value, overwrite) {
  const numericValue = numericPart(value);
  if (!numericValue) return "empty";
  if (!overwrite && !isBlankControl(control)) return "skipped";
  const choice = Boolean(selectWrapperFor(control)) ||
    control.getAttribute("role") === "combobox";
  if (!choice) return fillControl(control, numericValue, overwrite);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (await chooseControl(control, numericValue)) {
      await sleep(100);
      if (numericControlMatches(control, numericValue)) return "filled";
    }
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await sleep(80);
  }
  return "failed";
}

async function fillYearMonthParts(block, record, overwrite, used) {
  const parts = controls(block).filter(control => {
    if (used.has(control)) return false;
    const placeholder = normalizeText(control.getAttribute("placeholder"));
    return placeholder === "年" || placeholder === "月";
  });
  const years = parts.filter(control => normalizeText(control.getAttribute("placeholder")) === "年");
  const months = parts.filter(control => normalizeText(control.getAttribute("placeholder")) === "月");
  if (years.length < 2 || months.length < 2) {
    return { filled: 0, failed: 0, handled: false };
  }

  const start = splitDate(record.start);
  const end = splitDate(record.end);
  const assignments = [
    [years[0], start.year],
    [months[0], start.month],
    [years[1], end.year],
    [months[1], end.month]
  ];
  let filled = 0;
  let failed = 0;
  for (const [control, value] of assignments) {
    used.add(control);
    if (!value) continue;
    const status = await fillYearMonthControl(control, value, overwrite);
    if (status === "filled") filled += 1;
    else if (status === "failed") failed += 1;
  }
  return { filled, failed, handled: true };
}

async function fillDateRange(block, record, overwrite, used) {
  const startAliases = ["开始时间", "起始时间", "入学时间", "就读开始时间", "开始日期", "起止时间", "start date", "from"];
  const endAliases = ["结束时间", "毕业时间", "离职时间", "就读结束时间", "结束日期", "end date", "to"];
  const partsResult = await fillYearMonthParts(block, record, overwrite, used);
  if (partsResult.handled) return partsResult.filled;
  let filled = 0;

  const startControl = findControlByAliases(block, startAliases, used, "start");
  const endControl = findControlByAliases(block, endAliases, used, "end");
  if (startControl && record.start) {
    if (await fillControl(startControl, record.start, overwrite) === "filled") filled += 1;
    used.add(startControl);
  }
  if (endControl && record.end) {
    if (await fillControl(endControl, record.end, overwrite) === "filled") filled += 1;
    used.add(endControl);
  }
  if (startControl || endControl) return filled;

  const genericDates = controls(block).filter(control => {
    if (used.has(control)) return false;
    const text = normalizeText(`${control.type} ${control.placeholder || ""} ${labelOf(control)} ${nearbyTextOf(control, block)}`);
    return /date|month|时间|日期|年月/.test(text);
  });
  if (genericDates[0] && record.start) {
    if (await fillControl(genericDates[0], record.start, overwrite) === "filled") filled += 1;
    used.add(genericDates[0]);
  }
  if (genericDates[1] && record.end) {
    if (await fillControl(genericDates[1], record.end, overwrite) === "filled") filled += 1;
    used.add(genericDates[1]);
  }
  return filled;
}

async function fillRecord(block, definition, record, overwrite) {
  const used = new Set();
  let layout = { filled: 0, notes: [], diagnostics: [] };
  if (definition.type === "work") {
    layout = await fillWorkByLayout(block, record, overwrite, used);
  }
  let filled = layout.filled;
  if (definition.type !== "work") {
    filled += await fillDateRange(block, record, overwrite, used);
  }
  let failed = layout.failed || 0;
  for (const [key, aliases] of Object.entries(definition.fields)) {
    if (layout.handledKeys?.has(key)) continue;
    const value = record[key];
    if (value == null || String(value).trim() === "") continue;
    const control = findControlByAliases(block, aliases, used, key) ||
      fallbackControlByKey(block, definition, key, used);
    if (!control) {
      failed += 1;
      continue;
    }
    used.add(control);
    const status = await fillControl(control, value, overwrite);
    if (status === "filled") filled += 1;
    else if (status === "failed" || status === "readonly") failed += 1;
  }
  controls(block).forEach(control => used.add(control));
  return { filled, failed, used, notes: layout.notes, diagnostics: layout.diagnostics };
}

function sectionForDefinition(definition) {
  if (definition.type !== "work") return findSection(definition.titles, definition);
  return findSection(["实习经历", "实习经验"], definition) ||
    findSection(["工作经历", "工作经验", "任职经历"], definition) ||
    workInfoSection() ||
    findSection(["work experience", "employment history", "experience"], definition) ||
    findSection(definition.titles, definition);
}

async function fillRepeatedSections(store, profile, overwrite) {
  const items = [];
  const handled = new Set();
  for (const definition of REPEAT_DEFS) {
    const records = definition.type === "work" ? (profile?.work || []) : (store[definition.type] || []);
    if (!records.length) continue;
    const root = sectionForDefinition(definition);
    if (!root) continue;
    const blocks = await ensureRecordBlocks(root, definition, records.length);
    for (let index = 0; index < Math.min(records.length, blocks.length); index += 1) {
      const result = await fillRecord(blocks[index], definition, records[index], overwrite);
      result.used.forEach(control => handled.add(control));
      items.push({
        label: `${definition.titles[0]} ${index + 1}：${definition.label(records[index])}${result.notes?.length ? `（兜底：${result.notes.join("、")}）` : ""}${result.diagnostics?.length ? `（诊断：${result.diagnostics.join("、")}）` : ""}`,
        state: result.failed ? "yellow" : "green",
        status: result.filled ? "已填写" : "未匹配"
      });
    }
    if (blocks.length < records.length) {
      items.push({
        label: `${definition.titles[0]}：网页未能追加到 ${records.length} 条`,
        state: "yellow",
        status: "未匹配"
      });
    }
  }
  return { items, handled };
}

function educationRank(record) {
  const value = `${record?.level || ""} ${record?.degree || ""}`.toLocaleLowerCase("zh-CN");
  const ranks = [
    [/博士|doctor|phd/, 5],
    [/硕士|研究生|master/, 4],
    [/本科|学士|bachelor/, 3],
    [/大专|专科|associate/, 2],
    [/高中|中专|highschool/, 1]
  ];
  return ranks.find(([pattern]) => pattern.test(value))?.[1] || 0;
}

function highestEducationRecord(education = []) {
  return education.reduce((highest, record) =>
    educationRank(record) > educationRank(highest) ? record : highest
  , education[0] || {});
}

function flattened(personal, education, profile, skills = [], languages = []) {
  const firstEducation = highestEducationRecord(education);
  const latestWork = profile?.work?.[0] || {};
  const graduationDate = firstEducation.end || personal.graduationDate || "";
  return {
    ...personal,
    city: personal.city || personal.currentCity,
    country: personal.country || personal.nationality,
    expectedRole: personal.expectedRole || profile?.target || "",
    school: firstEducation.school || personal.school,
    college: firstEducation.college || personal.college,
    major: firstEducation.major || personal.major,
    educationLevel: firstEducation.level || personal.educationLevel,
    degree: firstEducation.degree || personal.degree,
    educationType: firstEducation.type || personal.educationType,
    gpa: firstEducation.gpa || personal.gpa,
    rank: firstEducation.rank || personal.rank,
    courses: firstEducation.courses || personal.courses,
    graduationDate,
    graduationYear: personal.graduationYear || String(graduationDate).match(/\d{4}/)?.[0] || "",
    latestCompany: personal.latestCompany || latestWork.company || "",
    currentPosition: personal.currentPosition || latestWork.position || "",
    currentDepartment: personal.currentDepartment || latestWork.department || "",
    skillsSummary: skills.map(skill => skill.name).filter(Boolean).join("、"),
    languagesSummary: languages.map(language => language.language || language.exam).filter(Boolean).join("、"),
    avatarFile: personal.avatarFile || null,
    resumeAttachment: profile?.attachment || personal.resumeAttachment || "",
    summary: profile?.summary || personal.summary || ""
  };
}

function mappedValue(key, data, customFields, settings = {}) {
  if (key?.startsWith("custom:")) {
    return customDefinitions(customFields).find(definition => definition.key === key)?.value;
  }
  if (key?.startsWith("rule:")) {
    return ruleDefinitions(settings.aiRules || []).find(definition => definition.key === key)?.value;
  }
  return data[key];
}

function hasMappedValue(value) {
  if (value == null) return false;
  if (typeof value === "object") return Boolean(value.dataUrl || value.value);
  return String(value).trim() !== "";
}

async function fillBaseFields(data, customFields, settings, handled, targets, aiResult) {
  const items = [];
  const candidates = new Map(availableCandidates(data, customFields, settings).map(candidate => [candidate.key, candidate]));
  for (let index = 0; index < targets.length; index += 1) {
    const element = targets[index];
    const ruleMatch = matchControl(element, customFields);
    const aiMatch = aiResult.mappings.get(`field-${index}`);
    let match = ruleMatch;
    if ((!ruleMatch || ruleMatch.confidence < 82) && aiMatch?.targetKey) {
      const candidate = candidates.get(aiMatch.targetKey);
      if (candidate) {
        match = {
          key: aiMatch.targetKey,
          label: candidate.label,
          confidence: Math.round(aiMatch.confidence * 100),
          ai: true
        };
      }
    }
    if (!match) continue;
    handled.add(element);
    const value = mappedValue(match.key, data, customFields, settings);
    if (!hasMappedValue(value)) {
      items.push({ label: `${match.label}：资料库暂无值`, state: "yellow", status: "未匹配" });
      continue;
    }
    const result = await fillControl(element, value, Boolean(settings.overwrite));
    if (result === "filled") {
      const source = match.key?.startsWith("rule:") ? "（AI 规则）" : match.ai ? "（AI 匹配）" : "";
      const action = element instanceof HTMLInputElement && element.type === "file" ? "已上传" : "已填写";
      items.push({ label: `${match.label}：${action}${source}`, state: match.confidence >= 82 ? "green" : "yellow", status: action });
    } else if (result === "skipped") {
      items.push({ label: `${match.label}：网页已有内容`, state: "gray", status: "跳过" });
    } else if (result === "readonly") {
      items.push({ label: `${match.label}：网页字段只读`, state: "gray", status: "跳过" });
    } else if (result === "file") {
      items.push({ label: `${match.label}：浏览器限制，需手动上传附件`, state: "yellow", status: "需手动" });
    } else {
      items.push({ label: `${match.label}：未找到可选项`, state: "yellow", status: "未匹配" });
    }
  }
  if (aiResult.source && aiResult.source !== "disabled" && aiResult.source !== "error") {
    items.unshift({ label: `AI 模型已参与网页字段匹配（${aiResult.source === "cache" ? "使用缓存" : aiResult.source}）`, state: "green", status: "AI匹配" });
  } else if (aiResult.error) {
    items.unshift({ label: `AI 字段匹配不可用：${aiResult.error}`, state: "yellow", status: "未匹配" });
  }
  return items;
}

function frameElements() {
  if (window.top !== window) return [];
  return queryAllDeep(document, "iframe,frame")
    .filter(frame => isVisible(frame) && frame.contentWindow);
}

async function requestFrameResults(type, payload = {}) {
  const frames = frameElements();
  if (!frames.length) return [];
  const id = `jianfill-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const results = [];
  const handler = event => {
    const data = event.data || {};
    if (data.source === "jianfill-frame-result" && data.id === id) {
      results.push(data.result);
    }
  };
  window.addEventListener("message", handler);
  frames.forEach(frame => {
    try {
      frame.contentWindow.postMessage({ source: "jianfill-frame-request", id, type, payload }, "*");
    } catch {}
  });
  await sleep(900);
  window.removeEventListener("message", handler);
  return results.filter(Boolean);
}

function mergeScanResults(current, frameResults) {
  return frameResults.reduce((summary, result) => ({
    count: summary.count + (result.count || 0),
    total: summary.total + (result.total || 0),
    aiMatched: summary.aiMatched + (result.aiMatched || 0),
    aiSource: summary.aiSource || result.aiSource || "",
    aiError: summary.aiError || result.aiError || ""
  }), { ...current });
}

async function scanCurrentFrame() {
  const store = await chrome.storage.local.get([
    "personal", "education", "skills", "languages", "profiles",
    "activeProfileId", "settings", "customFields"
  ]);
  const profile = (store.profiles || []).find(item => item.id === store.activeProfileId) || store.profiles?.[0];
  const data = flattened(store.personal || {}, store.education || [], profile, store.skills || [], store.languages || []);
  const allControls = fieldTargets();
  const aiResult = await requestAiMappings(allControls, data, store.customFields || [], store.settings || {});
  const matches = allControls.filter((control, index) =>
    matchControl(control, store.customFields || []) ||
    matchRepeatControl(control) ||
    aiResult.mappings.has(`field-${index}`)
  );
  return { count: matches.length, total: allControls.length, aiMatched: aiResult.mappings.size, aiSource: aiResult.source, aiError: aiResult.error };
}

async function scanForm() {
  const current = await scanCurrentFrame();
  const frameResults = await requestFrameResults("SCAN_FORM");
  return mergeScanResults(current, frameResults);
}

async function fillCurrentFrame(mode = "supplement") {
  const store = await chrome.storage.local.get([
    "personal", "education", "projects", "languages", "skills", "awards", "papers", "certificates", "portfolio",
    "profiles", "activeProfileId", "settings", "customFields"
  ]);
  const profile = (store.profiles || []).find(item => item.id === store.activeProfileId) || store.profiles?.[0];
  const data = flattened(store.personal || {}, store.education || [], profile, store.skills || [], store.languages || []);
  const overwrite = mode === "full";
  const settings = { ...(store.settings || {}), overwrite };
  const repeated = await fillRepeatedSections(store, profile, overwrite);
  const targets = fieldTargets().filter(element => !repeated.handled.has(element));
  const aiResult = await requestAiMappings(targets, data, store.customFields || [], settings);
  const items = [
    ...repeated.items,
    ...await fillBaseFields(data, store.customFields || [], settings, repeated.handled, targets, aiResult)
  ];
  if (!items.length) {
    items.push({
      label: "未识别到可填写字段，请确认页面表单已展开",
      state: "yellow",
      status: "未匹配"
    });
  }
  return { items, profile: profile?.name, mode };
}

async function fillForm(mode = "supplement") {
  const current = await fillCurrentFrame(mode);
  const frameResults = await requestFrameResults("FILL_FORM", { mode });
  const frameItems = frameResults.flatMap(result => result.items || []);
  if (!frameItems.length) return current;
  const currentItems = current.items.filter(item => !/未识别到可填写字段/.test(item.label || ""));
  return {
    ...current,
    items: [...currentItems, ...frameItems],
    frameCount: frameResults.length
  };
}

window.addEventListener("message", event => {
  const data = event.data || {};
  if (data.source !== "jianfill-frame-request") return;
  (async () => {
    const result = data.type === "SCAN_FORM"
      ? await scanCurrentFrame()
      : await fillCurrentFrame(data.payload?.mode);
    event.source?.postMessage({ source: "jianfill-frame-result", id: data.id, result }, "*");
  })().catch(error => {
    event.source?.postMessage({
      source: "jianfill-frame-result",
      id: data.id,
      result: { error: error.message || "iframe 适配失败", items: [] }
    }, "*");
  });
});

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  (async () => {
    if (message.type === "SCAN_FORM") reply(await scanForm());
    if (message.type === "FILL_FORM") reply(await fillForm(message.mode));
  })().catch(error => {
    console.error("[简填]", error);
    reply({ error: error.message || "页面适配失败" });
  });
  return true;
});

if (location.hostname === "127.0.0.1" || location.hostname === "localhost") {
  window.__jianfillTest = { scanCurrentFrame, fillCurrentFrame };
}
