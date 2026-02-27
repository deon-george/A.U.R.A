
import logging
import tempfile
import os
import time
from typing import Optional, Tuple
from app.core.config import settings

logger = logging.getLogger(__name__)

_whisper_model = None
_model_load_error: Optional[str] = None


#------This Function returns the Whisper Model----------
def get_whisper_model():
    global _whisper_model, _model_load_error
    
    if _model_load_error:
        
        raise RuntimeError(f"Whisper model failed to load: {_model_load_error}")
    
    if _whisper_model is not None:
        return _whisper_model

    try:
        from faster_whisper import WhisperModel
        
        logger.info(f"[STT] Loading faster-whisper model: {settings.whisper_model}")
        start_time = time.time()
        
        
        device = "cuda"
        compute_type = "int8"
        
        
        try:
            import torch
            if not torch.cuda.is_available():
                logger.warning("[STT] CUDA not available, falling back to CPU")
                device = "cpu"
                compute_type = "int8"
            else:
                logger.info(f"[STT] CUDA available: {torch.cuda.get_device_name(0)}")
        except ImportError:
            logger.warning("[STT] PyTorch not available, assuming CPU mode")
            device = "cpu"
            compute_type = "int8"

        _whisper_model = WhisperModel(
            settings.whisper_model,
            device=device,
            compute_type=compute_type,
        )
        
        load_time = time.time() - start_time
        logger.info(
            f"[STT] Loaded faster-whisper model: {settings.whisper_model} "
            f"({device}, {compute_type}) in {load_time:.2f}s"
        )
        
        return _whisper_model
        
    except ImportError as e:
        _model_load_error = f"faster-whisper not installed: {e}"
        logger.error(f"[STT] {_model_load_error}")
        raise RuntimeError(_model_load_error)
        
    except Exception as e:
        _model_load_error = f"{type(e).__name__}: {e}"
        logger.error(f"[STT] Failed to load Whisper model: {_model_load_error}")
        raise RuntimeError(_model_load_error)


def validate_audio(audio_bytes: bytes) -> Tuple[bool, Optional[str]]:
    if audio_bytes is None:
        return False, "Audio bytes is None"
    
    if not isinstance(audio_bytes, bytes):
        return False, f"Expected bytes, got {type(audio_bytes).__name__}"
    
    if len(audio_bytes) == 0:
        return False, "Audio bytes is empty"
    
    
    if len(audio_bytes) < 1024:
        return False, f"Audio too small: {len(audio_bytes)} bytes"
    
    
    max_size = 50 * 1024 * 1024
    if len(audio_bytes) > max_size:
        return False, f"Audio too large: {len(audio_bytes)} bytes (max {max_size})"
    
    return True, None


async def transcribe_audio(audio_bytes: bytes) -> str:
    
    is_valid, error = validate_audio(audio_bytes)
    if not is_valid:
        logger.warning(f"[STT] Invalid audio: {error}")
        return ""

    
    try:
        model = get_whisper_model()
    except RuntimeError as e:
        logger.error(f"[STT] Model not available: {e}")
        return ""

    
    tmp_file: Optional[str] = None
    try:
        
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_file = tmp.name
        
        logger.debug(f"[STT] Transcribing audio ({len(audio_bytes)} bytes)...")
        start_time = time.time()
        
        
        segments, info = model.transcribe(
            tmp_file,
            language="en",
            beam_size=5,
            vad_filter=True,
            vad_parameters=dict(
                min_silence_duration_ms=500,
                speech_pad_ms=200,
            ),
        )

        
        transcript_parts = []
        for seg in segments:
            text = seg.text.strip()
            if text:
                transcript_parts.append(text)
        
        transcript = " ".join(transcript_parts)
        
        transcribe_time = time.time() - start_time
        logger.info(
            f"[STT] Transcribed {info.duration:.1f}s audio in {transcribe_time:.2f}s: "
            f"'{transcript[:50]}{'...' if len(transcript) > 50 else ''}'"
        )
        
        return transcript
        
    except FileNotFoundError as e:
        logger.error(f"[STT] Temp file error: {e}")
        return ""
        
    except Exception as e:
        logger.error(f"[STT] Transcription error: {type(e).__name__}: {e}")
        return ""
        
    finally:
        
        if tmp_file and os.path.exists(tmp_file):
            try:
                os.unlink(tmp_file)
            except Exception as e:
                logger.warning(f"[STT] Failed to delete temp file: {e}")


def is_model_loaded() -> bool:
    return _whisper_model is not None


def get_model_status() -> dict:
    return {
        "model": settings.whisper_model,
        "loaded": _whisper_model is not None,
        "error": _model_load_error,
    }
