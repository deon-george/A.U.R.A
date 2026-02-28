# Frontend Module Rules

This file contains module-specific rules for the Frontend (React Native / Expo) portion of the A.U.R.A project. All rules in `rules/Rules.md` apply to this module as well.

---

## 1. Authorized Contributors

| Name | Role |
|------|------|
| **Deon** | Frontend Contributor |
| **Christopher Joshy** | Owner / AI Agent Operator |

Only the contributors listed above may submit code changes to the frontend module.

---

## 2. Tech Stack

- **Framework**: React Native with Expo 55
- **Language**: TypeScript
- **Authentication**: Firebase Auth
- **Push Notifications**: Firebase Messaging
- **Key Packages**:
  - `expo-speech` - Text-to-speech functionality
  - `expo-speech-recognition` - Speech-to-text capabilities
  - `expo-audio` - Audio recording and playback
  - `axios` - HTTP client for API calls

---

## 3. Code Style Rules

### 3.1 Import Ordering

Imports must be organized in the following order:

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

### 3.2 Function Heading Format

All functions must have a heading comment in this format:

```typescript
//------This Function handles the [Purpose]---------
function handleUserLogin(credentials: Credentials): Promise<User> {
    const response = await authService.login(credentials);
    return response.user;
}
```

### 3.3 Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `LoginScreen`, `AuraLogo` |
| Functions/variables | camelCase | `handleLogin`, `userData` |
| Constants | camelCase or UPPER_SNAKE_CASE | `maxRetries`, `API_BASE_URL` |
| Files | camelCase | `authContext.tsx`, `useFaceRecognition.ts` |

### 3.4 AI-Sounding Names Prohibited

Code must not contain generic AI-sounding variable or function names. Use human-like, descriptive names that reflect actual purpose.

**Avoid:**
- `processData`, `handleClick`, `getInfo`, `doSomething`

**Use instead:**
- `fetchPatientReminders`, `navigateToCaregiverDashboard`, `updateMedicationStatus`

---

## 4. State Management Rules

### 4.1 React Context

Use React Context for global state that affects multiple components:

- **AuthContext** - User authentication state
- **AuraConnectionContext** - Raspberry Pi connection status
- **PreferencesContext** - User preferences and settings

### 4.2 Local State

Use `useState` for component-specific state that does not need to be shared across the application.

---

## 5. Navigation Rules

### 5.1 Navigation Library

Use **expo-router** for all navigation in the application.

### 5.2 Route Groups

Organize routes using the following groups:

| Group | Purpose |
|-------|---------|
| `(auth)` | Authentication screens (login, register) |
| `(patient)` | Patient-facing screens |
| `(caregiver)` | Caregiver-facing screens |
| `(onboarding)` | Onboarding flow |
| `(admin)` | Admin screens |

---

## 6. Change Tracking

All changes made by the AI agent must be tracked in `agent/Agent.md` with timestamps. The agent folder must **NOT** be pushed to git.

Example entry:
```
## 2026-02-28 14:30
- Updated patient dashboard UI components
- Fixed medication reminder bug
```

---

## 7. Pull Request Rules

### 7.1 Authorized PR Submitters

Only the following contributors may submit Pull Requests to the frontend:

- **Deon**
- **Christopher Joshy**

### 7.2 PR Requirements

- All Pull Requests must follow the commit message format defined in `rules/Rules.md`
- PRs must be reviewed before merging
- Commit reports must be placed in `commits/reports/report<id>.md`

### 7.3 Commit Message Format

```
<type>(<scope>): <description> #<report_id>
```

Example:
```
feat(ui): refined and fully functional patient dashboard #41
```

---

## 8. Type Safety

- Always use TypeScript types; avoid `any` when possible
- Define interfaces for complex objects
- Use generics where appropriate for reusable components

---

## 9. Error Handling

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

---

*Last updated: February 2026*
