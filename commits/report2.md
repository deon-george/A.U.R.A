# Comprehensive Codebase Deep Scan Report

**Date**: 2026-02-28  
**Scope**: Full scan of `auramodule/`, `backend/`, `frontend/`

---

## 1. Aura Module State

### What Each File Does

**`auramodule/app/core/config.py`**
- Pydantic `Settings` class loaded from `.env`
- Key settings: `backend_url` (default `http://localhost:8000`), `patient_uid`, `backend_auth_token`, `hf_token`, `camera_index`, `ws_port`/`http_port` (both default `8001`), `whisper_model` (default `"base"`), `ollama_url` (default `http://localhost:11434`), `ollama_model` (default `"qwen2.5:7b"`), `face_confidence_threshold` (0.4), `demo_mode`
- **Issue**: `ws_port` and `http_port` are both `8001` — they are the same port (unified server), but having two separate settings for the same value is confusing
- **Issue**: `backend_url` defaults to `localhost:8000` but the backend runs on port `8001` — port mismatch in defaults

**`auramodule/app/main.py`**
- Entry point: sets up logging, validates config, pre-loads face recognition model, registers with backend, starts camera, starts `ContinuousMicrophone` with a summarization callback, starts mDNS discovery, starts unified HTTP+WS server
- Handles graceful shutdown on SIGINT/SIGTERM
- **Issue**: Excessive `#------This Function handles the...` comment style on every function — not human-like

**`auramodule/app/ws_server.py`**
- Unified aiohttp server exposing:
  - `GET /health` — service health
  - `GET /status` — detailed status
  - `GET /latest_transcript` — last transcribed text
  - `GET /video_feed` — MJPEG stream
  - `GET /snapshot` — single JPEG frame
  - `POST /extract_face` — extract face embeddings from base64 image
  - `POST /identify_person` — identify person via face recognition
  - `GET /ws` — WebSocket endpoint
- WebSocket commands: `connect`, `identify`, `start_listening`, `stop_listening`, `get_transcript`, `status`, `ping`
- **Issue**: `get_transcript` command calls both `transcribe_audio()` and `analyze_conversation()` inline — AI processing happening in the WS handler
- **Issue**: Excessive `#------This Function handles the...` comment style

**`auramodule/app/services/discovery.py`**
- Registers the Aura module as an mDNS service (`_aura._tcp.local.`) using `zeroconf`
- Broadcasts: service name, version, ws_port, http_port, patient_uid prefix
- `_get_local_ip()` uses UDP socket trick to determine LAN IP
- **Does NOT auto-discover backend/frontend IPs** — it only *broadcasts* the module's own presence; the backend URL must be manually configured in `.env`
- **Issue**: No mDNS *discovery* of the backend — only *advertisement* of the module

**`auramodule/app/services/backend_client.py`**
- `BackendClient` class: registers module with backend (`POST /aura/register` or `/aura/device/register`), sends heartbeats every `heartbeat_interval` seconds, handles re-registration on disconnect, logs events
- Uses `settings.backend_url` (hardcoded in `.env` or defaulting to `localhost:8000`)
- Exponential backoff on registration failures (up to 10 retries)
- **Issue**: Backend URL is not auto-discovered — must be manually set in `.env`

**`auramodule/app/services/conversation.py`**
- **AI Features**: Uses **Ollama** (local LLM, default `qwen2.5:7b`) for:
  1. `analyze_conversation()` — extracts events, key info, reminders, mood, summary from transcript using `EXTRACTION_PROMPT`
  2. `summarize_conversation()` — generates journal summary from multiple transcripts using `SUMMARIZATION_PROMPT`
- After analysis, stores journal entry to backend via `POST /journal/`
- After summarization, sends summary to backend via `POST /aura/log_event` or `/aura/device/log_event`
- Uses `dateparser` for natural language datetime parsing
- **Issue**: Ollama URL is hardcoded to `localhost:11434` — no auto-discovery

**`auramodule/app/services/face_recognition.py`**
- **AI Features**: Uses **InsightFace** (`buffalo_l` model, ~400MB) for face detection and embedding extraction
- `detect_and_crop_faces()` — detects faces, crops, resizes to 112×112, extracts 512-dim normalized embeddings
- `identify_person()` — fetches relatives from backend (`GET /relatives/`), compares face embeddings using vectorized cosine similarity, returns identified persons above `face_confidence_threshold` (0.4)
- Falls back gracefully if InsightFace not installed
- **Issue**: Hardcoded port `8001` in `relatives.py` backend route (see backend section)

