from fastapi import APIRouter

from .endpoints import (
    pdf_merge,
    pdf_split,
    pdf_extract,
    pdf_remove,
    pdf_reorder,
    pdf_sign,
    pdf_compress,
    pdf_convert,
    pdf_utils
)

api_router = APIRouter()

# Regrouper les fonctionnalités PDF
api_router.include_router(pdf_merge.router, tags=["pdf"])
api_router.include_router(pdf_split.router, tags=["PDF"])
api_router.include_router(pdf_extract.router, tags=["PDF"])
api_router.include_router(pdf_remove.router, tags=["PDF"])
api_router.include_router(pdf_reorder.router, tags=["PDF"])
api_router.include_router(pdf_sign.router, tags=["PDF"])
api_router.include_router(pdf_compress.router, tags=["PDF"])
api_router.include_router(pdf_convert.router, tags=["PDF"])
api_router.include_router(pdf_utils.router, tags=["PDF"]) 