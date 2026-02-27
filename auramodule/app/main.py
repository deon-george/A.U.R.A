
import asyncio
import logging
import signal
import sys
from dotenv import load_dotenv


load_dotenv()

from app.services.camera import camera_service
from app.services.discovery import discovery_service
from app.services.backend_client import init_backend_client, get_backend_client
from app.services.microphone import continuous_mic
from app.services.conversation import summarize_conversation
from app.ws_server import start_server, shutdown_streams, _get_local_ip
from app.core.config import settings


#------This Function handles the Logging Setup---------
def setup_logging():
    log_level = logging.DEBUG if settings.demo_mode else logging.INFO
    
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[
            logging.StreamHandler(sys.stdout),
        ],
    )
    
    
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("zeroconf").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)

#------This Function handles the Main Application----------
async def main():
    setup_logging()
    logger = logging.getLogger(__name__)
    
    print(f"\n{'=' * 60}")
    print(f"[AURA] 🚀 Starting Aura Module...")
    print(f"{'=' * 60}")
    print(f"[AURA] Patient UID: {settings.patient_uid[:8] + '...' if settings.patient_uid else 'NOT SET'}")
    print(f"[AURA] Server port: {settings.http_port}")
    print(f"[AURA] Camera index: {settings.camera_index}")
    print(f"[AURA] Whisper model: {settings.whisper_model}")
    print(f"[AURA] Ollama: {settings.ollama_url} ({settings.ollama_model})")
    print(f"[AURA] Backend: {settings.backend_url}")
    print(f"[AURA] Demo mode: {settings.demo_mode}")
    print(f"{'=' * 60}\n")

    if not settings.validate_required_settings():
        logger.error("[AURA] Configuration validation failed. Please check your .env file.")
        logger.error("[AURA] Required settings: PATIENT_UID, BACKEND_URL")
        sys.exit(1)

    
    logger.info("[AURA] 📦 Pre-loading machine learning models...")
    logger.info("[AURA] This may take a few minutes on first run (downloading models)...")
    print()

    try:
        from app.services.face_recognition import get_face_app

        logger.info("[AURA] Loading face recognition model (buffalo_l)...")
        get_face_app()
        logger.info("[AURA] ✓ Face recognition model ready\n")
    except Exception as e:
        logger.error(f"[AURA] Failed to load face recognition model: {e}")
        logger.error(
            "[AURA] Install optional face/audio deps with: "
            "python -m pip install -r requirements.optional.txt"
        )
        if settings.demo_mode:
            logger.warning("[AURA] Continuing in demo mode without face recognition")
        else:
            logger.warning("[AURA] Continuing with face recognition disabled")
            logger.warning(
                "[AURA] Set DEMO_MODE=true if you want full demo-mode behavior"
            )

    
    backend_client = init_backend_client(settings.patient_uid)

    local_ip = _get_local_ip()

    logger.info(f"[AURA] 🔗 Registering with backend at {settings.backend_url}...")
    registered = await backend_client.register(local_ip, settings.http_port)
    
    if not registered:
        logger.warning("[AURA] ⚠️  Failed to register with backend")
        logger.warning("[AURA] Module will continue running but some features may not work")
    else:
        await backend_client.start_heartbeat()
        logger.info(f"[AURA] ✓ Heartbeat task started (every {settings.heartbeat_interval}s)\n")

    camera_service.start()
    logger.info("[AURA] 📷 Camera started (always-on mode)")

    async def on_summarize(transcripts):
        logger.info(f"[AURA] 📝 Summarization triggered with {len(transcripts)} transcripts")
        try:
            summary = await summarize_conversation(
                transcripts=transcripts,
                patient_uid=settings.patient_uid,
            )
            if summary:
                logger.info(f"[AURA] ✓ Summary generated: {summary[:80]}...")
            else:
                logger.warning("[AURA] ⚠️  Failed to generate summary")
        except Exception as e:
            logger.error(f"[AURA] Error in summarization callback: {e}")
    
    from app.services.microphone import ContinuousMicrophone
    continuous_microphone = ContinuousMicrophone(
        on_summarize=on_summarize,
        event_loop=asyncio.get_running_loop(),
    )
    continuous_microphone.start()
    logger.info("[AURA] 🎤 Continuous microphone started (10-minute summarization)")

    discovery_service.start()
    logger.info("[AURA] 📡 mDNS discovery broadcasting")

    
    server_runner = await start_server()
    logger.info(f"[AURA] 🌐 Unified HTTP+WS server running on 0.0.0.0:{settings.http_port}")
    logger.info(
        f"[AURA] 📹 Video stream available at: http://{local_ip}:{settings.http_port}/video_feed\n"
    )

    
    stop = asyncio.Event()
    loop = asyncio.get_event_loop()
    
    def signal_handler():
        logger.info("[AURA] Shutdown signal received")
        stop.set()
    
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, signal_handler)

    print(f"{'=' * 60}")
    logger.info("[AURA] ✓ Module ready. Waiting for connections...")
    print(f"{'=' * 60}\n")
    
    await stop.wait()

    print("\n[AURA] 🛑 Shutting down...")

    await backend_client.stop_heartbeat()

    await shutdown_streams()

    camera_service.stop()

    continuous_microphone.stop()

    discovery_service.stop()

    await server_runner.cleanup()
    
    logger.info("[AURA] 👋 Goodbye.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[AURA] Interrupted by user")
    except Exception as e:
        logging.error(f"[AURA] Fatal error: {type(e).__name__}: {e}")
        sys.exit(1)
