from types import SimpleNamespace

from job_email_assistant.feishu import BaseRecord
from job_email_assistant.progress_monitor import (
    AuthStore,
    CHROME_ONLY_CHANNEL_IDS,
    Channel,
    ChannelStatus,
    _xiaomi_job_progress,
    check_channel,
    record_visible_status,
    run_monitor,
    save_chrome_cookies,
)


class FakeFeishu:
    def __init__(self):
        self.settings = SimpleNamespace(
            feishu_cookie_status_field="Cookie状态",
            feishu_cookie_checked_at_field="Cookie最近检测",
            feishu_monitor_enabled_field="是否巡检",
            feishu_company_field="公司",
            feishu_parent_field="父记录",
            feishu_position_field="岗位",
            feishu_progress_field="进展",
            feishu_received_at_field="开始日期",
            feishu_subject_field="最新进展记录",
            feishu_note_field="note",
        )
        self.records = [
            BaseRecord("byte-parent", {"公司": "字节跳动", "是否巡检": "是"}),
            BaseRecord("shokz-parent", {"公司": "韶音科技", "是否巡检": ["是"]}),
        ]
        self.updates = []
        self.creates = []

    def list_records(self):
        return self.records

    def find_company_parents(self, company, records):
        return [
            record
            for record in records
            if record.fields.get("公司") == company and not record.fields.get("父记录")
        ]

    def update_record_fields(self, record, fields):
        self.updates.append((record.record_id, fields))

    def create_record_fields(self, fields):
        self.creates.append(fields)
        return f"created-{len(self.creates)}"


def test_monitor_writes_cookie_status_to_matching_parent(monkeypatch):
    feishu = FakeFeishu()
    channels = (
        Channel("bytedance", "字节跳动", "字节跳动", "", (), (), ()),
        Channel("shokz", "韶音科技", "韶音科技", "", (), (), ()),
    )
    statuses = [
        ChannelStatus("bytedance", "字节跳动", "字节跳动", "生效中", "投递页可读取"),
        ChannelStatus("shokz", "韶音科技", "韶音科技", "已过期", "招聘站跳转到登录页"),
    ]
    monkeypatch.setattr("job_email_assistant.progress_monitor.CHANNELS", channels)
    monkeypatch.setattr(
        "job_email_assistant.progress_monitor.check_channel",
        lambda channel, auth_store: next(
            status for status in statuses if status.channel_id == channel.channel_id
        ),
    )

    result = run_monitor(feishu)

    assert result["updated"] == 2
    assert [record_id for record_id, _ in feishu.updates] == ["byte-parent", "shokz-parent"]
    assert [fields["Cookie状态"] for _, fields in feishu.updates] == ["生效中", "已过期"]
    assert all(isinstance(fields["Cookie最近检测"], int) for _, fields in feishu.updates)
    assert [channel["applicationUrl"] for channel in result["channels"]] == ["", ""]


def test_monitor_skips_companies_not_enabled_in_feishu(monkeypatch):
    feishu = FakeFeishu()
    feishu.records[1] = BaseRecord("shokz-parent", {"公司": "韶音科技", "是否巡检": "否"})
    monkeypatch.setattr(
        "job_email_assistant.progress_monitor.check_channel",
        lambda channel, auth_store: ChannelStatus(
            channel.channel_id, channel.name, channel.company, "生效中", "投递页可读取"
        ),
    )

    result = run_monitor(feishu)

    assert [item["channel_id"] for item in result["channels"]] == ["bytedance"]
    assert [record_id for record_id, _ in feishu.updates] == ["byte-parent"]


def test_visible_status_writes_matching_company(monkeypatch):
    feishu = FakeFeishu()
    monkeypatch.setattr(
        "job_email_assistant.progress_monitor.CHANNELS",
        (Channel("bytedance", "字节跳动", "字节跳动", "https://example.com", (), (), ()),),
    )

    result = record_visible_status(feishu, "bytedance", "生效中", "当前 Chrome 投递页可读取")

    assert result["updated"] == 1
    assert feishu.updates[0][1]["Cookie状态"] == "生效中"