**`auramodule/app/services/speech.py`**
- **AI Features**: Uses **faster-whisper** (configurable model, default `"base"`) for speech-to-text
- `transcribe_audio()` — writes audio bytes to temp WAV file, transcribes with VAD filter, returns text
- Auto-detects CUDA availability, falls back to CPU
- Lazy model loading (loads on first use)

**`auramodule/app/services/camera.py`**
- `CameraService` — captures frames in a background thread using OpenCV
- Supports Windows (DirectShow/MSMF), Linux (V4L2), and demo mode (generates synthetic frames)
- Thread-safe frame access via lock
- FPS tracking, error counting with auto-stop after 10 consecutive errors

**`auramodule/app/services/microphone.py`**
- Two classes:
  1. `MicrophoneService` — on-demand recording with silence detection, stores chunks in buffer
  2. `ContinuousMicrophone` — always-on recording with 10-minute summarization intervals, runs faster-whisper in a separate transcription thread
- Both support demo mode (no PyAudio)
- **Issue**: `ContinuousMicrophone` loads its own Whisper model instance separately from `speech.py`'s model — two model instances possible

---

## 2. Backend State

### Core Setup

**`backend/app/core/config.py`**
- Settings: `environment`, `server_host` (`0.0.0.0`), `port` (`8001`), `mongodb_uri`, `db_name` (`aura`), `firebase_credentials_path`, `groq_api_key`, `secret_key`, `cors_origins`
- Auto-generates `secret_key` in development
- **Issue**: `groq_api_key` defaults to empty string — AI features silently disabled if not set

**`backend/app/main.py`**
- FastAPI app with Firebase init, MongoDB connection, background cleanup task
- CORS: `allow_origins=["*"]` — **completely open CORS in production**
- Registers 18 routers

**`backend/app/core/database.py`**
- MongoDB via `pymongo` async + Beanie ODM
- Initializes 10 document models, creates indexes for `AuraModulesDB` and `AuraEventsDB`

**`backend/app/core/firebase.py`**
- Firebase Admin SDK for token verification
- `get_current_user_uid()` — FastAPI dependency that verifies Bearer token

### Routes Summary

| Route File | Prefix | Key Endpoints |
|---|---|---|
| `auth.py` | `/auth` | `POST /register`, `GET /me`, `PUT /me` |
| `user.py` | `/user` | `GET /profile`, `PATCH /profile`, `GET/POST/DELETE /caregivers` |
| `onboarding.py` | `/onboarding` | `PUT /illness`, `POST /medications`, `POST /caregiver`, `PUT /preferences`, `PUT /complete`, `PUT /caregiver-intake` |
| `medications.py` | `/medications` | Full CRUD + `POST /{id}/take` |
| `journal.py` | `/journal` | Full CRUD + `GET /search` — **calls Groq AI on `source=ai_generated`** |
| `relatives.py` | `/relatives` | Full CRUD + `POST /{id}/photo` + `PUT /{id}/embeddings` |
| `sos.py` | `/sos` | `POST /trigger`, `GET /active`, `GET /`, `POST /{id}/resolve` |
| `location.py` | `/location` | `PUT /update`, `GET /{patient_uid}`, `POST /geofence-event` |
| `notifications.py` | `/notifications` | FCM token register/unregister/test |
| `settings.py` | `/settings` | Full settings CRUD (notifications, appearance, privacy, voice, accessibility) |
| `suggestions.py` | `/suggestions` | Full CRUD + `POST /generate` — **calls Groq AI (BROKEN)** |
| `orito.py` | `/orito` | `POST /interactions`, `GET /interactions`, `GET /interactions/recent`, `GET /analytics/emotions` — **stores AI interactions, NO AI calls** |
| `reports.py` | `/reports` | `GET /daily`, `GET /daily-summary`, `GET /emotions`, `GET /timeline`, `GET /weekly`, `GET /alerts` |
| `aura.py` | `/aura` | Register, heartbeat, discover, get module, identify person (proxies to module), live context, log event, events, circuit breaker |
| `aura_status.py` | `/aura` | `GET /status` |
| `ws.py` | (none) | `WS /ws/{user_uid}` — SOS broadcast, aura status |
| `reminders.py` | `/reminders` | Full CRUD + `POST /{id}/complete` |
| `calls.py` | `/calls` | `POST /initiate` — **stub only, returns status without actually calling** |
| `admin.py` | `/admin` | User management, stats, SOS admin, ban/unban |

