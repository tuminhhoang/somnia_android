"""Oura API v2 client.

Provides typed access to all Oura Ring endpoints used by Somnia,
with automatic cursor-based pagination.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

import requests


class OuraClient:
    """HTTP client for the Oura Ring API v2."""

    BASE_URL = "https://api.ouraring.com"

    def __init__(self, access_token: str) -> None:
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            }
        )

    def __enter__(self) -> "OuraClient":
        return self

    def __exit__(self, *_: Any) -> None:
        self.session.close()

    def close(self) -> None:
        self.session.close()

    # ---- Internal helpers ----

    def _get(self, slug: str, params: dict | None = None) -> dict:
        resp = self.session.get(f"{self.BASE_URL}/{slug}", params=params)
        resp.raise_for_status()
        return resp.json()

    def _get_paginated(self, slug: str, params: dict | None = None) -> list[dict]:
        """Handle Oura's cursor-based pagination automatically."""
        results: list[dict] = []
        next_token = None

        while True:
            p = params.copy() if params else {}
            if next_token:
                p["next_token"] = next_token

            data = self._get(slug, p)
            results.extend(data.get("data", []))

            next_token = data.get("next_token")
            if not next_token:
                break

        return results

    @staticmethod
    def _date_range(
        start_date: str | None, end_date: str | None
    ) -> tuple[str, str]:
        end = end_date or date.today().isoformat()
        start = start_date or (date.today() - timedelta(days=1)).isoformat()
        return start, end

    @staticmethod
    def _datetime_range(
        start_dt: str | None, end_dt: str | None
    ) -> tuple[str, str]:
        now = datetime.utcnow()
        end = end_dt or now.isoformat() + "Z"
        start = start_dt or (now - timedelta(days=1)).isoformat() + "Z"
        return start, end

    # ================================================================
    # Sleep Endpoints
    # ================================================================

    def get_sleep_periods(
        self,
        start_date: str | None = None,
        end_date: str | None = None,
        document_id: str | None = None,
    ) -> list[dict] | dict:
        """GET /v2/usercollection/sleep — per-sleep-period data.

        Returns HRV time-series, sleep stages, epochs, wake episodes.
        Filter by type == "long_sleep" for main overnight sleep.
        """
        start, end = self._date_range(start_date, end_date)
        if document_id:
            return self._get(f"v2/usercollection/sleep/{document_id}")
        return self._get_paginated(
            "v2/usercollection/sleep",
            {"start_date": start, "end_date": end},
        )

    def get_daily_sleep(
        self,
        start_date: str | None = None,
        end_date: str | None = None,
        document_id: str | None = None,
    ) -> list[dict] | dict:
        """GET /v2/usercollection/daily_sleep — daily sleep score + contributors."""
        start, end = self._date_range(start_date, end_date)
        if document_id:
            return self._get(f"v2/usercollection/daily_sleep/{document_id}")
        return self._get_paginated(
            "v2/usercollection/daily_sleep",
            {"start_date": start, "end_date": end},
        )

    def get_sleep_time(
        self,
        start_date: str | None = None,
        end_date: str | None = None,
        document_id: str | None = None,
    ) -> list[dict] | dict:
        """GET /v2/usercollection/sleep_time — Oura optimal bedtime recommendation."""
        start, end = self._date_range(start_date, end_date)
        if document_id:
            return self._get(f"v2/usercollection/sleep_time/{document_id}")
        return self._get_paginated(
            "v2/usercollection/sleep_time",
            {"start_date": start, "end_date": end},
        )

    # ================================================================
    # Daily Summary Endpoints
    # ================================================================

    def get_daily_readiness(
        self,
        start_date: str | None = None,
        end_date: str | None = None,
        document_id: str | None = None,
    ) -> list[dict] | dict:
        """GET /v2/usercollection/daily_readiness — skin temp delta + HRV balance."""
        start, end = self._date_range(start_date, end_date)
        if document_id:
            return self._get(f"v2/usercollection/daily_readiness/{document_id}")
        return self._get_paginated(
            "v2/usercollection/daily_readiness",
            {"start_date": start, "end_date": end},
        )

    def get_daily_spo2(
        self,
        start_date: str | None = None,
        end_date: str | None = None,
        document_id: str | None = None,
    ) -> list[dict] | dict:
        """GET /v2/usercollection/daily_spo2 — blood oxygen + breathing disturbance."""
        start, end = self._date_range(start_date, end_date)
        if document_id:
            return self._get(f"v2/usercollection/daily_spo2/{document_id}")
        return self._get_paginated(
            "v2/usercollection/daily_spo2",
            {"start_date": start, "end_date": end},
        )

    def get_daily_stress(
        self,
        start_date: str | None = None,
        end_date: str | None = None,
        document_id: str | None = None,
    ) -> list[dict] | dict:
        """GET /v2/usercollection/daily_stress — stress/recovery minutes."""
        start, end = self._date_range(start_date, end_date)
        if document_id:
            return self._get(f"v2/usercollection/daily_stress/{document_id}")
        return self._get_paginated(
            "v2/usercollection/daily_stress",
            {"start_date": start, "end_date": end},
        )

    def get_daily_activity(
        self,
        start_date: str | None = None,
        end_date: str | None = None,
        document_id: str | None = None,
    ) -> list[dict] | dict:
        """GET /v2/usercollection/daily_activity — steps, calories, exercise time."""
        start, end = self._date_range(start_date, end_date)
        if document_id:
            return self._get(f"v2/usercollection/daily_activity/{document_id}")
        return self._get_paginated(
            "v2/usercollection/daily_activity",
            {"start_date": start, "end_date": end},
        )

    def get_daily_resilience(
        self,
        start_date: str | None = None,
        end_date: str | None = None,
        document_id: str | None = None,
    ) -> list[dict] | dict:
        """GET /v2/usercollection/daily_resilience — stress resilience level."""
        start, end = self._date_range(start_date, end_date)
        if document_id:
            return self._get(f"v2/usercollection/daily_resilience/{document_id}")
        return self._get_paginated(
            "v2/usercollection/daily_resilience",
            {"start_date": start, "end_date": end},
        )

    def get_daily_cardiovascular_age(
        self,
        start_date: str | None = None,
        end_date: str | None = None,
        document_id: str | None = None,
    ) -> list[dict] | dict:
        """GET /v2/usercollection/daily_cardiovascular_age — vascular age estimate."""
        start, end = self._date_range(start_date, end_date)
        if document_id:
            return self._get(
                f"v2/usercollection/daily_cardiovascular_age/{document_id}"
            )
        return self._get_paginated(
            "v2/usercollection/daily_cardiovascular_age",
            {"start_date": start, "end_date": end},
        )

    # ================================================================
    # Time-Series Endpoints
    # ================================================================

    def get_heart_rate(
        self,
        start_datetime: str | None = None,
        end_datetime: str | None = None,
    ) -> list[dict]:
        """GET /v2/usercollection/heartrate — continuous HR at 5-min intervals."""
        start, end = self._datetime_range(start_datetime, end_datetime)
        return self._get_paginated(
            "v2/usercollection/heartrate",
            {"start_datetime": start, "end_datetime": end},
        )

    # ================================================================
    # Supporting Endpoints
    # ================================================================

    def get_personal_info(self) -> dict:
        """GET /v2/usercollection/personal_info — age, weight, height, sex."""
        return self._get("v2/usercollection/personal_info")

    def get_vo2_max(
        self,
        start_date: str | None = None,
        end_date: str | None = None,
        document_id: str | None = None,
    ) -> list[dict] | dict:
        """GET /v2/usercollection/vo2_max — aerobic capacity."""
        start, end = self._date_range(start_date, end_date)
        if document_id:
            return self._get(f"v2/usercollection/vo2_max/{document_id}")
        return self._get_paginated(
            "v2/usercollection/vo2_max",
            {"start_date": start, "end_date": end},
        )

    def get_workouts(
        self,
        start_date: str | None = None,
        end_date: str | None = None,
        document_id: str | None = None,
    ) -> list[dict] | dict:
        """GET /v2/usercollection/workout — workout sessions."""
        start, end = self._date_range(start_date, end_date)
        if document_id:
            return self._get(f"v2/usercollection/workout/{document_id}")
        return self._get_paginated(
            "v2/usercollection/workout",
            {"start_date": start, "end_date": end},
        )

    def get_rest_mode_period(
        self,
        start_date: str | None = None,
        end_date: str | None = None,
        document_id: str | None = None,
    ) -> list[dict] | dict:
        """GET /v2/usercollection/rest_mode_period — illness/recovery rest mode."""
        start, end = self._date_range(start_date, end_date)
        if document_id:
            return self._get(f"v2/usercollection/rest_mode_period/{document_id}")
        return self._get_paginated(
            "v2/usercollection/rest_mode_period",
            {"start_date": start, "end_date": end},
        )

    def get_sessions(
        self,
        start_date: str | None = None,
        end_date: str | None = None,
        document_id: str | None = None,
    ) -> list[dict] | dict:
        """GET /v2/usercollection/session — meditation, breathing, nap sessions."""
        start, end = self._date_range(start_date, end_date)
        if document_id:
            return self._get(f"v2/usercollection/session/{document_id}")
        return self._get_paginated(
            "v2/usercollection/session",
            {"start_date": start, "end_date": end},
        )
