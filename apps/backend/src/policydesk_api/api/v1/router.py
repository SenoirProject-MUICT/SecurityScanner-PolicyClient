from fastapi import APIRouter
from policydesk_api.api.v1.routes.auth import router as auth_router

from policydesk_api.api.v1.routes.health import router as health_router
from policydesk_api.api.v1.routes.labels import router as labels_router
from policydesk_api.api.v1.routes.policies import router as policies_router
from policydesk_api.api.v1.routes.workspace_members import router as workspace_members_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(policies_router)
api_router.include_router(labels_router)
api_router.include_router(workspace_members_router)
