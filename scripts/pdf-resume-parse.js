(function (root) {
  const SECTION_ALIASES = {
    "基本信息": "basic",
    "个人信息": "basic",
    "基本资料": "basic",
    "个人资料": "basic",
    "求职意向": "intent",
    "求职目标": "intent",
    "自我描述": "summary",
    "自我评价": "summary",
    "个人优势": "summary",
    "自我评价及报名理由": "summary",
    "教育经历": "education",
    "教育背景": "education",
    "项目经历": "projects",
    "项目经验": "projects",
    "工作经历": "work",
    "工作经验": "work",
    "实习经历": "work",
    "实习经验": "work",
    "荣誉奖励": "awards",
    "获奖情况": "awards",
    "获奖经历": "awards",
    "荣誉经历": "awards",
    "语言能力": "languages",
    "父母信息": "parents",
    "其他家庭成员": "family",
    "家庭成员": "family",
    "证书信息": "certificates",
    "资格证书": "certificates",
    "职业资格": "certificates",
    "校内实践": "campus",
    "校园经历": "campus"
  };

  const BASIC_LABELS = {
    "参加工作时间": "",
    "紧急联系人电话（国内手机号码）": "emergencyContactPhone",
    "紧急联系人电话": "emergencyContactPhone",
    "紧急联系人关系": "emergencyContactRelation",
    "紧急联系人姓名": "emergencyContactName",
    "身份证件号码": "identityNumber",
    "身份证号码": "identityNumber",
    "身份证号": "identityNumber",
    "证件号码": "identityNumber",
    "证件号": "identityNumber",
    "证件类型": "identityType",
    "预计毕业日期": "graduationDate",
    "毕业年份": "graduationYear",
    "招聘信息获取来源": "recruitmentSource",
    "现居地址": "currentCity",
    "现居住地": "currentCity",
    "现居住城市": "currentCity",
    "户籍所在地": "household",
    "户籍地": "household",
    "通信地址": "address",
    "邮政编码": "postalCode",
    "出生日期": "birthDate",
    "婚姻状况": "maritalStatus",
    "健康状况": "health",
    "政治面貌": "politics",
    "国家/地区": "nationality",
    "居住地": "currentCity",
    "籍贯": "nativePlace",
    "生源地": "birthplace",
    "微信账号": "wechat",
    "微信ID": "wechat",
    "WeChat": "wechat",
    "微信号": "wechat",
    "微信": "wechat",
    "QQ号码": "qq",
    "QQ号": "qq",
    "QQ": "qq",
    "手机": "phone",
    "手机号码": "phone",
    "手机号": "phone",
    "联系电话": "phone",
    "电子邮箱地址": "email",
    "电子邮箱": "email",
    "邮箱": "email",
    "姓名": "name",
    "性别": "gender",
    "民族": "ethnicity",
    "身高": "height",
    "体重": "weight",
    "期望岗位": "expectedRole",
    "期望职位": "expectedRole",
    "期望城市": "expectedCity",
    "期望行业": "targetIndustry"
  };

  const PARENT_LABELS = {
    "父亲姓名": "fatherName",
    "母亲姓名": "motherName",
    "父亲所在单位及职务": "fatherWork",
    "母亲所在单位及职务": "motherWork",
    "父亲电话": "fatherPhone",
    "母亲电话": "motherPhone"
  };

  const FAMILY_LABELS = {
    "工作单位/就读院校": "company",
    "工作单位": "company",
    "就读院校": "company",
    "关系": "relation",
    "姓名": "name",
    "电话": "phone",
    "职务": "position",
    "政治面貌": "politics"
  };

  function normalizeLine(value) {
    return String(value ?? "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeHeading(value) {
    return normalizeLine(value)
      .replace(/^[#【\[（(\s]+/, "")
      .replace(/[】\]）)\s:：]+$/, "");
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function healSpacedDateTokens(value) {
    return String(value || "").replace(/(\d)\s+(?=\d)/g, "$1");
  }

  function parseDateRange(value) {
    const match = healSpacedDateTokens(value).match(
      /((?:19|20)\d{2})\s*[./年-]\s*(\d{1,2})\s*月?\s*(?:-|—|–|~|～|至|到)\s*(?:(至今|现在|今)|((?:19|20)\d{2})\s*[./年-]\s*(\d{1,2})\s*月?)/i
    );
    if (!match) return null;
    const month = (year, value) => `${year}-${String(value).padStart(2, "0")}`;
    return {
      source: match[0],
      start: month(match[1], match[2]),
      end: match[3] ? "至今" : month(match[4], match[5])
    };
  }

  function parseSingleMonth(value) {
    const match = healSpacedDateTokens(value).match(/(?:^|[^\d])((?:19|20)\d{2})\s*[./年-]\s*(\d{1,2})\s*月?(?!\d)/);
    return match ? `${match[1]}-${String(match[2]).padStart(2, "0")}` : "";
  }

  function splitSections(lines) {
    const sections = { preamble: [] };
    let current = "preamble";
    for (const line of lines) {
      const key = SECTION_ALIASES[normalizeHeading(line)];
      if (key) {
        current = key;
        sections[current] ||= [];
        continue;
      }
      if (/^(附件|生活照片|自定义简历)$/.test(normalizeHeading(line))) break;
      sections[current] ||= [];
      sections[current].push(line);
    }
    return sections;
  }

  function extractLabelPairs(lines, labels) {
    const result = {};
    const aliases = Object.keys(labels).sort((a, b) => b.length - a.length);
    const pattern = new RegExp(`(${aliases.map(escapeRegExp).join("|")})\\s*[：:]\\s*`, "g");
    for (const line of lines || []) {
      const matches = [...String(line).matchAll(pattern)];
      for (let index = 0; index < matches.length; index += 1) {
        const match = matches[index];
        const start = match.index + match[0].length;
        const end = matches[index + 1]?.index ?? line.length;
        const value = normalizeLine(line.slice(start, end).replace(/[|｜]+$/g, ""));
        const key = labels[match[1]];
        if (value && key && !result[key]) result[key] = value;
      }
    }

    const exactLabels = new Map(aliases.map(alias => [normalizeHeading(alias), labels[alias]]));
    for (let index = 0; index < (lines || []).length - 1; index += 1) {
      const key = exactLabels.get(normalizeHeading(lines[index]));
      if (!key || result[key]) continue;
      const next = normalizeLine(lines[index + 1]);
      if (!next || SECTION_ALIASES[normalizeHeading(next)] || exactLabels.has(normalizeHeading(next))) continue;
      result[key] = next;
    }
    return result;
  }

  function firstMatch(lines, pattern) {
    for (const line of lines || []) {
      const match = String(line).match(pattern);
      if (match) return match;
    }
    return null;
  }

  function parseHeaderPersonal(preamble, personal, hints) {
    const header = (preamble || []).slice(0, 18);
    if (!personal.name) {
      personal.name = header.find(line => /^[\u3400-\u9fff·]{2,4}$/.test(line)) || "";
    }
    if (!personal.email) {
      personal.email = firstMatch(header, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
    }
    if (!personal.phone) {
      personal.phone = firstMatch(header, /(?<!\d)1[3-9]\d{9}(?!\d)/)?.[0] || "";
    }

    // Some résumé exports show a third contact item in the header without a text label.
    // Treat it as a reviewable WeChat candidate only when both phone and email are present.
    if (!personal.wechat && personal.phone && personal.email) {
      let candidate = "";
      for (const line of header) {
        if (!line.includes(personal.phone) || !line.includes(personal.email)) continue;
        const residual = line.replace(personal.phone, " ").replace(personal.email, " ");
        candidate = residual.split(/\s+/).map(item => item.trim()).find(item => /^[A-Za-z][A-Za-z0-9_.-]{2,31}$/.test(item)) || "";
        if (candidate) break;
      }
      if (!candidate) {
        const emailLine = header.findIndex(line => line.includes(personal.email));
        for (let index = emailLine + 1; emailLine >= 0 && index < Math.min(header.length, emailLine + 3); index += 1) {
          const value = normalizeLine(header[index]);
          if (/^[A-Za-z][A-Za-z0-9_.-]{2,31}$/.test(value)) {
            candidate = value;
            break;
          }
          if (/^(男|女|\d+岁|现居|硕士|本科|博士)/.test(value)) break;
        }
      }
      if (candidate) {
        personal.wechat = candidate;
        hints.wechat = "根据页眉联系方式顺序推断，导入前请核对";
      }
    }
  }

  function parseIntent(lines, personal) {
    const pairs = extractLabelPairs(lines, BASIC_LABELS);
    Object.entries(pairs).forEach(([key, value]) => {
      if (!personal[key]) personal[key] = value;
    });
    const tokens = (lines || []).flatMap(line => normalizeLine(line).split(/\s+/)).filter(Boolean);
    if (tokens.length >= 4 && /^(不限职位|不限岗位|全职|实习|校招)$/.test(tokens[0]) && /\d+(?:\.\d+)?\s*(?:-|~|～)?\s*\d*(?:\.\d+)?\s*(?:K|k|万|元)/.test(tokens[1])) {
      if (!personal.expectedRole) personal.expectedRole = tokens[0];
      if (!personal.expectedCity) personal.expectedCity = tokens[2];
      if (!personal.targetIndustry) personal.targetIndustry = tokens[3];
    }
  }

  function parseEducation(lines) {
    const dateIndexes = (lines || []).map((line, index) => ({ index, range: parseDateRange(line) })).filter(item => item.range);
    const entries = [];
    for (let cursor = 0; cursor < dateIndexes.length; cursor += 1) {
      const { index, range } = dateIndexes[cursor];
      const nextIndex = dateIndexes[cursor + 1]?.index ?? lines.length;
      const line = lines[index];
      const inlineSchool = normalizeLine(line.replace(range.source, ""));
      const school = inlineSchool || normalizeLine(lines[index - 1] || "");
      const chunk = lines.slice(index + 1, nextIndex);
      const tokens = chunk.flatMap(item => normalizeLine(item).split(/\s+/)).filter(Boolean);
      const level = tokens.find(token => /^(博士研究生|博士|硕士研究生|硕士|研究生|本科|学士|大专|专科|高中|中专)$/.test(token)) || "";
      const type = tokens.filter(token => /^(统招|全日制|非全日制|自考|函授|成人教育|网络教育)$/.test(token)).join(" ");
      const explicitMajor = firstMatch(chunk, /(?:专业名称|所学专业|专业)\s*[：:]\s*([^\s，,；;]+)/)?.[1] || "";
      const major = explicitMajor || tokens.find(token =>
        token !== level && !/^(统招|全日制|非全日制|自考|函授|成人教育|网络教育|有学位证|无学位证|在校经历|专业分类|专业排名|是否有交换生经历|是否具有双学位|无补考)$/.test(token) &&
        !/^(GPA|成绩|是否|专业排名|专业分类)/.test(token) &&
        !/^\d+(?:\.\d+)?$/.test(token) &&
        !/^(19|20)\d{2}/.test(token)
      ) || "";
      const gpa = firstMatch(chunk, /(?:GPA|成绩(?:（GPA）|\(GPA\))?)\s*[：:]?\s*([0-9]+(?:\.[0-9]+)?)/i)?.[1] || "";
      const rank = firstMatch(chunk, /专业排名\s*[：:]?\s*([^\s，,；;]+)/)?.[1] || "";
      const college = firstMatch(chunk, /学院\s*[：:]\s*([^\s，,；;]+)/)?.[1] || "";
      if (!school && !level && !major) continue;
      entries.push({
        school,
        college,
        major,
        level,
        degree: level,
        type,
        start: range.start,
        end: range.end,
        current: range.end === "至今" ? "是" : "",
        gpa,
        rank,
        courses: "",
        research: "",
        thesis: "",
        mentor: ""
      });
    }
    return entries.filter((item, index, list) => index === 0 ||
      `${item.school}|${item.major}|${item.start}` !== `${list[index - 1].school}|${list[index - 1].major}|${list[index - 1].start}`);
  }

  function parseExperienceHeader(header) {
    const raw = normalizeLine(header).replace(/\s+(?:实习|全职|兼职|劳务派遣)$/, "");
    const tokens = raw.split(/\s+/).filter(Boolean);
    const companyIndex = tokens.findIndex(token => /(?:公司|集团|银行|证券|科技|跳动|海通|大学|研究中心|研究院|实验室|中心|学院|工作室|有限责任)/.test(token));
    const index = companyIndex >= 0 ? companyIndex : (tokens.length > 1 ? 1 : 0);
    const company = tokens[index] || "";
    const position = tokens.filter((_, tokenIndex) => tokenIndex !== index).join(" ");
    const type = /实习/.test(header) ? "实习" : (/兼职/.test(header) ? "兼职" : "全职");
    return { company, department: "", position, type };
  }

  function parseWork(lines) {
    const dateIndexes = (lines || []).map((line, index) => ({ index, range: parseDateRange(line) })).filter(item => item.range);
    const entries = [];
    for (let cursor = 0; cursor < dateIndexes.length; cursor += 1) {
      const { index, range } = dateIndexes[cursor];
      const nextIndex = dateIndexes[cursor + 1]?.index ?? lines.length;
      const line = lines[index];
      const inlineHeader = normalizeLine(line.replace(range.source, ""));
      const previousLine = normalizeLine(lines[index - 1] || "");
      const header = inlineHeader || previousLine;
      const parsedHeader = parseExperienceHeader(header);
      const chunk = lines.slice(index + 1, nextIndex);
      const metaLine = chunk.find(item => /(?:民营企业|上市公司|国有企业|国企|民企|非营利组织|外资|合资)/.test(item) || /[\u4e00-\u9fff]{2,}(?:市|省)(?:[-－][\u4e00-\u9fff]+)?/.test(item)) || "";
      const metaTokens = metaLine.split(/\s+/).filter(Boolean);
      const city = metaTokens.find(token => /[\u4e00-\u9fff]{2,}(?:市|省)(?:[-－][\u4e00-\u9fff]+)?/.test(token)) ||
        (metaLine.match(/[\u4e00-\u9fff]{2,}(?:市|省)(?:[-－][\u4e00-\u9fff]+)?/) || [""])[0];
      let department = "";
      const cityIndex = metaTokens.indexOf(city);
      if (cityIndex > 1) department = metaTokens.slice(1, cityIndex).join(" ");
      const contentIndex = chunk.findIndex(item => /^(工作内容|工作职责|职责)\s*[：:]?$/.test(item) || /^(工作内容|工作职责|职责)\s*[：:]/.test(item));
      const contentLine = contentIndex >= 0 ? chunk[contentIndex] : "";
      const inlineContent = normalizeLine(contentLine.replace(/^(工作内容|工作职责|职责)\s*[：:]\s*/, ""));
      let body = contentIndex >= 0
        ? [...(inlineContent ? [inlineContent] : []), ...chunk.slice(contentIndex + 1)]
        : chunk.filter(item => item !== metaLine);
      body = body.filter(item => !/^(所属行业|单位规模|企业性质|公司规模)\s*[：:]/.test(item));
      const description = body.join("\n").trim();
      const bullets = body.map(item => normalizeLine(item).replace(/^[•●▪◦·\-–—]+\s*/, "")).filter(Boolean);
      if (!parsedHeader.company && !parsedHeader.position && !description) continue;
      entries.push({
        ...parsedHeader,
        department,
        city,
        start: range.start,
        end: range.end,
        businessBackground: firstMatch(body, /^业务背景\s*[：:]\s*(.*)$/)?.[1] || "",
        bullets,
        description
      });
    }
    return entries;
  }

  function extractLabeledBlock(lines, label, stopLabels) {
    const index = lines.findIndex(line => new RegExp(`^${escapeRegExp(label)}\\s*[：:]?`).test(line));
    if (index < 0) return "";
    const first = normalizeLine(lines[index].replace(new RegExp(`^${escapeRegExp(label)}\\s*[：:]?\\s*`), ""));
    const rest = [];
    if (first) rest.push(first);
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (stopLabels.some(stop => new RegExp(`^${escapeRegExp(stop)}\\s*[：:]?`).test(lines[cursor]))) break;
      rest.push(lines[cursor]);
    }
    return rest.join("\n").trim();
  }

  function parseProjects(lines) {
    const dateIndexes = (lines || []).map((line, index) => ({ index, range: parseDateRange(line) })).filter(item => item.range);
    const entries = [];
    for (let cursor = 0; cursor < dateIndexes.length; cursor += 1) {
      const { index, range } = dateIndexes[cursor];
      const nextIndex = dateIndexes[cursor + 1]?.index ?? lines.length;
      const inlineName = normalizeLine(lines[index].replace(range.source, ""));
      const name = inlineName || normalizeLine(lines[index - 1] || "");
      const chunk = lines.slice(index + 1, nextIndex);
      const content = extractLabeledBlock(chunk, "项目介绍", ["项目职责", "本人职责", "项目成果"]);
      const duty = extractLabeledBlock(chunk, "项目职责", ["项目成果"] ) || extractLabeledBlock(chunk, "本人职责", ["项目成果"]);
      const result = extractLabeledBlock(chunk, "项目成果", []);
      const roleLine = chunk.find(item => /^(个人|全栈|产品|运营|研发|项目负责人|负责人|开发)/.test(item)) || "";
      const role = (duty.split("\n")[0] || roleLine).replace(/\s+\d+\s*[-~至]\s*\d+人$/, "").trim();
      const fallbackContent = chunk.filter(item => !/^(项目职责|本人职责|项目成果|项目介绍)\s*[：:]?$/.test(item)).join("\n").trim();
      if (!name && !content && !duty && !result && !fallbackContent) continue;
      entries.push({
        name,
        role,
        start: range.start,
        end: range.end,
        current: range.end === "至今" ? "是" : "",
        content: content || fallbackContent,
        duty,
        result,
        link: ""
      });
    }
    return entries;
  }

  function parseAwards(lines) {
    const entries = [];
    for (let index = 0; index < (lines || []).length; index += 1) {
      const date = parseSingleMonth(lines[index]);
      if (!date) continue;
      const metadata = lines[index];
      let name = normalizeLine(lines[index - 1] || "");
      if (/^(描述|学业奖励)$/.test(name)) name = normalizeLine(lines[index - 2] || "");
      const level = (metadata.match(/国家级|学校级|校级|省级|市级/) || [""])[0];
      const issuer = (metadata.match(/[\u4e00-\u9fffA-Za-z·]{2,}(?:大学|学院|学校|协会|委员会)/) || [""])[0];
      const nextDate = (lines || []).findIndex((line, nextIndex) => nextIndex > index && parseSingleMonth(line));
      const end = nextDate >= 0 ? nextDate : lines.length;
      const description = lines.slice(index + 1, end).filter(item => !/^(描述|学业奖励)$/.test(item)).join("\n").trim();
      if (name) entries.push({ name, date, level, issuer, description });
    }
    return entries;
  }

  function parseCertificates(lines) {
    const entries = [];
    for (let index = 0; index < (lines || []).length; index += 1) {
      if (!/获得时间\s*[：:]/.test(lines[index])) continue;
      const pairs = extractLabelPairs((lines || []).slice(index, index + 3), { "获得时间": "date", "取得时间": "date", "发证机构": "issuer", "颁发机构": "issuer", "发证单位": "issuer" });
      const name = normalizeLine(lines[index - 1] || "");
      if (name && (pairs.date || pairs.issuer)) entries.push({
        name,
        level: "",
        date: parseSingleMonth(pairs.date) || pairs.date || "",
        issuer: pairs.issuer || "",
        description: ""
      });
    }
    return entries;
  }

  function parseLanguages(lines) {
    return (lines || [])
      .filter(line => /英语|日语|法语|德语|韩语|西班牙语|俄语|普通话|粤语/.test(line))
      .map(languageLine => {
        const tokens = normalizeLine(languageLine).split(/\s+/);
        const language = tokens.find(token => /英语|日语|法语|德语|韩语|西班牙语|俄语|普通话|粤语/.test(token)) || "";
        const levels = tokens.filter(token => /^(精通|熟练|良好|一般|流利|母语)$/.test(token));
        const score = tokens.find(token => /\d+(?:\.\d+)?\s*(?:分|分数)$/.test(token)) || "";
        const exam = tokens.find(token => /^(N[1-5]|IELTS|TOEFL|CET-?\d|雅思|托福)/i.test(token)) || "";
        return {
          language,
          exam,
          score,
          proficiency: levels[0] || "",
          speaking: levels[0] || "",
          writing: levels[1] || levels[0] || ""
        };
      });
  }

  function splitOrganizationAndPosition(value) {
    const text = normalizeLine(value);
    const parts = text.split(/[-－—]/).map(item => item.trim()).filter(Boolean);
    if (parts.length >= 2) return { company: parts.slice(0, -1).join("-"), position: parts[parts.length - 1] };
    return { company: text, position: "" };
  }

  function parseFamily(parentsLines, familyLines) {
    const parents = extractLabelPairs(parentsLines, PARENT_LABELS);
    const entries = [];
    [
      { prefix: "father", relation: "父亲" },
      { prefix: "mother", relation: "母亲" }
    ].forEach(({ prefix, relation }) => {
      const name = parents[`${prefix}Name`] || "";
      const work = parents[`${prefix}Work`] || "";
      const phone = parents[`${prefix}Phone`] || "";
      if (!name && !work && !phone) return;
      const organization = splitOrganizationAndPosition(work);
      entries.push({ name, relation, phone, company: organization.company, position: organization.position, politics: "" });
    });
    const other = extractLabelPairs(familyLines, FAMILY_LABELS);
    if (Object.values(other).some(Boolean)) {
      entries.push({
        name: other.name || "",
        relation: other.relation || "",
        phone: other.phone || "",
        company: other.company || "",
        position: other.position || "",
        politics: other.politics || ""
      });
    }
    return entries;
  }

  function parseSummary(lines) {
    return (lines || [])
      .filter(line => !/^自我评价及报名理由\s*[：:]?$/.test(line) && !/^自我描述\s*[：:]?$/.test(line))
      .join("\n")
      .trim();
  }

  function parsePdfResumeText(text, fileName = "resume.pdf") {
    const lines = String(text || "")
      .replace(/\r/g, "")
      .split(/\n+/)
      .map(normalizeLine)
      .filter(Boolean);
    const sections = splitSections(lines);
    const hints = {};
    const personal = extractLabelPairs([
      ...(sections.preamble || []),
      ...(sections.basic || []),
      ...(sections.intent || [])
    ], BASIC_LABELS);
    parseHeaderPersonal(sections.preamble || [], personal, hints);
    parseIntent(sections.intent || [], personal);
    const education = parseEducation(sections.education || []);
    const internships = parseWork(sections.work || []);
    const projects = parseProjects(sections.projects || []);
    const awards = parseAwards(sections.awards || []);
    const languages = parseLanguages(sections.languages || []);
    const certificates = parseCertificates(sections.certificates || []);
    const family = parseFamily(sections.parents || [], sections.family || []);
    const summary = parseSummary(sections.summary || []);
    const stats = {
      personalFields: Object.values(personal).filter(Boolean).length,
      education: education.length,
      internships: internships.length,
      projects: projects.length,
      awards: awards.length,
      languages: languages.length,
      certificates: certificates.length,
      family: family.length,
      hasSummary: Boolean(summary)
    };
    stats.total = stats.personalFields + stats.education + stats.internships + stats.projects + stats.awards + stats.languages + stats.certificates + stats.family + (stats.hasSummary ? 1 : 0);
    return {
      versionName: String(fileName || "resume.pdf").replace(/\.[^.]+$/, ""),
      attachment: fileName,
      personal,
      fieldHints: hints,
      education,
      internships,
      projects,
      awards,
      languages,
      certificates,
      family,
      summary,
      parseSource: "pdf-local",
      stats
    };
  }

  root.parsePdfResumeText = parsePdfResumeText;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { parsePdfResumeText, parseDateRange, parseSingleMonth, extractLabelPairs, splitSections };
  }
})(typeof window !== "undefined" ? window : globalThis);
