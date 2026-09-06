/**
 * Parse labeled Chinese resume Markdown (e.g. Moka/SHEIN page exports)
 * where labels and values often sit on separate lines and dates are split.
 */
(function (root) {
  const LABEL_VALUE = {
    "姓名": "name",
    "手机号码": "phone",
    "手机号": "phone",
    "邮箱": "email",
    "电子邮箱": "email",
    "性别": "gender",
    "最高学历": "highestEducation",
    "所在地": "currentCity",
    "最近公司": "latestCompany",
    "证件号码": "identityNumber",
    "证件类型": "identityType",
    "出生日期": "birthDate",
    "出生日期 (年龄)": "birthDate",
    "当前薪资": "currentSalary",
    "期望薪资": "expectedSalary",
    "期望城市": "expectedCity",
    "期望岗位": "expectedRole",
    "工作经验": "workYears"
  };

  const SECTION_ALIASES = {
    "基础信息": "basic",
    "个人信息": "personal",
    "求职意向": "intent",
    "工作经历": "work",
    "教育背景": "education",
    "教育经历": "education",
    "实习经历": "internship",
    "实习经验": "internship",
    "项目经验": "project",
    "项目经历": "project",
    "语言能力": "language",
    "自我描述": "summary",
    "自我评价": "summary",
    "获奖经历": "award",
    "获奖情况": "award"
  };

  const NOISE = /^(返回|我的简历|投递记录|个人资料|京公网安备|京ICP|Title:|Source:|\*\*Title|\*\*Source)/i;

  function normalizeLine(line) {
    return String(line || "")
      .replace(/^#+\s*/, "")
      .replace(/^\*\*(.+)\*\*$/, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/^\\-\s*/, "-")
      .replace(/\s+/g, " ")
      .trim();
  }

  function linesOf(text) {
    return String(text || "")
      .replace(/\r/g, "")
      .split("\n")
      .map(normalizeLine)
      .map((line) => line.replace(/^[-•]\s+/, ""))
      .map((line) => (line === "–" || line === "—" || line === "\\-") ? "-" : line)
      .filter((line) => line && !NOISE.test(line) && line !== "---" && line !== "[]")
      .filter((line, index, arr) => {
        // Drop trailing TOC duplicates: section title that already appeared earlier
        if (SECTION_ALIASES[line]) {
          return arr.indexOf(line) === index;
        }
        return true;
      });
  }

  function isSection(line) {
    return Boolean(SECTION_ALIASES[line]);
  }

  function isPureLabel(line) {
    return Boolean(LABEL_VALUE[line]) ||
      /^(公司名称|职位名称|工作职责|学校名称|专业名称|学历|就读时间|起止时间|项目名称|职责|项目描述|项目中职责|语言类型|掌握程度|听说|读写|奖项名称|获奖时间|自我描述|身份证)$/.test(line);
  }

  function isDash(line) {
    return line === "-" || line === "—-" || line === "–" || line === "—";
  }

  function collapseSplitDates(lines) {
    const out = [];
    for (let i = 0; i < lines.length; i += 1) {
      const a = lines[i];
      const b = lines[i + 1];
      const c = lines[i + 2];
      const d = lines[i + 3];
      const e = lines[i + 4];
      const f = lines[i + 5];
      if (/^(19|20)\d{2}$/.test(a) && /^\d{1,2}$/.test(b || "") && isDash(c || "") &&
          /^(19|20)\d{2}$/.test(d || "") && /^\d{1,2}$/.test(e || "")) {
        let end = `${d}.${e}`;
        let skip = 5;
        if (f === "至今" || f === "现在") {
          end = "至今";
          skip = 6;
        }
        out.push(`${a}.${b}-${end}`);
        i += skip - 1;
        continue;
      }
      if (/^(19|20)\d{2}$/.test(a) && /^\d{1,2}$/.test(b || "") && isDash(c || "") &&
          (d === "至今" || d === "现在")) {
        out.push(`${a}.${b}-至今`);
        i += 3;
        continue;
      }
      if (out[out.length - 1] === "获奖时间" && /^(19|20)\d{2}$/.test(a) && /^\d{1,2}$/.test(b || "") && !isDash(c || "")) {
        out.push(`${a}-${String(b).padStart(2, "0")}`);
        i += 1;
        continue;
      }
      out.push(a);
    }
    return out;
  }

  function dateRange(line) {
    const match = String(line).match(
      /((?:19|20)\d{2})\s*[./年-]\s*(\d{1,2})\s*月?\s*(?:-|—|–|~|～|至|到)\s*(?:(至今|现在|今)|((?:19|20)\d{2})\s*[./年-]\s*(\d{1,2})\s*月?)/i
    );
    if (!match) return null;
    const pad = (y, m) => `${y}-${String(m).padStart(2, "0")}`;
    return {
      source: match[0],
      start: pad(match[1], match[2]),
      end: match[3] ? "至今" : pad(match[4], match[5])
    };
  }

  function splitSections(lines) {
    const sections = [];
    let current = { key: "preamble", lines: [] };
    for (const line of lines) {
      if (isSection(line)) {
        sections.push(current);
        current = { key: SECTION_ALIASES[line], lines: [] };
        continue;
      }
      current.lines.push(line);
    }
    sections.push(current);
    return sections;
  }

  function valueAfterLabel(lines, label) {
    const idx = lines.findIndex((line) => line === label);
    if (idx < 0) return "";
    for (let i = idx + 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (line === label) continue;
      if (isPureLabel(line) || isSection(line) || LABEL_VALUE[line]) break;
      if (isDash(line)) continue;
      return line;
    }
    return "";
  }

  function collectPairs(lines) {
    const personal = {};
    for (let i = 0; i < lines.length; i += 1) {
      const key = LABEL_VALUE[lines[i]];
      if (!key) continue;
      let value = "";
      for (let j = i + 1; j < lines.length; j += 1) {
        if (isPureLabel(lines[j]) || isSection(lines[j]) || LABEL_VALUE[lines[j]]) break;
        if (isDash(lines[j])) continue;
        value = lines[j];
        break;
      }
      if (value) personal[key] = value;
    }
    const idTypeIdx = lines.findIndex((line) => line === "证件号码");
    if (idTypeIdx >= 0 && lines[idTypeIdx + 1] === "身份证") {
      personal.identityType = personal.identityType || "身份证";
    }
    if (lines.includes("身份证")) personal.identityType = personal.identityType || "身份证";
    return personal;
  }

  function parseEducation(lines) {
    const entries = [];
    for (let i = 0; i < lines.length; i += 1) {
      let range = dateRange(lines[i]);
      let cursor = i;
      if (!range && lines[i] === "就读时间") {
        range = dateRange(lines[i + 1] || "");
        cursor = i + 1;
      }
      if (!range) continue;
      const chunk = lines.slice(cursor + 1, cursor + 24);
      const school = valueAfterLabel(chunk, "学校名称") ||
        chunk.find((line) => /大学|学院|学校/.test(line) && !isPureLabel(line)) || "";
      const major = valueAfterLabel(chunk, "专业名称") || "";
      const level = valueAfterLabel(chunk, "学历") || "";
      if (!school && !major && !level) continue;
      entries.push({
        school,
        major,
        level,
        degree: /硕士|博士|本科|学士/.test(level) ? level : "",
        start: range.start,
        end: range.end,
        current: range.end === "至今" ? "是" : ""
      });
    }
    return entries.filter((item, index, arr) => {
      const prev = arr[index - 1];
      if (!prev) return true;
      return !(prev.school === item.school && prev.start === item.start && prev.level === item.level);
    });
  }

  function parseExperienceBlocks(lines, kind) {
    const entries = [];
    for (let i = 0; i < lines.length; i += 1) {
      let range = dateRange(lines[i]);
      let startAt = i;
      if (!range && lines[i] === "起止时间") {
        range = dateRange(lines[i + 1] || "");
        startAt = i + 1;
      }
      if (!range) continue;
      let nextDate = lines.length;
      for (let j = startAt + 1; j < lines.length; j += 1) {
        if (dateRange(lines[j]) || (lines[j] === "起止时间" && dateRange(lines[j + 1] || ""))) {
          nextDate = j;
          break;
        }
      }
      const chunk = lines.slice(startAt + 1, nextDate);
      const company = valueAfterLabel(chunk, "公司名称");
      const position = valueAfterLabel(chunk, "职位名称");
      const dutyIdx = chunk.findIndex((line) => line === "工作职责" || line === "项目描述" || line === "职责");
      let dutyLines = dutyIdx >= 0 ? chunk.slice(dutyIdx + 1) : chunk.filter((line) => !isPureLabel(line));
      dutyLines = dutyLines.filter((line) => !isPureLabel(line) && line !== "项目中职责" && line !== "至今");
      const bullets = [];
      for (const line of dutyLines) {
        const parts = line.split(/\s*[•●▪◦]\s*/).map((part) => part.trim()).filter(Boolean);
        if (parts.length > 1) bullets.push(...parts);
        else if (line) bullets.push(line);
      }
      const description = bullets.map((item) => `• ${item.replace(/^[•●▪◦·\-–—]\s*/, "")}`).join("\n");
      if (kind === "project") {
        const name = valueAfterLabel(chunk, "项目名称") || (bullets[0] ? bullets[0].slice(0, 48) : "") || `项目 ${entries.length + 1}`;
        const role = valueAfterLabel(chunk, "职责") || valueAfterLabel(chunk, "项目中职责") || position || "";
        if (!description && !valueAfterLabel(chunk, "项目名称")) {
          i = nextDate - 1;
          continue;
        }
        entries.push({
          name,
          role,
          start: range.start,
          end: range.end,
          current: range.end === "至今" ? "是" : "",
          content: description,
          duty: role,
          result: "",
          link: ""
        });
      } else {
        if (!description && !company && !position) {
          i = nextDate - 1;
          continue;
        }
        entries.push({
          company: company || "",
          department: "",
          position: position || "",
          type: kind === "internship" ? "实习" : "全职",
          city: "",
          start: range.start,
          end: range.end,
          businessBackground: bullets.find((item) => /^业务背景/.test(item)) || "",
          bullets,
          description
        });
      }
      i = nextDate - 1;
    }
    return entries;
  }

  function parseAwards(lines) {
    const awards = [];
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i] !== "获奖时间" && !/^(19|20)\d{2}-\d{2}$/.test(lines[i])) continue;
      let date = "";
      if (lines[i] === "获奖时间") {
        date = lines[i + 1] || "";
        i += 1;
      } else date = lines[i];
      let name = "";
      for (let j = i + 1; j < lines.length; j += 1) {
        if (lines[j] === "获奖时间" || /^(19|20)\d{2}-\d{2}$/.test(lines[j]) || isSection(lines[j])) break;
        if (lines[j] === "奖项名称") continue;
        if (!isPureLabel(lines[j])) { name = lines[j]; break; }
      }
      if (date || name) awards.push({ name: name || "", date, level: "", issuer: "", description: "" });
    }
    return awards;
  }

  function parseLanguages(lines) {
    const proficiency = lines.find((line) => /^(精通|熟练|良好|一般)$/.test(line)) ||
      lines.find((line) => /精通|熟练|良好|一般/.test(line)) || "";
    const language = lines.find((line) => /英语|日语|法语|普通话|中文|German|English/i.test(line)) || "英语";
    const speaking = valueAfterLabel(lines, "听说") || proficiency;
    const writing = valueAfterLabel(lines, "读写") || proficiency;
    if (!proficiency && !speaking && !writing) return [];
    return [{ language, exam: "", score: "", proficiency: proficiency || speaking || writing, speaking, writing }];
  }

  function parseSummary(lines) {
    return lines.filter((line) => !isPureLabel(line)).join("\n").trim();
  }

  function guessName(preamble, personal) {
    if (personal.name) return personal.name;
    return preamble.find((line) => /^[\u3400-\u9fff·]{2,4}$/.test(line) && !isSection(line) && !isPureLabel(line)) || "";
  }

  function parseLabeledResumeMarkdown(text, fileName = "resume.md") {
    const collapsed = collapseSplitDates(linesOf(text));
    const sections = splitSections(collapsed);
    const byKey = {};
    for (const section of sections) {
      const prev = byKey[section.key];
      if (!prev || section.lines.length > prev.length) byKey[section.key] = section.lines;
    }
    const personal = {
      ...collectPairs(byKey.basic || []),
      ...collectPairs(byKey.personal || []),
      ...collectPairs(byKey.intent || [])
    };
    personal.name = guessName(byKey.preamble || [], personal);
    const education = parseEducation(byKey.education || []);
    const internships = parseExperienceBlocks(byKey.internship || [], "internship");
    const work = parseExperienceBlocks(byKey.work || [], "work");
    const projects = parseExperienceBlocks(byKey.project || [], "project");
    const awards = parseAwards(byKey.award || []);
    const languages = parseLanguages(byKey.language || []);
    const summary = parseSummary(byKey.summary || []);
    const experiences = [...internships, ...work];
    return {
      versionName: String(fileName || "resume").replace(/\.[^.]+$/, ""),
      attachment: fileName,
      personal,
      education,
      internships: experiences,
      projects,
      awards,
      languages,
      summary,
      parseSource: "labeled-md",
      stats: {
        personalFields: Object.values(personal).filter(Boolean).length,
        education: education.length,
        internships: experiences.length,
        projects: projects.length,
        awards: awards.length,
        languages: languages.length,
        hasSummary: Boolean(summary)
      }
    };
  }

  root.parseLabeledResumeMarkdown = parseLabeledResumeMarkdown;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { parseLabeledResumeMarkdown, linesOf, collapseSplitDates };
  }
})(typeof window !== "undefined" ? window : globalThis);
