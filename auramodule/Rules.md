# A.U.R.A Aura Module Rules

This document contains module-specific rules for the Aura Module (Python, Raspberry Pi). These rules supplement the master rules defined in `rules/Rules.md`.

---

## 1. Global Rules Apply

All rules from `rules/Rules.md` apply to the Aura Module codebase. This includes:

- No inline comments in code (only function headings)
- Latest tool versions
- Change tracking in `agent/Agent.md`
- Commit message format
- Human-like code and variable names
- PR workflow requirements

---

## 2. Authorized Contributors

| Name | Access Level |
|------|--------------|
| **Deon** | Aura Module development and PRs |
| **Kuriyan** | Aura Module development and PRs |
| **Christopher Joshy** | Full access, PR review and approval |

Only the contributors listed above may submit Pull Requests for the Aura Module.

---

## 3. Tech Stack

The Aura Module runs on Python 3.9+ and is designed for Raspberry Pi hardware.

### Core Dependencies

- **HTTP/WebSocket Server**: `aiohttp`
- **Computer Vision**: `opencv-python`, `numpy`
- **Speech-to-Text**: `faster-whisper`
- **Face Recognition**: `insightface`
- **Service Discovery**: `zeroconf`
- **Audio Processing**: `scipy`
- **Configuration**: `pydantic-settings`

### Additional Requirements

- `pickle` (for model serialization)
- `asyncio` for async operations
- `av` for audio/video container handling

---

## 4. Hardware-Specific Rules

### 4.1 Multi-Platform Camera Support

The camera service must support multiple backends:

| Platform | Backend | Notes |
|----------|---------|-------|
| Windows | DirectShow / MSMF | Use `cv2.CAP_DSHOW` or `cv2.CAP_MSMF` |
| Linux | V4L2 | Use `cv2.CAP_V4L2` |
| Demo/Mock | N/A | Return synthetic frames for testing |

### 4.2 Error Handling

- Implement graceful error handling for camera failures
- Auto-stop the camera service after **3 consecutive errors**
- Log all errors with appropriate severity levels
- Provide clear error messages for debugging

### 4.3 Thread Safety

- Camera frame access must be thread-safe
- Use locks (`threading.Lock` or `asyncio.Lock`) when accessing shared frame buffers
- Avoid blocking operations on the main thread

---

## 5. Service Naming Conventions

All services must follow these naming conventions:

| Service | Purpose |
|---------|---------|
| **BackendClient** | HTTP communication with main backend API |
| **CameraService** | OpenCV-based camera capture and frame management |
| **MicrophoneService** | Single-shot audio capture |
| **ContinuousMicrophone** | Continuous audio streaming for speech recognition |
| **FaceRecognitionService** | Face detection and identification using InsightFace |
| **SpeechService** | Audio transcription using faster-whisper |
| **ConversationService** | Ollama LLM integration for conversational AI |

---

## 6. Code Style

### 6.1 Function Headings

All functions must have a heading comment:

```python
#------This Function handles the user authentication---------
async def authenticate_user(user_id: str) -> Optional[User]:
    # implementation
```

### 6.2 Naming Conventions

- **Classes**: `PascalCase` (e.g., `CameraService`)
- **Functions/variables**: `snake_case` (e.g., `capture_frame`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRY_ATTEMPTS`)

### 6.3 Anti-Patterns

Avoid AI-sounding names such as:
- `process_data`, `handle_click`, `get_info`
- `do_something`, `process_frame`, `handle_audio`

Use descriptive, human-like names:
- `extract_face_embedding`, `transcribe_audio_chunk`
- `notify_caregiver`, `update_patient_status`

---

## 7. Change Tracking

All changes to the Aura Module must be tracked:

- Log entries in `agent/Agent.md` with timestamps
- Include description of changes, files modified, and rationale
- Attribute all changes to **Christopher Joshy** (via AI agent)

---

## 8. Pull Request Rules

### 8.1 Eligibility

Only the following may submit PRs to the Aura Module:
- Deon
- Kuriyan
- Christopher Joshy

### 8.2 PR Requirements

- All PRs must follow the commit message format in `rules/Rules.md`
- PRs must reference a report file in `commits/reports/`
- All changes must be tested on actual Raspberry Pi hardware when possible
- PRs must be reviewed and approved by Christopher Joshy before merging

### 8.3 Testing

- Test on actual hardware (Raspberry Pi 4/5 recommended)
- If hardware unavailable, use demo/mock mode for basic validation
- Document any hardware-specific behaviors in the PR

---

## 9. Directory Structure

```
auramodule/
├── app/
│   ├── core/           # Configuration and settings
│   ├── services/      # All service implementations
│   │   ├── backend_client.py
│   │   ├── camera_service.py
│   │   ├── microphone_service.py
│   │   ├── face_recognition_service.py
│   │   ├── speech_service.py
│   │   └── conversation_service.py
│   └── main.py        # Entry point
├── .env                # Environment variables
├── requirements.txt   # Python dependencies
└── README.md          # Module documentation
```

---

*Last updated: February 2026*