### Backend AI Features

**`backend/app/services/suggestion_generator.py`**
- **CRITICAL BUG**: The `_call_groq_api()` method is **incomplete/broken**. The method body contains only the `system_prompt` string and a `type_mapping` dict, then calls `type_mapping.get(type_str.lower(), ...)` — but `type_str` is **never defined** in scope. The actual HTTP call to Groq API is **missing entirely**. The `_map_type()` method is also missing. This means `POST /suggestions/generate` will always return an empty list (or raise a `NameError`).

**`backend/app/services/summarizer.py`**
- Uses **Groq API** (`llama-3.1-8b-instant`) to summarize conversation messages
- Called from `journal.py` when `source == "ai_generated"` and `messages` are provided
- Has fallback keyword-based summarization when Groq key is missing

**`backend/app/routes/journal.py`**
- Calls `summarize_conversation()` (Groq) when creating journal entries with `source="ai_generated"` and `messages` field

**`backend/app/routes/relatives.py`**
- **HARDCODED PORT**: `f"http://{user.aura_module_ip}:8001/extract_face"` — port `8001` is hardcoded instead of using the stored module port from `AuraModulesDB`
- Calls Aura module directly to extract face embeddings when uploading photos

---

## 3. Frontend State

### Architecture Overview

The frontend is a React Native/Expo app with:
- **`frontend/src/services/orito.ts`** — 3,392-line AI service (the largest file in the codebase)
- **`frontend/src/services/api.ts`** — Axios instance, base URL from `EXPO_PUBLIC_BACKEND_URL` or `app.config.js`, defaults to `http://10.0.2.2:8001`
- **`frontend/src/services/aura-discovery.ts`** — LAN scanning, WebSocket connection to Aura module
- **`frontend/src/context/aura.tsx`** — Aura connection state management

### Frontend AI Features (MAJOR ISSUE)

**`frontend/src/services/orito.ts`** contains the **entire AI brain of the application** running **directly in the frontend**:

1. **Direct Groq API calls** from the frontend:
   - `sendMessage()` — calls `https://api.groq.com/openai/v1/chat/completions` directly with `llama-3.3-70b-versatile`
   - `transcribeAudio()` — calls `https://api.groq.com/openai/v1/audio/transcriptions` directly with `whisper-large-v3`
   - The **Groq API key is embedded in the app bundle** via `app.config.js` `extra.groqApiKey`

2. **Tool execution** — 30+ tools that call backend APIs directly from the frontend AI service

3. **Emotion detection** — keyword-based emotion classification running client-side

4. **Danger detection** — pattern matching for emergency signals, auto-triggers SOS

5. **Conversation history** — stored in `AsyncStorage` on device

6. **System prompt** — 500+ line prompt defining "Orito" personality, stored in frontend

**`frontend/app/(patient)/chat.tsx`**
- Imports `sendMessage`, `transcribeAudio`, `detectEmotionFromText` from `orito.ts`
- All AI processing happens client-side
- After each AI response, saves to journal via `api.post('/journal/', ...)`

**`frontend/app/(patient)/dashboard.tsx`**
- No AI logic — fetches suggestions from backend, displays them
- Uses `useAura()` context for module connection state

**`frontend/app/(patient)/connect-aura.tsx`**
- LAN scanning via `scanForAuraModule()` — probes all IPs in subnet on port 8001
- Manual IP entry fallback
- Registers module with backend after WebSocket connection established

### Frontend Package.json Analysis

No AI-specific npm packages. AI is done via raw `fetch()` calls to Groq API. Key dependencies:
- `expo-speech-recognition` — native speech recognition
- `expo-audio` — audio recording
- `expo-speech` — TTS
- `@react-native-firebase/*` — Firebase auth + messaging
- `axios` — HTTP client for backend

