from types import SimpleNamespace

from job_email_assistant.feishu import BaseRecord
from job_email_assistant.progress_monitor import Channel, ChannelStatus, run_monitor


class FakeFeishu:
    def __init__(self):
        self.settings = SimpleNamespace(
            feishu_cookie_status_field="Cookie状态",
            feishu_cookie_checked_at_field="Cookie最近检测",
        )
        self.records = [
            BaseRecord("byte-parent", {"公司": "字节跳动"}),
            BaseRecord("shokz-parent", {"公司": "韶音科技"}),
        ]
        self.updates = []

    def list_records(self):
        return self.records

    def find_company_parents(self, company, records):
        return [record for record in records if record.fields.get("公司") == company]

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
