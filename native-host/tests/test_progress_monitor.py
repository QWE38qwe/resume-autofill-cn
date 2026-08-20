from types import SimpleNamespace

from job_email_assistant.feishu import BaseRecord
from job_email_assistant.progress_monitor import (
    AuthStore,
    Channel,
    ChannelStatus,
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
        )
        self.records = [
            BaseRecord("byte-parent", {"公司": "字节跳动", "是否巡检": "是"}),
            BaseRecord("shokz-parent", {"公司": "韶音科技", "是否巡检": ["是"]}),
        ]
        self.updates = []

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
    assert ("gtm-child", {"进展": "已挂", "任务描述": "韶音科技 - 产品GTM培训生 - 已挂"}) in feishu.updates
    assert ("app-child", {"进展": "初筛", "任务描述": "韶音科技 - APP产品经理 - 初筛"}) in feishu.updates


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
                "任务描述": [{"text": "韶音科技 - 产品GTM培训生 - 已挂", "type": "text"}],
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