---

## 4. AI Features Location

| Feature | Current Location | Should Be |
|---|---|---|
| Chat AI (Orito LLM) | **Frontend** (`orito.ts` → Groq direct) | Backend |
| Audio transcription (Whisper) | **Frontend** (`orito.ts` → Groq direct) | Backend (or Aura module) |
| Groq API key | **Frontend bundle** (`app.config.js`) | Backend env var only |
| Emotion detection | **Frontend** (keyword matching) | Frontend (acceptable) |
| Danger/SOS detection | **Frontend** (pattern matching) | Frontend (acceptable) |
| Conversation summarization | **Backend** (`summarizer.py` → Groq) | Backend ✓ |
| Suggestion generation | **Backend** (`suggestion_generator.py` → Groq) | Backend ✓ (but broken) |
| Face recognition | **Aura Module** (InsightFace) | Aura Module ✓ |
| Speech-to-text (continuous) | **Aura Module** (faster-whisper) | Aura Module ✓ |
| Conversation analysis | **Aura Module** (Ollama local LLM) | Aura Module ✓ |

---

## 5. Discovery / Auto-Configuration Issues

### Hardcoded Values

| Location | Hardcoded Value | Issue |
|---|---|---|
| `auramodule/app/core/config.py:11` | `backend_url = "http://localhost:8000"` | Wrong default port (backend is 8001) |
| `auramodule/app/core/config.py:20` | `ollama_url = "http://localhost:11434"` | Ollama URL not discoverable |
| `backend/app/routes/relatives.py:90` | `:8001/extract_face` | Port hardcoded, ignores stored module port |
| `frontend/src/services/aura-discovery.ts:5` | `AURA_PORT = 8001` | Port hardcoded for scanning |
| `frontend/src/context/aura.tsx:39` | `modulePort: 8001` | Default port hardcoded |
| `frontend/app.config.js:15` | `backendUrl: ... 'http://10.0.2.2:8001'` | Android emulator localhost alias hardcoded |
| `frontend/src/services/api.ts:13` | `'http://10.0.2.2:8001'` | Fallback hardcoded |

### Discovery Architecture

- **Aura Module → Backend**: NOT auto-discovered. Module must have `BACKEND_URL` in `.env`. The mDNS service only *advertises* the module, it does not *discover* the backend.
- **Frontend → Backend**: NOT auto-discovered. Uses `EXPO_PUBLIC_BACKEND_URL` env var or hardcoded fallback.
- **Frontend → Aura Module**: **Partially auto-discovered** via LAN subnet scan (`aura-discovery.ts`). Scans all IPs on the subnet probing port 8001 for `/health` endpoint returning `service: "AURA_MODULE"`. Also supports saved module address and manual entry.
- **Backend → Aura Module**: Looks up stored IP/port from MongoDB when proxying requests.

---

## 6. Code Quality Issues

### Comment Style (Excessive / Non-Human)

Every single function across all three codebases uses the pattern:
```python
#------This Function handles the [Name]---------
```
or in TypeScript:
```typescript
//------This Function handles the [Name]---------
```

This is applied to **every function** including trivial ones, making the code look AI-generated. Examples:
- `auramodule/app/core/config.py:9`: `#------This Class handles the Settings Configuration---------`
- `auramodule/app/core/config.py:30`: `#------This Function validates the patient UID---------`
- `frontend/src/services/orito.ts:64`: `//------This Function handles the Get Recovery Response---------`
- Even inline comments inside functions: `frontend/src/services/orito.ts:693`: `//------This Function handles the By Id---------`

This pattern appears **hundreds of times** across all files. It should only appear as function heading comments, not on every code block.

### Variable/Function Naming (AI-Generated Style)

- `triggerAutomaticSosIfNeeded` — overly descriptive
- `shouldInjectAuraGroundTruthForTurn` — verbose
- `hasRecentAuraContextInConversation` — verbose
- `maybeInjectAuraGroundTruthForTurn` — verbose
- `addAuraGroundTruthSystemMessage` — verbose
- `_validate_event_payload` — acceptable
- `_store_event_and_journal` — acceptable

### Inline Comments on Trivial Code

