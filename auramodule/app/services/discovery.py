
import socket
import threading
import logging
from typing import Optional
from zeroconf import Zeroconf, ServiceInfo
from app.core.config import settings

logger = logging.getLogger(__name__)


#------This Class handles the Discovery Service----------
class DiscoveryService:

    SERVICE_TYPE = "_aura._tcp.local."
    SERVICE_NAME = "AuraModule._aura._tcp.local."

    def __init__(self):
        self._zeroconf: Optional[Zeroconf] = None
        self._service_info: Optional[ServiceInfo] = None
        self._running = False
        self._lock = threading.Lock()
        self._registration_thread: Optional[threading.Thread] = None

    def start(self):
        with self._lock:
            if self._running:
                logger.warning("[DISCOVERY] Service already running")
                return
            self._running = True

        
        self._registration_thread = threading.Thread(
            target=self._register_service,
            daemon=True,
            name="DiscoveryService"
        )
        self._registration_thread.start()

    def _register_service(self):
        try:
            local_ip = _get_local_ip()
            hostname = socket.gethostname()

            properties = {
                b"service": b"AURA_MODULE",
                b"version": b"1.0.0",
                b"ws_port": str(settings.ws_port).encode(),
                b"http_port": str(settings.http_port).encode(),
                b"patient_uid": settings.patient_uid[:8].encode() if settings.patient_uid else b"unknown",
            }

            self._service_info = ServiceInfo(
                type_=self.SERVICE_TYPE,
                name=self.SERVICE_NAME,
                addresses=[socket.inet_aton(local_ip)],
                port=settings.http_port,
                properties=properties,
                server=f"{hostname}.local.",
            )

            self._zeroconf = Zeroconf()
            self._zeroconf.register_service(self._service_info)
            
            logger.info(
                f"[DISCOVERY] mDNS registered: {self.SERVICE_NAME} at {local_ip}:{settings.http_port}"
            )
            logger.info(f"[DISCOVERY] Service type: {self.SERVICE_TYPE}")
            logger.info(f"[DISCOVERY] Hostname: {hostname}.local.")
            
        except OSError as e:
            if "Address already in use" in str(e) or "address is already in use" in str(e).lower():
                logger.warning(
                    f"[DISCOVERY] mDNS service already registered by another instance"
                )
            else:
                logger.error(f"[DISCOVERY] OS error registering mDNS: {e}")
        except Exception as e:
            logger.error(f"[DISCOVERY] Failed to register mDNS: {type(e).__name__}: {e}")
            
            
            with self._lock:
                self._running = False

    def stop(self):
        with self._lock:
            if not self._running:
                return
            self._running = False

        try:
            if self._zeroconf and self._service_info:
                self._zeroconf.unregister_service(self._service_info)
                self._zeroconf.close()
                logger.info("[DISCOVERY] mDNS service unregistered")
        except Exception as e:
            logger.warning(f"[DISCOVERY] Error during shutdown: {e}")
        finally:
            self._zeroconf = None
            self._service_info = None

    def get_local_ip(self) -> str:
        return _get_local_ip()

    @property
    def is_running(self) -> bool:
        with self._lock:
            return self._running


def _get_local_ip() -> str:
    try:
        
        
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(2.0)  
        try:
            
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
        finally:
            s.close()
        
        if ip and ip != "0.0.0.0":
            return ip
            
    except socket.timeout:
        logger.warning("[DISCOVERY] Timeout determining local IP")
    except OSError as e:
        logger.warning(f"[DISCOVERY] OS error determining local IP: {e}")
    except Exception as e:
        logger.warning(f"[DISCOVERY] Error determining local IP: {e}")
    
    
    logger.warning("[DISCOVERY] Falling back to 127.0.0.1")
    return "127.0.0.1"



discovery_service = DiscoveryService()