def test_monitor_syncs_shokz_job_progress_to_matching_child(monkeypatch):
    feishu = FakeFeishu()
    feishu.records = [
        BaseRecord("shokz-parent", {"公司": "韶音科技", "是否巡检": "是"}),
        BaseRecord(
            "gtm-child",
            {"公司": "韶音科技", "父记录": ["shokz-parent"], "岗位": "产品GTM培训生"},
        ),
        BaseRecord(
            "app-child",
            {"公司": "韶音科技", "父记录": ["shokz-parent"], "岗位": "APP产品经理"},
        ),
    ]
    channel = Channel("shokz", "韶音科技", "韶音科技", "", (), (), ())
    monkeypatch.setattr("job_email_assistant.progress_monitor.CHANNELS", (channel,))
    monkeypatch.setattr(
        "job_email_assistant.progress_monitor.check_channel",
        lambda *_: ChannelStatus(
            "shokz",
            "韶音科技",
            "韶音科技",
            "生效中",
            "投递页可读取",
            [
                {
                    "priority": "1",
                    "job": "27届提前批-产品GTM培训生",
                    "status": "已挂",
                    "source_status": "暂不匹配",
                },
                {
                    "priority": "2",
                    "job": "27届提前批-APP产品经理",
                    "status": "初筛",
                    "source_status": "初筛",
                },
            ],
        ),
    )

    result = run_monitor(feishu, "shokz")

    assert result["updated"] == 3
    assert ("gtm-child", {"进展": "已挂"}) in feishu.updates
    assert ("app-child", {"进展": "初筛"}) in feishu.updates


def test_monitor_skips_unchanged_shokz_job_progress(monkeypatch):
    feishu = FakeFeishu()
    feishu.records = [
        BaseRecord("shokz-parent", {"公司": "韶音科技", "是否巡检": "是"}),
        BaseRecord(
            "gtm-child",
            {
                "公司": "韶音科技",
                "父记录": ["shokz-parent"],
                "岗位": "产品GTM培训生",
                "进展": "已挂",
            },
        ),
    ]
    channel = Channel("shokz", "韶音科技", "韶音科技", "", (), (), ())
    monkeypatch.setattr("job_email_assistant.progress_monitor.CHANNELS", (channel,))
    monkeypatch.setattr(
        "job_email_assistant.progress_monitor.check_channel",
        lambda *_: ChannelStatus(
            "shokz",
            "韶音科技",
            "韶音科技",
            "生效中",
            "投递页可读取",
            [{
                "priority": "1",
                "job": "27届提前批-产品GTM培训生",
                "status": "已挂",
                "source_status": "暂不匹配",
            }],
        ),
    )

    result = run_monitor(feishu, "shokz")

    assert result["updated"] == 1
    assert len(feishu.updates) == 1
    assert feishu.updates[0][0] == "shokz-parent"


def test_save_chrome_cookies_converts_to_playwright_state(monkeypatch):
    saved = {}
    monkeypatch.setattr(
        "job_email_assistant.progress_monitor.AuthStore.save",
        lambda self, channel_id, state: saved.update(channel_id=channel_id, state=state),
    )

    result = save_chrome_cookies("xiaomi_feishu", [{
        "name": "session",
        "value": "opaque-session-value",
        "domain": ".mioffice.cn",
        "path": "/",
        "secure": True,
        "httpOnly": True,
        "sameSite": "lax",
    }])

    assert result["ok"] is True
    assert saved["channel_id"] == "xiaomi_feishu"
    assert saved["state"]["cookies"][0]["sameSite"] == "Lax"
    assert saved["state"]["origins"] == []


def test_save_chrome_cookies_persists_storage_origins(monkeypatch):
    saved = {}
    monkeypatch.setattr(
        "job_email_assistant.progress_monitor.AuthStore.save",
        lambda self, channel_id, state: saved.update(channel_id=channel_id, state=state),
    )

    result = save_chrome_cookies(
        "iflytek",
        [{
            "name": "sid",
            "value": "opaque",
            "domain": ".zhiye.com",
            "path": "/",
            "sameSite": "no_restriction",
        }],
        {
            "origin": "https://iflytek.zhiye.com",
            "localStorage": [{"name": "token", "value": "abc"}],
            "sessionStorage": [{"name": "token", "value": "dup-ignored"}, {"name": "sess", "value": "xyz"}],
        },
    )

    assert result["ok"] is True
    assert result["storageKeys"] == 2
    origins = saved["state"]["origins"]
    assert origins[0]["origin"] == "https://iflytek.zhiye.com"
    names = {item["name"]: item["value"] for item in origins[0]["localStorage"]}
    # localStorage 优先，重复的 sessionStorage token 被忽略，独有的 sess 保留。
    assert names == {"token": "abc", "sess": "xyz"}
    assert saved["state"]["cookies"][0]["sameSite"] == "None"


def test_chrome_only_channels_skip_headless_check():
    # 百度 / OPPO 无法无头还原登录态，check_channel 直接返回“需在Chrome核对”，
    # 且不触碰磁盘登录态（无需 auth_store）。
    assert "baidu" in CHROME_ONLY_CHANNEL_IDS
    assert "oppo" in CHROME_ONLY_CHANNEL_IDS
    channel = Channel("baidu", "百度", "百度", "https://talent.baidu.com/jobs/center", (), (), ())
    status = check_channel(channel, auth_store=None)
    assert status.status == "需在Chrome核对"