In `orito.ts`, comments like `//------This Function handles the By Id---------` appear on single-line `find()` calls, `//------This Function handles the Results---------` on a `Promise.all()` call, etc.

---

## 7. System Design Issues

### Critical: Groq API Key Exposed in Frontend

The Groq API key is passed via `app.config.js` `extra.groqApiKey` → `Constants.expoConfig.extra.groqApiKey` → used directly in `fetch()` calls to `https://api.groq.com`. This means:
- The API key is **embedded in the compiled app bundle**
- Anyone who decompiles the APK can extract the key
- All AI costs are billed directly to the key owner with no server-side rate limiting

### Critical: AI Logic in Frontend

The entire Orito AI system (3,392 lines) runs in the frontend. This means:
- No server-side conversation logging before the interaction completes
- No ability to update the AI model/prompt without an app update
- No server-side abuse prevention
- The system prompt (500+ lines) is visible in the app bundle

### Broken: Suggestion Generator

`backend/app/services/suggestion_generator.py` `_call_groq_api()` method is **completely broken**:
- The method body ends with `return type_mapping.get(type_str.lower(), SuggestionType.GENERAL)` — this is the body of `_map_type()` accidentally placed inside `_call_groq_api()`
- `type_str` is undefined in this scope → `NameError` at runtime
- The actual HTTP call to Groq is missing
- `POST /suggestions/generate` will always return `[]` or raise an error

### Stub: Calls Route

`backend/app/routes/calls.py` `POST /initiate` returns `{"status": "initiated", "phone": ..., "relative_id": ...}` but **does not actually initiate any call**. The frontend's `call_relative` tool calls this endpoint and tells the user "Calling [name]..." but nothing happens.

### Port Confusion

- Backend config default port: `8001`
- Aura module default port: `8001` (both `ws_port` and `http_port`)
- Backend URL default in aura module: `localhost:8000` — **wrong port**
- These should be different ports or the defaults should be consistent

### CORS Wildcard

`backend/app/main.py:204`: `allow_origins=["*"]` — completely open CORS. The `cors_origins` setting in config is defined but **not used** in the middleware setup.

### Duplicate Whisper Model Loading

`ContinuousMicrophone` in `microphone.py` loads its own `WhisperModel` instance, while `speech.py` has a separate global `_whisper_model`. Two instances of the same model can be loaded simultaneously, doubling memory usage.

### `aura_module_ip` Field on User Model

`backend/app/routes/relatives.py:86` accesses `user.aura_module_ip` directly on the User model to call the Aura module for face extraction. This is a legacy field — the proper approach is to look up the module via `AuraModulesDB`. The hardcoded port `:8001` compounds this issue.

---

## 8. Complete File List

### Aura Module (`auramodule/`)

| File | Description |
|---|---|
| `auramodule/requirements.txt` | opencv, numpy, aiohttp, httpx, faster-whisper, zeroconf, python-dotenv, scipy, pydantic-settings, dateparser |
| `auramodule/app/main.py` | Entry point, orchestrates all services |
| `auramodule/app/ws_server.py` | Unified HTTP+WebSocket server (aiohttp) |
| `auramodule/app/core/config.py` | Pydantic settings from .env |
| `auramodule/app/services/backend_client.py` | HTTP client for backend registration/heartbeat/events |
| `auramodule/app/services/camera.py` | OpenCV camera capture service |
| `auramodule/app/services/conversation.py` | **AI**: Ollama LLM for conversation analysis and summarization |
| `auramodule/app/services/discovery.py` | mDNS advertisement via zeroconf |
| `auramodule/app/services/face_recognition.py` | **AI**: InsightFace buffalo_l for face detection/identification |
| `auramodule/app/services/microphone.py` | PyAudio recording, silence detection, continuous transcription |
| `auramodule/app/services/speech.py` | **AI**: faster-whisper for speech-to-text |

### Backend (`backend/`)

