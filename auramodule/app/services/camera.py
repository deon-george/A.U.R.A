
import cv2
import logging
import numpy as np
import threading
import time
import platform
from typing import Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)


#------This Class handles the Camera Service----------
class CameraService:

    DEFAULT_WIDTH = 640
    DEFAULT_HEIGHT = 480
    DEFAULT_FPS = 30
    FRAME_DELAY = 0.033  

    def __init__(self):
        self._cap: Optional[cv2.VideoCapture] = None
        self._frame: Optional[np.ndarray] = None
        self._lock = threading.Lock()
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._camera_info: Dict[str, Any] = {}
        self._frame_count = 0
        self._fps = 0.0
        self._last_fps_time = time.time()
        self._error_count = 0
        self._max_consecutive_errors = 10

    def start(self):
        if self._running:
            logger.warning("[CAMERA] Service already running")
            return

        
        if settings.demo_mode:
            logger.info("[CAMERA] Running in demo mode - using simulated camera")
            self._running = True
            self._thread = threading.Thread(target=self._demo_capture_loop, daemon=True)
            self._thread.start()
            self._camera_info = {
                "resolution": f"{self.DEFAULT_WIDTH}x{self.DEFAULT_HEIGHT}",
                "fps": self.DEFAULT_FPS,
                "backend": "demo",
                "format": "simulated",
                "index": -1,
            }
            return

        
        if not self._open_camera():
            logger.error(f"[CAMERA] Failed to open camera {settings.camera_index}")
            return

        
        self._detect_camera_capabilities()

        self._running = True
        self._thread = threading.Thread(target=self._capture_loop, daemon=True)
        self._thread.start()
        logger.info("[CAMERA] Capture thread started")

    def _open_camera(self) -> bool:
        camera_index = settings.camera_index
        
        
        backends_to_try = []
        
        if platform.system() == "Windows":
            
            backends_to_try = [
                (cv2.CAP_DSHOW, "DirectShow"),
                (cv2.CAP_MSMF, "Media Foundation"),
                (cv2.CAP_ANY, "Auto"),
            ]
        elif platform.system() == "Linux":
            backends_to_try = [
                (cv2.CAP_V4L2, "V4L2"),
                (cv2.CAP_ANY, "Auto"),
            ]
        else:
            backends_to_try = [(cv2.CAP_ANY, "Auto")]

        for backend, backend_name in backends_to_try:
            try:
                logger.info(f"[CAMERA] Trying {backend_name} backend for camera {camera_index}")
                self._cap = cv2.VideoCapture(camera_index, backend)
                
                if self._cap.isOpened():
                    logger.info(f"[CAMERA] Successfully opened camera with {backend_name}")
                    return True
                else:
                    logger.warning(f"[CAMERA] Failed to open with {backend_name}")
                    if self._cap:
                        self._cap.release()
                        
            except Exception as e:
                logger.warning(f"[CAMERA] Error with {backend_name}: {e}")
                if self._cap:
                    self._cap.release()
                    self._cap = None

        logger.error(f"[CAMERA] Failed to open camera {camera_index} with any backend")
        return False

    def _detect_camera_capabilities(self):
        if not self._cap or not self._cap.isOpened():
            return

        try:
            width = int(self._cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(self._cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = int(self._cap.get(cv2.CAP_PROP_FPS))
            backend = self._cap.getBackendName()
            fourcc = int(self._cap.get(cv2.CAP_PROP_FOURCC))
            fourcc_str = "".join([chr((fourcc >> 8 * i) & 0xFF) for i in range(4)])

            
            self._cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.DEFAULT_WIDTH)
            self._cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.DEFAULT_HEIGHT)
            
            
            actual_width = int(self._cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            actual_height = int(self._cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

            self._camera_info = {
                "resolution": f"{actual_width}x{actual_height}",
                "fps": fps if fps > 0 else self.DEFAULT_FPS,
                "backend": backend,
                "format": fourcc_str,
                "index": settings.camera_index,
            }

            logger.info("=" * 40)
            logger.info(f"[CAMERA] Camera Device: {settings.camera_index}")
            logger.info(f"[CAMERA] Resolution: {actual_width}x{actual_height}")
            logger.info(f"[CAMERA] Target FPS: {fps if fps > 0 else self.DEFAULT_FPS}")
            logger.info(f"[CAMERA] Backend: {backend}")
            logger.info(f"[CAMERA] Format: {fourcc_str}")

            
            if "Y16" in fourcc_str or "GRAY" in fourcc_str:
                logger.info("[CAMERA] IR/Depth camera detected (Windows Hello compatible)")
            else:
                logger.info("[CAMERA] Standard RGB camera")

            logger.info("=" * 40)
            
        except Exception as e:
            logger.warning(f"[CAMERA] Error detecting capabilities: {e}")
            self._camera_info = {
                "resolution": f"{self.DEFAULT_WIDTH}x{self.DEFAULT_HEIGHT}",
                "fps": self.DEFAULT_FPS,
                "backend": "unknown",
                "format": "unknown",
                "index": settings.camera_index,
            }

    def _capture_loop(self):
        logger.info("[CAMERA] Capture loop started")
        
        while self._running and self._cap is not None:
            try:
                ret, frame = self._cap.read()
                
                if not ret:
                    self._error_count += 1
                    if self._error_count >= self._max_consecutive_errors:
                        logger.error(
                            f"[CAMERA] Too many consecutive read errors ({self._error_count}), "
                            "stopping capture"
                        )
                        break
                    time.sleep(0.1)  
                    continue
                
                
                self._error_count = 0
                
                
                self._frame_count += 1
                current_time = time.time()
                if current_time - self._last_fps_time >= 1.0:
                    self._fps = self._frame_count / (current_time - self._last_fps_time)
                    self._frame_count = 0
                    self._last_fps_time = current_time

                
                if len(frame.shape) == 2:
                    frame = cv2.cvtColor(frame, cv2.COLOR_GRAY2BGR)
                elif frame.shape[2] == 1:
                    frame = cv2.cvtColor(frame, cv2.COLOR_GRAY2BGR)

                with self._lock:
                    self._frame = frame
                    
            except Exception as e:
                logger.error(f"[CAMERA] Capture error: {e}")
                self._error_count += 1
                if self._error_count >= self._max_consecutive_errors:
                    break
                    
            time.sleep(self.FRAME_DELAY)

        logger.info("[CAMERA] Capture loop ended")
        
        
        if self._cap:
            self._cap.release()
            self._cap = None

    def _demo_capture_loop(self):
        logger.info("[CAMERA] Demo capture loop started")
        
        
        while self._running:
            try:
                
                frame = np.zeros((self.DEFAULT_HEIGHT, self.DEFAULT_WIDTH, 3), dtype=np.uint8)
                
                
                cv2.rectangle(frame, (50, 50), (590, 430), (70, 70, 70), -1)
                cv2.putText(
                    frame,
                    "DEMO MODE",
                    (200, 200),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1.5,
                    (200, 200, 200),
                    2,
                )
                cv2.putText(
                    frame,
                    time.strftime("%H:%M:%S"),
                    (220, 280),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1,
                    (150, 150, 150),
                    2,
                )

                
                self._frame_count += 1
                current_time = time.time()
                if current_time - self._last_fps_time >= 1.0:
                    self._fps = self._frame_count / (current_time - self._last_fps_time)
                    self._frame_count = 0
                    self._last_fps_time = current_time

                with self._lock:
                    self._frame = frame

            except Exception as e:
                logger.error(f"[CAMERA] Demo capture error: {e}")

            time.sleep(self.FRAME_DELAY)

        logger.info("[CAMERA] Demo capture loop ended")

    def get_frame(self) -> Optional[np.ndarray]:
        with self._lock:
            if self._frame is not None:
                return self._frame.copy()
            return None

    def get_camera_info(self) -> Dict[str, Any]:
        return {
            **self._camera_info,
            "current_fps": round(self._fps, 1),
            "is_running": self._running,
            "demo_mode": settings.demo_mode,
            "error_count": self._error_count,
        }

    def stop(self):
        logger.info("[CAMERA] Stopping camera service...")
        self._running = False
        
        if self._thread:
            self._thread.join(timeout=3)
            if self._thread.is_alive():
                logger.warning("[CAMERA] Capture thread did not stop gracefully")
        
        if self._cap:
            self._cap.release()
            self._cap = None
            
        logger.info("[CAMERA] Camera stopped")

    @property
    def is_running(self) -> bool:
        return self._running



camera_service = CameraService()
