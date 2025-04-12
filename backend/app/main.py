import os
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time
import asyncio
from pathlib import Path

from .api.v1.api_router import api_router
from .core.config import settings
from .core.security import cleanup_old_files

# Créer l'application FastAPI
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# Configuration CORS pour permettre les requêtes du frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclure les routes de l'API
app.include_router(api_router, prefix=settings.API_V1_STR)


# Middleware pour mesurer le temps de traitement des requêtes
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response


# Point de terminaison racine
@app.get("/")
async def root():
    return {
        "message": "Bienvenue sur l'API PDF-Reader",
        "docs": f"{settings.API_V1_STR}/docs",
    }


# Tâche de nettoyage périodique des fichiers temporaires
@app.on_event("startup")
async def startup_event():
    # Nettoyer les anciens fichiers au démarrage
    cleanup_old_files(settings.TEMP_DIR)
    
    # Configurer la tâche de nettoyage périodique
    async def periodic_cleanup():
        while True:
            await asyncio.sleep(3600)  # Toutes les heures
            cleanup_old_files(settings.TEMP_DIR)
    
    # Lancer la tâche en arrière-plan
    asyncio.create_task(periodic_cleanup())


# Gestionnaire d'erreurs global
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": str(exc), "error_code": "internal_error"},
    ) 