| File | Description |
|---|---|
| `backend/app/main.py` | FastAPI app setup, middleware, router registration |
| `backend/app/core/config.py` | Pydantic settings (env vars) |
| `backend/app/core/database.py` | MongoDB connection, Beanie init |
| `backend/app/core/firebase.py` | Firebase Admin SDK, token verification dependency |
| `backend/app/db/aura_modules.py` | Raw MongoDB ops for aura_modules collection |
| `backend/app/db/aura_events.py` | Raw MongoDB ops for aura_events collection |
| `backend/app/models/journal.py` | JournalEntry Beanie document |
| `backend/app/models/medication.py` | Medication Beanie document |
| `backend/app/models/orito_interaction.py` | OritoInteraction Beanie document |
| `backend/app/models/relative.py` | Relative Beanie document (with face_embeddings) |
| `backend/app/models/reminder.py` | Reminder Beanie document |
| `backend/app/models/settings.py` | UserSettings Beanie document |
| `backend/app/models/sos.py` | SOSEvent Beanie document |
| `backend/app/models/suggestion.py` | Suggestion + SuggestionHistory Beanie documents |
| `backend/app/models/user.py` | User Beanie document (roles, illness, FCM tokens) |
| `backend/app/routes/admin.py` | Admin-only user management, stats |
| `backend/app/routes/aura.py` | Aura module registration, heartbeat, proxy, events, circuit breaker |
| `backend/app/routes/aura_status.py` | `GET /aura/status` endpoint |
| `backend/app/routes/auth.py` | User registration, profile |
| `backend/app/routes/calls.py` | Call initiation stub (non-functional) |
| `backend/app/routes/journal.py` | Journal CRUD + **Groq AI summarization** |
| `backend/app/routes/location.py` | Location update, geofence events |
| `backend/app/routes/medications.py` | Medication CRUD |
| `backend/app/routes/notifications.py` | FCM token management |
| `backend/app/routes/onboarding.py` | Onboarding flow endpoints |
| `backend/app/routes/orito.py` | Orito interaction storage/retrieval (no AI calls) |
| `backend/app/routes/relatives.py` | Relatives CRUD + face embedding extraction |
| `backend/app/routes/reminders.py` | Reminder CRUD |
| `backend/app/routes/reports.py` | Daily/weekly/emotion/timeline reports |
| `backend/app/routes/settings.py` | User settings CRUD |
| `backend/app/routes/sos.py` | SOS trigger, list, resolve |
| `backend/app/routes/suggestions.py` | Suggestion CRUD + **Groq AI generation** (broken) |
| `backend/app/routes/user.py` | User profile, caregiver management |
| `backend/app/routes/ws.py` | WebSocket endpoint for real-time events |
| `backend/app/services/cleanup_task.py` | Background task: marks stale modules offline every 60s |
| `backend/app/services/notifications.py` | FCM push notifications (SOS, medication, geofence) |
| `backend/app/services/suggestion_generator.py` | **BROKEN**: Groq AI suggestion generation (incomplete implementation) |
| `backend/app/services/summarizer.py` | **AI**: Groq `llama-3.1-8b-instant` conversation summarization |
| `backend/app/utils/access_control.py` | Patient access check (admin/caregiver/self) |
| `backend/app/utils/datetime_parser.py` | Natural language datetime parsing |

### Frontend (`frontend/`)

