"""FastAPI routes for the Somnia metric engine.

Provides endpoints for retrieving patient metrics and coach context.
"""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from somnia.integrations.apple_health.ingest import ingest_healthkit_payload
from somnia.integrations.health_connect.ingest import ingest_health_connect_payload
from somnia.metrics import (
    arousal_index,
    cbti_readiness_score,
    circadian_alignment_score,
    sleep_debt_index,
    sleep_efficiency_index,
)

router = APIRouter(prefix="/api/v1", tags=["metrics"])


# --- Request / Response Models ---


class SEIRequest(BaseModel):
    tst: int
    tib: int


class SDIRequest(BaseModel):
    history_14d: list[int]
    sleep_need: int = 480


class CASRequest(BaseModel):
    onsets_14d: list[float]
    wakes_14d: list[float]
    temp_nadir: float


class AIRequest(BaseModel):
    wake_episodes: list[dict]
    hrv_series: list[float]
    sleep_stages: dict


class CRSRequest(BaseModel):
    se: float
    hrv_trend: float
    ai: float
    isi_score: int


# --- Endpoints ---


@router.post("/metrics/sei")
def compute_sei(req: SEIRequest) -> dict:
    """Compute Sleep Efficiency Index."""
    return sleep_efficiency_index(req.tst, req.tib)


@router.post("/metrics/sdi")
def compute_sdi(req: SDIRequest) -> dict:
    """Compute Sleep Debt Index."""
    return {"sdi": sleep_debt_index(req.history_14d, req.sleep_need)}


@router.post("/metrics/cas")
def compute_cas(req: CASRequest) -> dict:
    """Compute Circadian Alignment Score."""
    return circadian_alignment_score(req.onsets_14d, req.wakes_14d, req.temp_nadir)


@router.post("/metrics/ai")
def compute_ai(req: AIRequest) -> dict:
    """Compute Arousal Index."""
    return arousal_index(req.wake_episodes, req.hrv_series, req.sleep_stages)


@router.post("/metrics/crs")
def compute_crs(req: CRSRequest) -> dict:
    """Compute CBT-I Readiness Score."""
    return cbti_readiness_score(req.se, req.hrv_trend, req.ai, req.isi_score)


class HealthKitSyncRequest(BaseModel):
    patient_id: str
    date: str
    sleep_samples: list[dict] = []
    hrv_samples: list[dict] = []
    hr_samples: list[dict] = []
    resting_hr: float = 0.0
    resp_rate: float = 0.0
    spo2_samples: list[dict] = []
    wrist_temp_delta: float | None = None


@router.post("/integrations/apple-health/sync")
def sync_apple_health(req: HealthKitSyncRequest) -> dict:
    """Receive and process Apple HealthKit data from the mobile app."""
    result = ingest_healthkit_payload(
        patient_id=req.patient_id,
        payload=req.model_dump(),
    )
    if result.get("status") == "no_sleep_data":
        raise HTTPException(status_code=422, detail="No sleep data in payload")
    return {"status": "ok", "date": result.get("date"), "source": "apple_health"}


class HealthConnectSyncRequest(BaseModel):
    patient_id: str
    date: str
    sleep_sessions: list[dict] = []
    hrv_samples: list[dict] = []
    hr_samples: list[dict] = []
    resting_hr: float = 0.0
    resp_rate: float = 0.0
    spo2_samples: list[dict] = []
    body_temp_delta: float | None = None


@router.post("/integrations/health-connect/sync")
def sync_health_connect(req: HealthConnectSyncRequest) -> dict:
    """Receive and process Google Health Connect data from the mobile app."""
    result = ingest_health_connect_payload(
        patient_id=req.patient_id,
        payload=req.model_dump(),
    )
    if result.get("status") == "no_sleep_data":
        raise HTTPException(status_code=422, detail="No sleep data in payload")
    return {"status": "ok", "date": result.get("date"), "source": "health_connect"}


@router.get("/health")
def health_check() -> dict:
    return {"status": "ok", "engine": "somnia-metrics-v1.0"}
