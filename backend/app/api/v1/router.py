from fastapi import APIRouter

from app.api.v1.endpoints.customers import router as customers_router
from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.vat import router as vat_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(vat_router)
api_router.include_router(customers_router)

