from fastapi import APIRouter

from policydesk_api.api.v1.routes.auth import router as auth_router
from policydesk_api.api.v1.routes.github_integration import router as github_integration_router
from policydesk_api.api.v1.routes.health import router as health_router
from policydesk_api.api.v1.routes.labels import router as labels_router
from policydesk_api.api.v1.routes.policies import router as policies_router
from policydesk_api.api.v1.routes.repository_connections import (
    router as repository_connections_router,
)
from policydesk_api.api.v1.routes.review_requests import router as review_requests_router
from policydesk_api.api.v1.routes.workspace_members import router as workspace_members_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(policies_router)
api_router.include_router(labels_router)
api_router.include_router(workspace_members_router)
api_router.include_router(github_integration_router)
api_router.include_router(repository_connections_router)
api_router.include_router(review_requests_router)
