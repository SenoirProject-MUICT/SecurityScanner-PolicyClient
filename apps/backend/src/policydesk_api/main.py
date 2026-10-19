import logging
from uuid import uuid4

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.requests import Request
from fastapi.responses import JSONResponse

from policydesk_api.api.v1.router import api_router
from policydesk_api.core.config import get_settings

settings = get_settings()
logger = logging.getLogger("policydesk.api")

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Application API for Policy Desk workflows.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_request_errors(request: Request, call_next):
    request_id = uuid4().hex
    request.state.request_id = request_id
    try:
        response = await call_next(request)
    except Exception:
        logger.exception(
            "Unhandled request error request_id=%s method=%s path=%s",
            request_id,
            request.method,
            request.url.path,
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error.", "request_id": request_id},
            headers={"X-Request-ID": request_id},
        )

    if response.status_code >= 500:
        logger.error(
            "Request failed request_id=%s status=%s method=%s path=%s",
            request_id,
            response.status_code,
            request.method,
            request.url.path,
        )
    elif response.status_code >= 400:
        logger.warning(
            "Request rejected request_id=%s status=%s method=%s path=%s",
            request_id,
            response.status_code,
            request.method,
            request.url.path,
        )

    response.headers["X-Request-ID"] = request_id
    return response

app.include_router(api_router, prefix=settings.api_prefix)
