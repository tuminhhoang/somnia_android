"""Tests for OuraClient and webhook handler."""

from unittest.mock import MagicMock, patch

import pytest

from somnia.integrations.oura.client import OuraClient
from somnia.integrations.oura.webhooks import should_reingest


class TestOuraClientHelpers:
    def test_date_range_defaults(self):
        start, end = OuraClient._date_range(None, None)
        assert start  # not empty
        assert end  # not empty

    def test_date_range_explicit(self):
        start, end = OuraClient._date_range("2026-03-01", "2026-03-15")
        assert start == "2026-03-01"
        assert end == "2026-03-15"

    def test_datetime_range_defaults(self):
        start, end = OuraClient._datetime_range(None, None)
        assert start.endswith("Z") or "T" in start
        assert end.endswith("Z") or "T" in end


class TestOuraClientPagination:
    def test_single_page(self):
        client = OuraClient("fake-token")
        client._get = MagicMock(
            return_value={"data": [{"id": "1"}, {"id": "2"}], "next_token": None}
        )
        results = client._get_paginated("v2/test", {})
        assert len(results) == 2
        client.close()

    def test_multi_page(self):
        client = OuraClient("fake-token")
        client._get = MagicMock(
            side_effect=[
                {"data": [{"id": "1"}], "next_token": "cursor-abc"},
                {"data": [{"id": "2"}], "next_token": None},
            ]
        )
        results = client._get_paginated("v2/test", {})
        assert len(results) == 2
        assert client._get.call_count == 2
        client.close()

    def test_empty_response(self):
        client = OuraClient("fake-token")
        client._get = MagicMock(return_value={"data": [], "next_token": None})
        results = client._get_paginated("v2/test", {})
        assert results == []
        client.close()


class TestOuraClientEndpoints:
    """Verify endpoint methods call the correct API slugs."""

    def _mock_client(self) -> OuraClient:
        client = OuraClient("fake-token")
        client._get_paginated = MagicMock(return_value=[])
        client._get = MagicMock(return_value={})
        return client

    def test_get_sleep_periods(self):
        client = self._mock_client()
        client.get_sleep_periods("2026-03-18", "2026-03-18")
        client._get_paginated.assert_called_once()
        slug = client._get_paginated.call_args[0][0]
        assert slug == "v2/usercollection/sleep"

    def test_get_sleep_periods_by_id(self):
        client = self._mock_client()
        client.get_sleep_periods(document_id="doc-123")
        client._get.assert_called_once()
        slug = client._get.call_args[0][0]
        assert "doc-123" in slug

    def test_get_daily_readiness(self):
        client = self._mock_client()
        client.get_daily_readiness("2026-03-18", "2026-03-18")
        slug = client._get_paginated.call_args[0][0]
        assert slug == "v2/usercollection/daily_readiness"

    def test_get_daily_spo2(self):
        client = self._mock_client()
        client.get_daily_spo2("2026-03-18", "2026-03-18")
        slug = client._get_paginated.call_args[0][0]
        assert slug == "v2/usercollection/daily_spo2"

    def test_get_daily_stress(self):
        client = self._mock_client()
        client.get_daily_stress("2026-03-18", "2026-03-18")
        slug = client._get_paginated.call_args[0][0]
        assert slug == "v2/usercollection/daily_stress"

    def test_get_heart_rate(self):
        client = self._mock_client()
        client.get_heart_rate()
        slug = client._get_paginated.call_args[0][0]
        assert slug == "v2/usercollection/heartrate"

    def test_get_personal_info(self):
        client = self._mock_client()
        client.get_personal_info()
        slug = client._get.call_args[0][0]
        assert slug == "v2/usercollection/personal_info"

    def test_get_rest_mode_period(self):
        client = self._mock_client()
        client.get_rest_mode_period("2026-03-18", "2026-03-18")
        slug = client._get_paginated.call_args[0][0]
        assert slug == "v2/usercollection/rest_mode_period"


class TestWebhookHandler:
    def test_sleep_create_triggers_reingest(self):
        assert should_reingest({"event_type": "create", "data_type": "sleep"}) is True

    def test_readiness_update_triggers_reingest(self):
        assert should_reingest({"event_type": "update", "data_type": "daily_readiness"}) is True

    def test_delete_does_not_trigger(self):
        assert should_reingest({"event_type": "delete", "data_type": "sleep"}) is False

    def test_workout_does_not_trigger(self):
        assert should_reingest({"event_type": "create", "data_type": "workout"}) is False

    def test_spo2_triggers_reingest(self):
        assert should_reingest({"event_type": "create", "data_type": "daily_spo2"}) is True
