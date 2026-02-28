# Aura ✨

**AI-Powered Companion for Elderly Patients with Memory Conditions**

<p align="center">
  <img src="https://img.shields.io/badge/build-passing-brightgreen?style=flat&logo=github" alt="Build Status">
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat" alt="License">
  <img src="https://img.shields.io/badge/version-1.0.0-orange?style=flat" alt="Version">
</p>

---

## 📋 Project Overview

Aura is a comprehensive healthcare assistance platform designed specifically for elderly patients suffering from memory conditions such as dementia and Alzheimer's. The system provides a multi-faceted approach to patient care through three integrated modules:

- **Mobile Application** for patients and caregivers
- **Backend API** for data management and authentication
- **Auramodule** (Raspberry Pi) for face recognition and voice interaction

The platform enables caregivers to remotely monitor patients, receive emergency alerts, manage medications, and maintain a digital memory bank of precious family moments.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Aura System                              │
├─────────────────┬─────────────────────┬─────────────────────────┤
│    Frontend    │       Backend       │      Auramodule         │
│  (React Native)│    (FastAPI)        │    (Raspberry Pi)       │
│                │                     │                         │
│  • Patient App │  • REST API         │  • Face Recognition     │
│  • Caregiver   │  • WebSocket Server │  • Speech-to-Text       │
│  • Admin Panel │  • Firebase Auth    │  • Camera Processing    │
│                │  • MongoDB          │  • Voice Output         │
└─────────────────┴─────────────────────┴─────────────────────────┘
```

### Module Descriptions

| Module | Technology | Purpose |
|--------|------------|---------|
| **Frontend** | React Native / Expo | Patient mobile app, caregiver dashboard, and admin panel |
| **Backend** | Python FastAPI | REST API, authentication, database, and real-time notifications |
| **Auramodule** | Python | Edge computing for face recognition, voice commands, and local processing |

---

## 🛠️ Tech Stack

### Frontend (Mobile Application)

| Technology | Version | Purpose |
|------------|---------|---------|
| Expo | 55 | Development framework |
| React Native | 0.83.2 | UI framework |
| TypeScript | - | Type safety |
| Firebase | - | Authentication & cloud services |
| axios | - | HTTP client |
| Expo Router | - | Navigation |
| expo-notifications | - | Push notifications |

### Backend (API Server)

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.10+ | Runtime |
| FastAPI | 0.128.8+ | Web framework |
| MongoDB | - | Database |
| Beanie | 2.0.0+ | ODM |
| Firebase Auth | 7.1.0+ | Authentication |
| Uvicorn | 0.38.0+ | ASGI server |
| WebSockets | - | Real-time communication |

### Auramodule (Raspberry Pi)

| Technology | Purpose |
|------------|---------|
| Python | Runtime |
| OpenCV | Computer vision |
| faster-whisper | Speech-to-text |
| InsightFace | Face recognition |
| aiohttp | HTTP client |

---

## ✨ Features

### Patient Features

| Feature | Description |
|---------|-------------|
| 🤖 AI Assistant (Orito) | Voice-enabled AI companion for natural conversations |
| 💊 Medication Reminders | Smart reminders with dosage instructions |
| 📖 Memory Journal | Personal diary with AI-powered summarization |
| 📸 Memory Bank | Digital collection of family photos and information |
| 🆘 SOS Emergency | One-tap emergency alert to caregivers |
| 📍 Location Tracking | Real-time location sharing with caregivers |

### Caregiver Features

| Feature | Description |
|---------|-------------|
| 📊 Monitoring Dashboard | Real-time patient status and activity |
| 🔔 Notifications | Instant alerts for emergencies and medication |
| 📅 Schedule Management | Manage patient medication and appointment schedules |
| 📝 Activity Logs | Track patient daily activities and behavior |
| 💬 Communication | Direct messaging with patients |

### Admin Features

| Feature | Description |
|---------|-------------|
| 👥 User Management | Manage all patients, caregivers, and admins |
| 📈 Analytics | System-wide usage and health analytics |
| ⚙️ System Configuration | Platform settings and preferences |

### Technical Features

| Feature | Description |
|---------|-------------|
| 🔐 Secure Authentication | Firebase-based secure login |
| 🔔 Push Notifications | FCM-powered real-time notifications |
| 👤 Face Recognition | Patient identification via Auramodule |
| 🎤 Voice Commands | Hands-free interaction with speech-to-text |
| 💬 Real-time Updates | WebSocket-powered live updates |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.10+
- MongoDB instance (local or Atlas)
- Firebase project
- Raspberry Pi 4 (for Auramodule)

---

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Expo development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

---

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

# Production run
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

---

### Auramodule Setup

```bash
# Navigate to auramodule directory
cd auramodule

# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Run the module
python -m app.main
```

---

## 🔑 Environment Variables

### Backend (.env)

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# MongoDB Connection
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=aura_db

# Server Configuration
HOST=0.0.0.0
PORT=8001
DEBUG=True

# Security
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Frontend

Create `frontend/.env` based on your Firebase configuration:

```env
EXPO_PUBLIC_API_URL=http://localhost:8001
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
```

### Auramodule

```env
BACKEND_URL=http://your-backend-url:8001
PATIENT_UID=patient-uid-here
CAMERA_INDEX=0
```

---

## 🤝 Contributing

We welcome contributions from developers who want to help improve Aura. Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes with clear, descriptive messages
4. Push to the branch
5. Open a Pull Request

When contributing, please adhere to the project's coding standards and include appropriate documentation.

---

## 👥 Team

| Contributor | Role | Focus Area |
|-------------|------|------------|
| **Christopher Joshy (Chriss)** | Owner / Lead | Project architecture, coordination, and overall direction |
| **Deon** | Developer | Frontend & Auramodule |
| **Kuriyan** | Developer | Backend & Auramodule |
| **Binshid** | Developer | Backend |

---

## 📄 License

This project is licensed under the MIT License.

Copyright © 2024 Aura Team

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

<div align="center">

Made with ❤️ for elderly patients and their caregivers

</div>
