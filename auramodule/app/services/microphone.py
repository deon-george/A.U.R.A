
import asyncio
import logging
import numpy as np
import threading
import wave
import io
import time
import queue
from typing import Optional, Callable, List
from app.core.config import settings

logger = logging.getLogger(__name__)


try:
    import pyaudio
    PYAUDIO_AVAILABLE = True
except ImportError:
    PYAUDIO_AVAILABLE = False
    logger.warning("[MIC] PyAudio not available - microphone service will run in demo mode only")


try:
    from faster_whisper import WhisperModel
    FASTER_WHISPER_AVAILABLE = True
except ImportError:
    FASTER_WHISPER_AVAILABLE = False
    logger.warning("[MIC] faster-whisper not available - continuous transcription disabled")


#------This Class handles the Microphone Service----------
class MicrophoneService:

    
    RATE = 16000  
    CHANNELS = 1  
    CHUNK = 1024  
    FORMAT = None  
    SILENCE_THRESHOLD = 500  
    SILENCE_DURATION = 2.0  
    MAX_BUFFER_SIZE = 100  

    def __init__(self):
        self._audio = None
        self._stream = None
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._buffer: List[bytes] = []
        self._lock = threading.Lock()
        self._on_chunk: Optional[Callable[[bytes], None]] = None
        self._error_count = 0
        self._max_consecutive_errors = 10
        
        
        if PYAUDIO_AVAILABLE:
            self.FORMAT = pyaudio.paInt16

    def start(self, on_chunk: Optional[Callable[[bytes], None]] = None):
        if self._running:
            logger.warning("[MIC] Service already running")
            return

        self._on_chunk = on_chunk
        self._error_count = 0
        
        
        if settings.demo_mode or not PYAUDIO_AVAILABLE:
            mode = "demo mode" if settings.demo_mode else "pyaudio unavailable"
            logger.info(f"[MIC] Running in {mode} - simulating microphone")
            self._running = True
            self._thread = threading.Thread(target=self._demo_capture_loop, daemon=True)
            self._thread.start()
            return

        
        try:
            self._audio = pyaudio.PyAudio()
            self._stream = self._audio.open(
                format=self.FORMAT,
                channels=self.CHANNELS,
                rate=self.RATE,
                input=True,
                frames_per_buffer=self.CHUNK,
            )
            logger.info(
                f"[MIC] Audio stream opened: {self.RATE}Hz, "
                f"{self.CHANNELS} channel(s), {self.CHUNK} chunk size"
            )
        except OSError as e:
            logger.error(f"[MIC] Failed to open audio stream: {e}")
            self._cleanup_audio()
            return
        except Exception as e:
            logger.error(f"[MIC] Unexpected error opening audio: {type(e).__name__}: {e}")
            self._cleanup_audio()
            return

        self._running = True
        self._thread = threading.Thread(target=self._record_loop, daemon=True)
        self._thread.start()
        logger.info("[MIC] Capture thread started")

    def _cleanup_audio(self):
        if self._stream:
            try:
                if self._stream.is_active():
                    self._stream.stop_stream()
                self._stream.close()
            except Exception as e:
                logger.warning(f"[MIC] Error closing stream: {e}")
            self._stream = None

        if self._audio:
            try:
                self._audio.terminate()
            except Exception as e:
                logger.warning(f"[MIC] Error terminating audio: {e}")
            self._audio = None

    @property
    def is_running(self) -> bool:
        return self._running

    def _record_loop(self):
        logger.info("[MIC] Recording loop started")
        silence_start: Optional[float] = None
        active_frames: List[bytes] = []

        while self._running:
            try:
                data = self._stream.read(self.CHUNK, exception_on_overflow=False)
            except OSError as e:
                self._error_count += 1
                logger.warning(f"[MIC] Error reading audio stream: {e}")
                
                if self._error_count >= self._max_consecutive_errors:
                    logger.error(
                        f"[MIC] Too many consecutive errors ({self._error_count}), stopping"
                    )
                    break
                continue
            except Exception as e:
                self._error_count += 1
                logger.error(f"[MIC] Unexpected error reading audio: {type(e).__name__}: {e}")
                
                if self._error_count >= self._max_consecutive_errors:
                    break
                continue

            
            self._error_count = 0

            
            try:
                samples = np.frombuffer(data, dtype=np.int16)
                volume = np.abs(samples).mean()
            except Exception as e:
                logger.warning(f"[MIC] Error processing audio samples: {e}")
                continue

            if volume > self.SILENCE_THRESHOLD:
                silence_start = None
                active_frames.append(data)
            else:
                if active_frames:
                    if silence_start is None:
                        silence_start = time.time()
                    active_frames.append(data)

                    if time.time() - silence_start >= self.SILENCE_DURATION:
                        
                        try:
                            audio_bytes = self._frames_to_wav(active_frames)
                            self._handle_audio_chunk(audio_bytes)
                        except Exception as e:
                            logger.error(f"[MIC] Error processing audio chunk: {e}")
                        
                        active_frames = []
                        silence_start = None

        logger.info("[MIC] Recording loop ended")
        self._cleanup_audio()

    def _demo_capture_loop(self):
        logger.info("[MIC] Demo capture loop started")
        
        while self._running:
            
            
            time.sleep(1.0)

        logger.info("[MIC] Demo capture loop ended")

    def _handle_audio_chunk(self, audio_bytes: bytes):
        
        if self._on_chunk:
            try:
                self._on_chunk(audio_bytes)
            except Exception as e:
                logger.warning(f"[MIC] Error in audio callback: {e}")

        
        with self._lock:
            self._buffer.append(audio_bytes)
            if len(self._buffer) > self.MAX_BUFFER_SIZE:
                
                self._buffer.pop(0)
                logger.debug("[MIC] Buffer full, dropped oldest chunk")

    def _frames_to_wav(self, frames: List[bytes]) -> bytes:
        if not frames:
            return b""
            
        buf = io.BytesIO()
        try:
            with wave.open(buf, "wb") as wf:
                wf.setnchannels(self.CHANNELS)
                wf.setsampwidth(self._audio.get_sample_size(self.FORMAT))
                wf.setframerate(self.RATE)
                wf.writeframes(b"".join(frames))
        except Exception as e:
            logger.error(f"[MIC] Error creating WAV: {e}")
            return b""
        
        return buf.getvalue()

    def get_latest_chunk(self) -> Optional[bytes]:
        with self._lock:
            if self._buffer:
                return self._buffer.pop(0)
        return None

    def get_buffer_size(self) -> int:
        with self._lock:
            return len(self._buffer)

    def clear_buffer(self):
        with self._lock:
            self._buffer.clear()
        logger.debug("[MIC] Buffer cleared")

    def stop(self):
        logger.info("[MIC] Stopping microphone service...")
        self._running = False
        
        if self._thread:
            self._thread.join(timeout=3)
            if self._thread.is_alive():
                logger.warning("[MIC] Capture thread did not stop gracefully")
        
        self._cleanup_audio()
        self.clear_buffer()
        logger.info("[MIC] Microphone stopped")



