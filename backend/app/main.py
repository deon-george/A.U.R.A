import logging
import socket
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import asyncio
from typing import Optional
from app.core.config import settings
from app.core.firebase import init_firebase, _app as firebase_app
from app.core.database import connect_db, close_db, get_aura_modules_db, check_db_health
from app.routes import (
    auth,
    onboarding,
    medications,
    journal,
    relatives,
    sos,
    location,
    admin,
    ws,
    aura,
    user,
    notifications,
    suggestions,
    orito,
    reports,
    reminders,
    calls,
    aura_status,
)
from app.routes import settings as settings_router
from app.services.cleanup_task import cleanup_stale_modules


logging.basicConfig(
    level=logging.INFO if settings.environment == "production" else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

_cleanup_task = None


#------This Function handles the CLI arguments---------
def _get_cli_arg_value(flag: str) -> Optional[str]:
    for index, arg in enumerate(sys.argv):
        if arg == flag and index + 1 < len(sys.argv):
            return sys.argv[index + 1]
        if arg.startswith(f"{flag}="):
            return arg.split("=", 1)[1]
    return None


#------This Function resolves the runtime bind---------
def _resolve_runtime_bind() -> tuple[str, int]:
    host = _get_cli_arg_value("--host")
    port_value = _get_cli_arg_value("--port")
    launched_with_uvicorn = any("uvicorn" in arg for arg in sys.argv[:2])

    if host is None:
        host = "127.0.0.1" if launched_with_uvicorn else settings.server_host

    try:
        port = int(port_value) if port_value else settings.port
    except ValueError:
        port = settings.port

    return host, port


#------This Function gets the LAN IPv4---------
def _get_lan_ipv4() -> Optional[str]:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            ip = sock.getsockname()[0]
            if ip and not ip.startswith("127."):
                return ip
    except OSError:
        pass

    try:
        hostname_ip = socket.gethostbyname(socket.gethostname())
        if hostname_ip and not hostname_ip.startswith("127."):
            return hostname_ip
    except OSError:
        pass

    return None


#------This Function logs the access URLs---------
def _log_access_urls() -> None:
    bind_host, bind_port = _resolve_runtime_bind()
    lan_ip = _get_lan_ipv4()

    logger.info(f"Local API URL: http://127.0.0.1:{bind_port}")
    if lan_ip:
        logger.info(f"Network API URL: http://{lan_ip}:{bind_port}")
    else:
        logger.warning("Network API URL: could not determine LAN IP address")

    if bind_host in {"127.0.0.1", "localhost"}:
        logger.warning(
            "Server is bound to loopback only. Use: uvicorn app.main:app --reload --host 0.0.0.0 --port %s",
            bind_port,
        )


#------This Function handles the lifespan events---------
@asynccontextmanager
async def lifespan(app: FastAPI):
    global _cleanup_task

    
    logger.info(f"Starting {settings.environment} environment")
    
    try:
        init_firebase()
        logger.info("Firebase initialized")
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {str(e)}")
        raise

    try:
        await connect_db()
        logger.info("Database connected")
    except Exception as e:
        logger.error(f"Failed to connect to database: {str(e)}")
        raise

    
    try:
        aura_modules_db = get_aura_modules_db()
        _cleanup_task = asyncio.create_task(cleanup_stale_modules(aura_modules_db))
        logger.info("Background cleanup task started")
    except Exception as e:
        logger.warning(f"Could not start cleanup task: {str(e)}")

    _log_access_urls()

    yield

    
    logger.info("Shutting down application...")
    if _cleanup_task:
        _cleanup_task.cancel()
        try:
            await _cleanup_task
        except asyncio.CancelledError:
            pass

    await close_db()
    logger.info("Application shutdown complete")


app = FastAPI(
    title="Aura API",
    description="Assistive User Reminder App — Backend",
    version="1.0.0",
    lifespan=lifespan,
)



#------This Function handles validation errors---------
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error for {request.method} {request.url}: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Validation error",
            "errors": exc.errors(),
        },
    )


#------This Function handles value errors---------
@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    logger.warning(f"Value error for {request.method} {request.url}: {str(exc)}")
    return JSONResponse(
        status_code=400,
        content={"detail": str(exc)},
    )


#------This Function handles general exceptions---------
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unexpected error for {request.method} {request.url}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error" if settings.environment == "production" else str(exc)},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(user.router)
app.include_router(onboarding.router)
app.include_router(medications.router)
app.include_router(journal.router)
app.include_router(relatives.router)
app.include_router(sos.router)
app.include_router(location.router)
app.include_router(notifications.router)
app.include_router(settings_router.router)
app.include_router(suggestions.router)
app.include_router(admin.router)
app.include_router(ws.router)
app.include_router(aura.router)
app.include_router(orito.router)
app.include_router(reports.router)
app.include_router(reminders.router)
app.include_router(calls.router)
app.include_router(aura_status.router)


#------This Function returns health status---------
@app.get("/health")
async def health():
    return {"status": "alive", "service": "aura-backend", "environment": settings.environment}


#------This Function returns detailed health status---------
@app.get("/health/detailed")
async def health_detailed():
    db_health = await check_db_health()
    
    firebase_health = {"status": "healthy"}
    try:
        if firebase_app is None:
            firebase_health = {"status": "uninitialized"}
    except Exception as e:
        firebase_health = {"status": "unhealthy", "error": str(e)}
    
    aura_modules_health = {"total": 0, "online": 0, "offline": 0}
    try:
        aura_modules_db = get_aura_modules_db()
        all_modules = await aura_modules_db.list_modules(limit=1000)
        aura_modules_health = {
            "total": len(all_modules),
            "online": sum(1 for m in all_modules if m.get("status") == "online"),
            "offline": sum(1 for m in all_modules if m.get("status") != "online")
        }
    except Exception as e:
        aura_modules_health = {"error": str(e)}
    
    health_score = 100
    if db_health.get("status") != "healthy":
        health_score -= 40
    if firebase_health.get("status") not in ("healthy", "uninitialized"):
        health_score -= 30
    if aura_modules_health.get("total", 0) > 0 and aura_modules_health.get("online", 0) == 0:
        health_score -= 30
    
    health_score = max(0, health_score)
    
    return {
        "status": "alive",
        "service": "aura-backend",
        "environment": settings.environment,
        "database": db_health,
        "firebase": firebase_health,
        "aura_modules": aura_modules_health,
        "health_score": health_score
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.server_host,
        port=settings.port,
        reload=settings.environment != "production",
    )
