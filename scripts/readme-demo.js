(() => {
  const demoRequested = new URLSearchParams(location.search).get("demo") === "1";
  if (!demoRequested && globalThis.chrome?.runtime?.id) return;

  const profiles = [{
    id: "demo-profile",
    name: "产品岗位简历",
    target: "产品经理",
    summary: "关注用户问题、业务目标与可验证结果。",
    attachment: "product-resume.pdf",
    work: [
      {
        company: "星河科技",
        department: "智能产品部",
        position: "产品实习生",
        type: "实习",
        start: "2025-06",
        end: "2025-09",
        description: "参与需求分析、方案设计和上线复盘。"
      }
    ]
  }];

  const demoStore = {
    personal: {
      name: "示例用户",
      expectedRole: "产品经理",
      expectedCity: "上海",
      drivingLicense: "否"
    },
    education: [
      {
        school: "示例大学",
        college: "管理学院",
        major: "信息管理",
        level: "硕士",
        degree: "硕士",
        type: "全日制",
        start: "2024-09",
        end: "2027-06",
        gpa: "3.8"
      },
      {
        school: "示例大学",
        college: "计算机学院",
        major: "软件工程",
        level: "本科",
        degree: "学士",
        type: "全日制",
        start: "2020-09",
        end: "2024-06",
        gpa: "3.7"
      }
    ],
    profiles,
    activeProfileId: "demo-profile",
    projects: [],
    awards: [],
    languages: [{ language: "英语", exam: "CET-6", score: "560", proficiency: "熟练" }],
    skills: [{ name: "数据分析", level: "熟练", years: "2", description: "SQL 与可视化" }],
    certificates: [],
    family: [],
    papers: [],
    portfolio: [],
    hobbies: "阅读、设计",
    customFields: [],
    fillHistory: [
      {
        company: "星河科技",
        site: "jobs.example.com",
        url: "https://example.com/jobs/product",
        profile: "产品岗位简历",
        time: "2026/08/06 14:30:00",
        status: "已完成",
        note: "产品实习生",
        matched: ["姓名", "学校名称", "专业名称", "实习经历"],
        unmatched: [],
        skipped: ["已有手机号"]
      },
      {
        company: "远山智能",
        site: "career.example.com",
        url: "https://example.com/jobs/ai",
        profile: "产品岗位简历",
        time: "2026/08/05 10:20:00",
        status: "未完成",
        note: "待补充开放题",
        matched: ["姓名", "教育经历"],
        unmatched: ["自定义问题"],
        skipped: []
      }
    ],
    settings: {
      apiBase: "https://api.deepseek.com",
      model: "deepseek-chat",
      apiKey: "",
      apiConfigured: false,
      aiRules: []
    }
  };

  const selectStore = keys => {
    if (keys == null) return { ...demoStore };
    if (typeof keys === "string") return { [keys]: demoStore[keys] };
    if (Array.isArray(keys)) {
      return Object.fromEntries(keys.map(key => [key, demoStore[key]]));
    }
    return Object.fromEntries(
      Object.entries(keys).map(([key, fallback]) => [
        key,
        demoStore[key] === undefined ? fallback : demoStore[key]
      ])
    );
  };

  globalThis.chrome = {
    runtime: {
      id: "",
      getManifest: () => ({ version: "0.9.1" }),
      getURL: path => new URL(`../${path}`, location.href).href,
      sendMessage: async () => ({})
    },
    storage: {
      local: {
        get: async keys => selectStore(keys),
        set: async values => Object.assign(demoStore, values)
      },
      onChanged: { addListener: () => {} }
    },
    tabs: {
      query: async () => [{
        id: 1,
        url: "https://jobs.example.com/apply"
      }],
      sendMessage: async (_tabId, message) => {
        if (message.type === "SCAN_FORM") {
          return {
            count: 18,
            total: 22,
            aiMatched: 4,
            aiSource: "cache",
            aiError: ""
          };
        }
        return {
          profile: "产品岗位简历",
          mode: message.mode,
          items: [
            { label: "姓名：已填写", status: "已填写", state: "green" },
            { label: "教育经历 1：示例大学 / 信息管理", status: "已填写", state: "green" },
            { label: "实习经历 1：星河科技 / 产品实习生", status: "已填写", state: "green" },
            { label: "自定义问题：资料库暂无值", status: "未匹配", state: "yellow" }
          ]
        };
      }
    },
    scripting: {
      executeScript: async () => []
    },
    permissions: {
      request: async () => true
    }
  };

  if (new URLSearchParams(location.search).get("shot") === "dashboard") {
    document.documentElement.classList.add("readme-shot-dashboard");
    const style = document.createElement("style");
    style.textContent = `
      .readme-shot-dashboard .workspace { padding: 18px; }
      .readme-shot-dashboard .dashboard-surface { padding: 18px; }
      .readme-shot-dashboard .surface-head {
        align-items: center;
        flex-direction: row;
        margin-bottom: 12px;
      }
      .readme-shot-dashboard .filter-bar { display: none; }
      .readme-shot-dashboard .result-summary { margin-bottom: 4px; }
    `;
    document.head.appendChild(style);
  }
})();