mic_service = MicrophoneService()


class ContinuousMicrophone:
    
    
    RATE = 16000  
    CHANNELS = 1  
    CHUNK = 4096  
    FORMAT = None  
    
    
    SUMMARIZATION_INTERVAL = 600  
    MAX_TRANSCRIPT_LENGTH = 10000  
    
    def __init__(
        self,
        on_summarize: Optional[Callable[[List[str]], None]] = None,
        event_loop: Optional[asyncio.AbstractEventLoop] = None,
    ):
        self._audio = None
        self._stream = None
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._transcription_thread: Optional[threading.Thread] = None
        self._on_summarize = on_summarize
        self._event_loop = event_loop
        
        
        self._transcripts: List[str] = []
        self._transcripts_lock = threading.Lock()
        
        
        self._audio_buffer: List[bytes] = []
        self._audio_buffer_lock = threading.Lock()
        
        
        self._last_summarize_time = time.time()
        self._total_recorded_seconds = 0.0
        
        
        self._whisper_model = None
        self._whisper_loaded = False
        
        
        self._error_count = 0
        self._max_consecutive_errors = 10
        
        
        self._audio_queue: queue.Queue = queue.Queue()
        
        
        if PYAUDIO_AVAILABLE:
            self.FORMAT = pyaudio.paInt16
    
    def _load_whisper_model(self):
        if not FASTER_WHISPER_AVAILABLE:
            logger.warning("[CONTINUOUS_MIC] faster-whisper not available, transcription disabled")
            return
        
        if self._whisper_loaded:
            return
            
        try:
            logger.info(f"[CONTINUOUS_MIC] Loading faster-whisper model: {settings.whisper_model}")
            self._whisper_model = WhisperModel(
                settings.whisper_model,
                device="auto",  
                compute_type="float16",
            )
            self._whisper_loaded = True
            logger.info("[CONTINUOUS_MIC] Whisper model loaded successfully")
        except Exception as e:
            logger.error(f"[CONTINUOUS_MIC] Failed to load whisper model: {e}")
            self._whisper_loaded = False
    
    def start(self):
        if self._running:
            logger.warning("[CONTINUOUS_MIC] Service already running")
            return
        
        
        self._load_whisper_model()
        
        
        self._error_count = 0
        self._last_summarize_time = time.time()
        self._transcripts.clear()
        self._audio_buffer.clear()
        
        
        if settings.demo_mode or not PYAUDIO_AVAILABLE:
            mode = "demo mode" if settings.demo_mode else "pyaudio unavailable"
            logger.info(f"[CONTINUOUS_MIC] Running in {mode}")
            self._running = True
            self._thread = threading.Thread(target=self._demo_recording_loop, daemon=True)
            self._thread.start()
            return
        
        
        try:
            self._audio = pyaudio.PyAudio()
            self._stream = self._audio.open(
                format=self.FORMAT,
                channels=self.CHANNELS,
                rate=self.RATE,
                input=True,
                frames_per_buffer=self.CHUNK,
            )
            logger.info(
                f"[CONTINUOUS_MIC] Audio stream opened: {self.RATE}Hz, "
                f"{self.CHANNELS} channel(s), {self.CHUNK} chunk size"
            )
        except OSError as e:
            logger.error(f"[CONTINUOUS_MIC] Failed to open audio stream: {e}")
            self._cleanup_audio()
            return
        except Exception as e:
            logger.error(f"[CONTINUOUS_MIC] Unexpected error opening audio: {type(e).__name__}: {e}")
            self._cleanup_audio()
            return
        
        self._running = True
        
        
        self._thread = threading.Thread(target=self._recording_loop, daemon=True)
        self._thread.start()
        
        
        if self._whisper_loaded:
            self._transcription_thread = threading.Thread(
                target=self._transcription_loop, daemon=True
            )
            self._transcription_thread.start()
        
        logger.info("[CONTINUOUS_MIC] Continuous recording started")
    
    def _cleanup_audio(self):
        if self._stream:
            try:
                if self._stream.is_active():
                    self._stream.stop_stream()
                self._stream.close()
            except Exception as e:
                logger.warning(f"[CONTINUOUS_MIC] Error closing stream: {e}")
            self._stream = None
        
        if self._audio:
            try:
                self._audio.terminate()
            except Exception as e:
                logger.warning(f"[CONTINUOUS_MIC] Error terminating audio: {e}")
            self._audio = None
    
    @property
    def is_running(self) -> bool:
        return self._running
    
    def _recording_loop(self):
        logger.info("[CONTINUOUS_MIC] Recording loop started")
        chunk_duration = self.CHUNK / self.RATE  
        
        while self._running:
            try:
                data = self._stream.read(self.CHUNK, exception_on_overflow=False)
            except OSError as e:
                self._error_count += 1
                logger.warning(f"[CONTINUOUS_MIC] Error reading audio stream: {e}")
                
                if self._error_count >= self._max_consecutive_errors:
                    logger.error(
                        f"[CONTINUOUS_MIC] Too many consecutive errors ({self._error_count}), stopping"
                    )
                    break
                time.sleep(0.1)
                continue
            except Exception as e:
                self._error_count += 1
                logger.error(f"[CONTINUOUS_MIC] Unexpected error reading audio: {type(e).__name__}: {e}")
                
                if self._error_count >= self._max_consecutive_errors:
                    break
                continue
            
            
            self._error_count = 0
            
            
            with self._audio_buffer_lock:
                self._audio_buffer.append(data)
            
            
            if self._whisper_loaded:
                try:
                    self._audio_queue.put_nowait(data)
                except queue.Full:
                    logger.warning("[CONTINUOUS_MIC] Audio queue full, dropping chunk")
            
            
            self._total_recorded_seconds += chunk_duration
            
            
            current_time = time.time()
            if current_time - self._last_summarize_time >= self.SUMMARIZATION_INTERVAL:
                self._trigger_summarization()
        
        logger.info("[CONTINUOUS_MIC] Recording loop ended")
        self._cleanup_audio()
    
    def _demo_recording_loop(self):
        logger.info("[CONTINUOUS_MIC] Demo recording loop started")
        
        while self._running:
            time.sleep(1.0)
            
            
            current_time = time.time()
            if current_time - self._last_summarize_time >= self.SUMMARIZATION_INTERVAL:
                self._trigger_summarization()
        
        logger.info("[CONTINUOUS_MIC] Demo recording loop ended")
    
    def _transcription_loop(self):
        logger.info("[CONTINUOUS_MIC] Transcription loop started")
        
        
        segment_buffer: List[bytes] = []
        chunks_per_segment = 10
        
        while self._running:
            try:
                
                try:
                    data = self._audio_queue.get(timeout=1.0)
                    segment_buffer.append(data)
                except queue.Empty:
                    
                    if len(segment_buffer) < chunks_per_segment:
                        continue
                
                
                if len(segment_buffer) >= chunks_per_segment:
                    try:
                        pcm_bytes = b"".join(segment_buffer)
                        segment_buffer = []

                        audio_waveform = (
                            np.frombuffer(pcm_bytes, dtype=np.int16).astype(np.float32) / 32768.0
                        )
                        if audio_waveform.size == 0:
                            continue
                        
                        
                        segments, info = self._whisper_model.transcribe(
                            audio_waveform,
                            language="en",
                            beam_size=1,  
                            vad_filter=True,  
                        )
                        
                        
                        text_parts = []
                        for segment in segments:
                            text_parts.append(segment.text.strip())
                        
                        if text_parts:
                            transcript_text = " ".join(text_parts)
                            if transcript_text:
                                with self._transcripts_lock:
                                    self._transcripts.append(transcript_text)
                                    
                                    if len(self._transcripts) > 100:
                                        self._transcripts = self._transcripts[-50:]
                                    logger.debug(f"[CONTINUOUS_MIC] Transcribed: {transcript_text[:50]}...")
                    
                    except Exception as e:
                        logger.warning(f"[CONTINUOUS_MIC] Transcription error: {e}")
            
            except Exception as e:
                logger.error(f"[CONTINUOUS_MIC] Transcription loop error: {e}")
        
        logger.info("[CONTINUOUS_MIC] Transcription loop ended")
    
    def _trigger_summarization(self):
        logger.info("[CONTINUOUS_MIC] Triggering summarization...")
        
        with self._transcripts_lock:
            if not self._transcripts:
                logger.debug("[CONTINUOUS_MIC] No transcripts to summarize")
                self._last_summarize_time = time.time()
                return
            
            
            transcripts_to_summarize = self._transcripts.copy()
            self._transcripts.clear()
        
        
        with self._audio_buffer_lock:
            self._audio_buffer.clear()
        
        
        if self._on_summarize:
            try:
                callback_result = self._on_summarize(transcripts_to_summarize)
                if asyncio.iscoroutine(callback_result):
                    if self._event_loop and self._event_loop.is_running():
                        asyncio.run_coroutine_threadsafe(callback_result, self._event_loop)
                    else:
                        asyncio.run(callback_result)
            except Exception as e:
                logger.error(f"[CONTINUOUS_MIC] Summarization callback error: {e}")
        
        self._last_summarize_time = time.time()
        logger.info(f"[CONTINUOUS_MIC] Summarization triggered with {len(transcripts_to_summarize)} transcripts")
    
    def get_transcripts(self) -> List[str]:
        with self._transcripts_lock:
            return self._transcripts.copy()
    
    def get_stats(self) -> dict:
        with self._transcripts_lock:
            transcript_count = len(self._transcripts)
        
        return {
            "is_running": self._running,
            "total_recorded_seconds": self._total_recorded_seconds,
            "transcript_count": transcript_count,
            "whisper_loaded": self._whisper_loaded,
            "time_since_last_summary": time.time() - self._last_summarize_time,
        }
    
    def stop(self):
        logger.info("[CONTINUOUS_MIC] Stopping continuous microphone...")
        self._running = False
        
        if self._thread:
            self._thread.join(timeout=5)
            if self._thread.is_alive():
                logger.warning("[CONTINUOUS_MIC] Recording thread did not stop gracefully")
        
        if self._transcription_thread:
            self._transcription_thread.join(timeout=5)
            if self._transcription_thread.is_alive():
                logger.warning("[CONTINUOUS_MIC] Transcription thread did not stop gracefully")
        
        self._cleanup_audio()
        logger.info("[CONTINUOUS_MIC] Continuous microphone stopped")



continuous_mic = ContinuousMicrophone()