| File | Description |
|---|---|
| `frontend/package.json` | Expo 55, React Native 0.83.2, Firebase, no AI packages |
| `frontend/app.config.js` | Expo config — **exposes GROQ_API_KEY in bundle** |
| `frontend/app/_layout.tsx` | Root layout, auth/aura providers |
| `frontend/app/index.tsx` | Entry redirect |
| `frontend/app/(auth)/login.tsx` | Firebase Google sign-in |
| `frontend/app/(patient)/_layout.tsx` | Patient tab layout |
| `frontend/app/(patient)/chat.tsx` | **AI**: Orito chat UI, calls Groq directly |
| `frontend/app/(patient)/dashboard.tsx` | Patient home, Aura connection, suggestions display |
| `frontend/app/(patient)/connect-aura.tsx` | LAN scan + manual IP for Aura module connection |
| `frontend/app/(patient)/journal.tsx` | Journal entries list/create |
| `frontend/app/(patient)/memory_bank.tsx` | Memory bank view |
| `frontend/app/(patient)/calendar.tsx` | Calendar view |
| `frontend/app/(patient)/calendar-journal.tsx` | Calendar journal entries |
| `frontend/app/(patient)/calendar-medications.tsx` | Calendar medication schedule |
| `frontend/app/(patient)/calendar-tasks.tsx` | Calendar tasks/reminders |
| `frontend/app/(patient)/camera-preview.tsx` | Aura camera preview |
| `frontend/app/(patient)/edit-caregivers.tsx` | Caregiver management |
| `frontend/app/(patient)/edit-condition.tsx` | Medical condition editing |
| `frontend/app/(patient)/edit-medications.tsx` | Medication editing |
| `frontend/app/(patient)/patient-info.tsx` | Patient info display |
| `frontend/app/(patient)/profile.tsx` | Profile screen |
| `frontend/app/(patient)/relatives.tsx` | Relatives management |
| `frontend/app/(patient)/settings.tsx` | App settings |
| `frontend/app/(caregiver)/dashboard.tsx` | Caregiver home |
| `frontend/app/(caregiver)/alerts.tsx` | Caregiver alerts |
| `frontend/app/(caregiver)/location.tsx` | Patient location tracking |
| `frontend/app/(caregiver)/medications.tsx` | Patient medications view |
| `frontend/app/(caregiver)/reports.tsx` | Patient reports |
| `frontend/app/(admin)/dashboard.tsx` | Admin dashboard |
| `frontend/app/(onboarding)/*.tsx` | Onboarding flow screens |
| `frontend/src/services/orito.ts` | **AI**: 3,392-line Groq LLM service (entire Orito AI) |
| `frontend/src/services/api.ts` | Axios backend client |
| `frontend/src/services/aura-discovery.ts` | LAN scan, WebSocket connection to Aura |
| `frontend/src/services/voiceAssistant.ts` | Wake word detection, voice state management |
| `frontend/src/services/nativeSpeech.ts` | Native speech recognition wrapper |
| `frontend/src/services/notifications.ts` | FCM notification handling |
| `frontend/src/services/moduleStats.ts` | Local stats tracking (faces, conversations, voice commands) |
| `frontend/src/services/pedometer.ts` | Step counting via expo-sensors |
| `frontend/src/services/patientData.ts` | Patient profile data fetching |
| `frontend/src/services/location.ts` | Location tracking service |
| `frontend/src/services/fallbackSpeech.ts` | Fallback TTS |
| `frontend/src/services/imageCache.ts` | Image caching |
| `frontend/src/services/connectionMonitor.ts` | Network connectivity monitoring |
| `frontend/src/services/authEvents.ts` | Auth event emitter (unauthorized events) |
| `frontend/src/context/aura.tsx` | Aura module connection context |
| `frontend/src/context/auth.tsx` | Firebase auth context |
| `frontend/src/context/preferences.tsx` | User preferences context |
| `frontend/src/components/*.tsx` | UI components (Header, Card, Screen, SosButton, OritoOverlay, etc.) |

---

## Summary of Issues to Fix (Priority Order)

1. **🔴 CRITICAL**: Move Groq API calls from frontend to backend — create a `/orito/chat` endpoint that accepts messages and returns AI responses. Remove `groqApiKey` from `app.config.js`.

2. **🔴 CRITICAL**: Fix `suggestion_generator.py` — the `_call_groq_api()` method is broken (missing HTTP call, undefined `type_str`).

3. **🔴 CRITICAL**: Fix hardcoded port `:8001` in `relatives.py` — use the stored module port from `AuraModulesDB`.

4. **🟠 HIGH**: Fix `backend_url` default in aura module config — change from `localhost:8000` to `localhost:8001`.

5. **🟠 HIGH**: Fix CORS — use `settings.cors_list` instead of `["*"]` in `main.py`.

6. **🟠 HIGH**: Fix `calls.py` — implement actual phone call initiation or clearly mark as stub.

7. **🟡 MEDIUM**: Remove excessive `#------This Function handles the...` comments — keep only function-level docstrings.

8. **🟡 MEDIUM**: Deduplicate Whisper model loading — `ContinuousMicrophone` should use the same model instance as `speech.py`.

9. **🟡 MEDIUM**: Add backend discovery to aura module — either mDNS discovery of backend or a configuration endpoint.

10. **🟢 LOW**: Rename overly verbose function names in `orito.ts` to more natural names.

11. **🟢 LOW**: Remove `aura_module_ip` direct field access in `relatives.py` — use `AuraModulesDB` lookup instead.