def test_monitor_does_not_overwrite_chrome_only_status(monkeypatch):
    # 无头巡检遇到 Chrome-only 渠道时不回写飞书，避免覆盖用户在 Chrome 核对出的状态。
    feishu = FakeFeishu()
    feishu.records = [
        BaseRecord("byte-parent", {"公司": "字节跳动", "是否巡检": "是"}),
        BaseRecord("baidu-parent", {"公司": "百度", "是否巡检": "是"}),
    ]
    channels = (
        Channel("bytedance", "字节跳动", "字节跳动", "", (), (), ()),
        Channel("baidu", "百度", "百度", "", (), (), ()),
    )
    monkeypatch.setattr("job_email_assistant.progress_monitor.CHANNELS", channels)
    monkeypatch.setattr(
        "job_email_assistant.progress_monitor.check_channel",
        lambda channel, auth_store: ChannelStatus(
            channel.channel_id, channel.name, channel.company,
            "需在Chrome核对" if channel.channel_id == "baidu" else "生效中", "",
        ),
    )

    result = run_monitor(feishu)

    # 只回写字节，百度状态保持不变（不写飞书），但仍在 channels 里可见。
    assert [record_id for record_id, _ in feishu.updates] == ["byte-parent"]
    assert {item["channel_id"] for item in result["channels"]} == {"bytedance", "baidu"}


class FakeCard:
    def __init__(self, text):
        self.text = text

    def inner_text(self):
        return self.text


class FakeCards:
    def __init__(self, texts):
        self.cards = [FakeCard(text) for text in texts]

    def count(self):
        return len(self.cards)

    def nth(self, index):
        return self.cards[index]


class FakePage:
    def __init__(self, card_texts):
        self.card_texts = card_texts

    def locator(self, selector):
        assert selector == "div.applicationListItem"
        return FakeCards(self.card_texts)


def test_xiaomi_parser_extracts_card_timeline():
    page = FakePage([
        "\n".join([
            "AI 策略产品实习生第 1 志愿",
            "官网投递",
            "北京校招 - 实习产品类",
            "意向城市：",
            "1",
            "北京",
            "投递简历",
            "2026-08-16",
            "评估中",
            "2026-08-17",
            "面试中",
            "2026-08-17",
        ])
    ])

    jobs = _xiaomi_job_progress(page)

    assert jobs == [{
        "priority": "1",
        "job": "AI 策略产品实习生",
        "status": "待面试",
        "source_status": "面试中",
        "latest_date": "2026-08-17",
        "started_at": 1786809600000,
        "city": "北京",
        "source": "官网投递",
        "project": "北京校招 - 实习产品类",
        "event_summary": "投递简历 2026-08-16 → 评估中 2026-08-17 → 面试中 2026-08-17",
    }]


def test_monitor_creates_xiaomi_children_and_updates_parent(monkeypatch):
    feishu = FakeFeishu()
    feishu.records = [
        BaseRecord(
            "xiaomi-parent",
            {"公司": "小米", "是否巡检": "是", "进展": ["已投递"]},
        )
    ]
    channel = Channel("xiaomi_feishu", "小米", "小米", "", (), (), ())
    monkeypatch.setattr("job_email_assistant.progress_monitor.CHANNELS", (channel,))
    monkeypatch.setattr(
        "job_email_assistant.progress_monitor.check_channel",
        lambda *_: ChannelStatus(
            "xiaomi_feishu",
            "小米",
            "小米",
            "生效中",
            "投递页可读取",
            [{
                "priority": "1",
                "job": "AI 策略产品实习生",
                "status": "待面试",
                "source_status": "面试中",
                "started_at": 1786809600000,
                "city": "北京",
                "source": "官网投递",
                "project": "北京校招 - 实习产品类",
                "event_summary": "投递简历 2026-08-16 → 评估中 2026-08-17 → 面试中 2026-08-17",
            }],
        ),
    )

    result = run_monitor(feishu, "xiaomi_feishu")

    assert result["updated"] == 3
    assert len(feishu.creates) == 1
    assert feishu.creates[0]["父记录"] == ["xiaomi-parent"]
    assert feishu.creates[0]["岗位"] == "AI 策略产品实习生"
    assert feishu.creates[0]["进展"] == "待面试"
    assert feishu.creates[0]["最新进展记录"].endswith("面试中 2026-08-17")
    assert ("xiaomi-parent", {"进展": "待面试"}) in feishu.updates
