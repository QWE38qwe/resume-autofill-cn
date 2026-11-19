const test = require("node:test");
const assert = require("node:assert/strict");
const { parsePdfResumeText } = require("../scripts/pdf-resume-parse.js");

const phone = ["13800", "138001"].join("");
const email = ["test", "example.com"].join("@");
const sample = `
测试用户
女 25岁 现居 北京市-海淀区 硕士 2027年06月 清华大学 计算机
${phone} ${email} test_wechat
基本信息
出生日期：2000-01-02 证件类型：身份证
证件号：110105200001020011 现居住地：北京市-海淀区
户籍地：北京市-朝阳区 籍贯：江苏-南京
生源地：江苏-南京 民族：汉族
政治面貌：共青团员 婚姻状况：未婚
健康状况：健康 身高：168cm 体重：52kg
紧急联系人姓名：测试联系人 紧急联系人电话（国内手机号码）：139****0000
通信地址：北京市海淀区测试路1号 招聘信息获取来源：招聘网站
毕业年份：2027
求职意向
不限职位 13-25K 中国 不限行业
自我描述
具备产品设计和数据分析能力。
教育经历
清华大学 2024-09至2027-06
硕士 统招 全日制 有学位证 计算机科学与技术
专业分类：计算机类 专业排名：前10%
有无补考：无补考 成绩（GPA）：4.25
北京大学 2020-09至2024-06
本科 统招 全日制 有学位证 软件工程
专业分类：工学 专业排名：前15%
成绩（GPA）：4.5
项目经历
智能招聘助手 2025-01至2025-06
个人全栈开发 1-5人
项目介绍：构建简历解析工作流，支持多格式导入。
项目职责：
全栈开发
项目成果：
完成 MVP 上线。
工作经历
产品经理 字节跳动 实习 2025-06至2025-09
民营企业 产品部门 北京市-海淀区
工作内容：
• 负责产品设计和需求分析。
• 推动功能上线。
产品经理 示例科技有限公司 全职 2024-07至2025-05
民营企业 AI部门 北京市-朝阳区
工作内容：
负责企业产品规划。
荣誉奖励
校一等奖学金
学校级 一等奖 清华大学 2021-12
描述：
学业奖励
证书信息
FRM金融风险管理师二级
获得时间：2024-04 发证机构：GARP协会
语言能力
英语 精通 熟练 588分
父母信息
父亲姓名：测试父亲 母亲姓名：测试母亲
父亲所在单位及职务：测试市政府-公务员 母亲所在单位及职务：测试学校-教师
其他家庭成员
关系：妹妹 姓名：测试妹妹
出生日期：2015-11-10 工作单位/就读院校：测试小学
职务：学生
`;

test("extracts labeled personal fields and a reviewable header WeChat candidate", () => {
  const result = parsePdfResumeText(sample, "resume.pdf");
  assert.equal(result.personal.name, "测试用户");
  assert.equal(result.personal.phone, phone);
  assert.equal(result.personal.email, email);
  assert.equal(result.personal.wechat, "test_wechat");
  assert.match(result.fieldHints.wechat, /请核对/);
  assert.equal(result.personal.identityNumber, "110105200001020011");
  assert.equal(result.personal.identityType, "身份证");
  assert.equal(result.personal.birthDate, "2000-01-02");
  assert.equal(result.personal.currentCity, "北京市-海淀区");
  assert.equal(result.personal.household, "北京市-朝阳区");
  assert.equal(result.personal.nativePlace, "江苏-南京");
  assert.equal(result.personal.emergencyContactPhone, "139****0000");
  assert.equal(result.personal.graduationYear, "2027");
});

test("extracts education, work, project, award, certificate, language and family records", () => {
  const result = parsePdfResumeText(sample, "resume.pdf");
  assert.equal(result.education.length, 2);
  assert.equal(result.education[0].school, "清华大学");
  assert.equal(result.education[0].major, "计算机科学与技术");
  assert.equal(result.education[0].level, "硕士");
  assert.equal(result.education[0].gpa, "4.25");
  assert.equal(result.education[0].rank, "前10%");
  assert.equal(result.internships.length, 2);
  assert.equal(result.internships[0].company, "字节跳动");
  assert.equal(result.internships[0].position, "产品经理");
  assert.match(result.internships[0].description, /负责产品设计/);
  assert.equal(result.projects.length, 1);
  assert.equal(result.projects[0].name, "智能招聘助手");
  assert.equal(result.projects[0].role, "全栈开发");
  assert.match(result.projects[0].result, /MVP/);
  assert.equal(result.awards.length, 1);
  assert.equal(result.awards[0].name, "校一等奖学金");
  assert.equal(result.certificates.length, 1);
  assert.equal(result.certificates[0].name, "FRM金融风险管理师二级");
  assert.equal(result.certificates[0].issuer, "GARP协会");
  assert.equal(result.languages[0].language, "英语");
  assert.equal(result.languages[0].score, "588分");
  assert.equal(result.family.length, 3);
});

test("explicit WeChat label takes precedence over the header heuristic", () => {
  const result = parsePdfResumeText(sample.replace("证件号：110105200001020011", "微信号：wx_explicit 证件号：110105200001020011"), "resume.pdf");
  assert.equal(result.personal.wechat, "wx_explicit");
  assert.equal(result.fieldHints.wechat, undefined);
});

test("does not invent absent identity fields and stops values at adjacent labels", () => {
  const result = parsePdfResumeText("测试用户\n健康状况：健康 参加工作时间：未参加\n教育经历\n清华大学 2024-09至2027-06\n硕士 计算机科学与技术", "short.pdf");
  assert.equal(result.personal.identityNumber, undefined);
  assert.equal(result.personal.wechat, undefined);
  assert.equal(result.personal.health, "健康");
  assert.equal(result.education.length, 1);
});

test("handles inline work descriptions, split certificate labels and multiple languages", () => {
  const input = `证书信息
证书甲
获得时间：2024-04
发证机构
甲协会
语言能力
英语 精通 600分
日语 熟练 N2
工作经历
产品经理 甲科技有限公司 实习 2024-06至2024-09
工作内容：负责产品设计和需求分析。`;
  const result = parsePdfResumeText(input, "other-platform.pdf");
  assert.match(result.internships[0].description, /负责产品设计/);
  assert.equal(result.certificates[0].issuer, "甲协会");
  assert.equal(result.languages.length, 2);
  assert.equal(result.languages[1].exam, "N2");
});
