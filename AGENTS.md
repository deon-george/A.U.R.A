# AGENTS.md - Developer Guide for A.U.R.A

This document provides essential information for AI agents and developers working on the A.U.R.A codebase.

---

## Project Overview

A.U.R.A (Assistive User Reminder App) is a comprehensive healthcare assistance platform consisting of three modules:

- **Frontend** (React Native / Expo): Mobile application for patients, caregivers, and admins
- **Backend** (Python FastAPI): REST API and WebSocket server handling data, authentication, and notifications
- **Auramodule** (Python): Raspberry Pi module for face recognition, speech-to-text, and local processing

---

## Build, Lint, and Test Commands

### Frontend (React Native / Expo)

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Expo development server
npm start

# Run on Android (requires Android SDK configured)
npm run android

# Run on iOS (requires Xcode)
npm run ios

# Build Android release APK
npm run build:android

# TypeScript type checking
npx tsc --noEmit
```

### Backend (Python FastAPI)

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (if not exists)
python -m venv venv

# Activate virtual environment
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Run development server with auto-reload
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

# Run without auto-reload (production)
uvicorn app.main:app --host 0.0.0.0 --port 8001

# Run single test (if tests exist)
pytest tests/test_file.py::test_function_name -v
```

### Auramodule (Python - Raspberry Pi)

```bash
# Navigate to auramodule directory
cd auramodule

# Create virtual environment (if not exists)
python -m venv venv

# Activate virtual environment
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Run the module
python -m app.main

# Optional: Run with specific configuration
PATIENT_UID=your_uid python -m app.main
```

---

## Code Style Guidelines

### TypeScript (Frontend)

#### Import Organization
```typescript
// 1. React/React Native core
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

// 2. Expo packages
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';

// 3. Third-party libraries
import axios from 'axios';

// 4. Local components/contexts
import { useAuth } from '../src/context/auth';
import AuraLogo from '../src/components/AuraLogo';

// 5. Theme/constants
import { colors, fonts, spacing, radius } from '../src/theme';
```

#### Function Headings
All functions must have a heading comment in this format:
```typescript
//------This Function handles the [Purpose]---------
function handleUserLogin(credentials: Credentials): Promise<User> {
    // implementation
}
```

#### Naming Conventions
- **Components**: PascalCase (e.g., `LoginScreen`, `AuraLogo`)
- **Functions/variables**: camelCase (e.g., `handleLogin`, `userData`)
- **Constants**: camelCase or UPPER_SNAKE_CASE (e.g., `maxRetries`, `API_BASE_URL`)
- **Files**: camelCase with descriptive names (e.g., `authContext.tsx`, `useFaceRecognition.ts`)

#### Type Usage
- Always use TypeScript types, avoid `any` when possible
- Define interfaces for complex objects
- Use generics where appropriate for reusable components

#### Styling
- Use `StyleSheet.create` with a named object (e.g., `const s = StyleSheet.create({...})`)
- Reference styles as `s.container`, `s.button`, etc.
- Keep styles organized in the same file at the bottom

---

### Python (Backend & Auramodule)

#### Import Organization
```python
# 1. Standard library
import logging
import asyncio
from typing import Optional
from datetime import datetime

# 2. Third-party packages
from fastapi import FastAPI, Request
from pydantic import BaseModel, field_validator
from beanie import Document

# 3. Local application imports
from app.core.config import settings
from app.models.user import User
from app.services.auth import verify_token
```

#### Function Headings
All functions must have a heading comment in this format:
```python
#------This Function handles the [Purpose]---------
def verify_user_credentials(token: str) -> Optional[User]:
    # implementation
```

#### Naming Conventions
- **Classes**: PascalCase (e.g., `UserModel`, `AuthService`)
- **Functions/variables**: snake_case (e.g., `get_user_by_id`, `user_data`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_LOGIN_ATTEMPTS`)
- **Files**: snake_case (e.g., `auth_service.py`, `user_models.py`)

#### Type Usage
- Use Python type hints for all function arguments and return types
- Use `Optional[X]` instead of `X | None` for compatibility
- Use `Union[X, Y]` for multiple types
- Import types from `typing` module

#### Pydantic Models
- Use Pydantic v2 `BaseModel` for request/response schemas
- Use `field_validator` decorators for custom validation
- Keep validation logic in the model class

---

## Error Handling

### Frontend (TypeScript)
```typescript
try {
    const result = await apiCall();
    setData(result);
} catch (error: any) {
    if (error.code === 'NETWORK_ERROR') {
        Alert.alert('Connection Error', 'Please check your internet connection.');
    } else {
        console.error('API Error:', error);
    }
}
```

### Backend (Python)
```python
logger = logging.getLogger(__name__)

async def fetch_user(user_id: str) -> User:
    try:
        user = await User.get(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
```

---

## Project Structure

### Frontend (`/frontend`)
```
frontend/
├── app/                    # Expo Router screens (app directory)
│   ├── (auth)/            # Authentication screens
│   ├── (patient)/        # Patient-facing screens
│   ├── (caregiver)/      # Caregiver-facing screens
│   ├── (onboarding)/     # Onboarding flow
│   └── (admin)/          # Admin screens
├── src/
│   ├── components/       # Reusable UI components
│   ├── context/         # React Context providers
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API and business logic
│   ├── theme/           # Colors, fonts, spacing
│   └── types/           # TypeScript interfaces
├── android/              # Android native project
└── ios/                  # iOS native project
```

### Backend (`/backend`)
```
backend/
├── app/
│   ├── core/            # Configuration, Firebase, database setup
│   ├── db/              # Database models and queries
│   ├── models/          # Pydantic/Beanie document models
│   ├── routes/         # API route handlers
│   ├── schemas/        # Request/response schemas
│   ├── services/       # Business logic services
│   └── utils/          # Utility functions
├── .env                # Environment variables
└── requirements.txt    # Python dependencies
```

### Auramodule (`/auramodule`)
```
auramodule/
├── app/
│   ├── core/           # Configuration
│   └── services/      # Face recognition, speech, camera, mic
├── .env               # Environment variables
└── requirements.txt   # Python dependencies
```

---

## Important Notes

### Code Authenticity
- All variable and function names must feel human-written
- Avoid generic AI-sounding names like `processData`, `handleClick`, `getInfo`
- Use descriptive, specific names that reflect the actual purpose

### Function Headings Format
- **TypeScript**: `//------This Function handles the [purpose]---------`
- **Python**: `#------This Function handles the [purpose]---------`

### No Comments in Code
- Do not add implementation comments inside functions
- Only function headings are allowed (as specified above)
- Keep code self-documenting through good naming

### Development Workflow
1. Create a branch for each feature/fix
2. Test locally before committing
3. Ensure code compiles/runs without errors
4. Follow the existing code patterns in each module

### Environment Variables
Each module has its own `.env` file. Copy from `.env.example` and configure appropriately.

---

## Testing

### Frontend
- No formal test framework currently configured
- Manual testing via Expo on device/emulator

### Backend
- Tests should be placed in `backend/tests/` directory
- Run tests with `pytest` command
- Use `pytest -v` for verbose output

### Auramodule
- No formal test framework currently configured
- Test functionality on actual Raspberry Pi hardware

---

## Linting

### Frontend
```bash
# TypeScript checking
npx tsc --noEmit

# ESLint (if configured)
npx eslint . --ext .ts,.tsx
```

### Backend
```bash
# Flake8
flake8 app/

# Black formatting check
black --check app/

# MyPy type checking
mypy app/
```

---

Last updated: February 2026
