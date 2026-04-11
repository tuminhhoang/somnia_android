"""FastAPI application factory for the Somnia metric engine."""

from fastapi import FastAPI

from somnia.api.routes import router


def create_app() -> FastAPI:
    app = FastAPI(
        title="Somnia Metric Engine",
        version="1.0.0",
        description="Proprietary sleep metric computation for CBT-I digital therapeutics.",
    )
    app.include_router(router)
    return app


app = create_app()
