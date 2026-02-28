# Backend Module Rules

This document contains module-specific rules for the Backend (Python FastAPI) module of A.U.R.A. All rules from the master `rules/Rules.md` file apply to this module as well.

---

## 1. Global Rules Reference

All contributors and AI agents must adhere to the rules defined in `rules/Rules.md`. This includes:

- No comments in code (only function headings)
- Using the latest versions of tools and packages
- Tracking all changes in `agent/Agent.md`
- Following the commit message format
- Writing human-like code without AI patterns
- Using appropriate naming conventions
- Verifying code before pushing

---

## 2. Authorized Contributors

| Name | Access Level |
|------|--------------|
| **Kuriyan** | Backend, Aura Module |
| **Binshid** | Backend only |
| **Christopher Joshy** | Full access (via AI agent) |

Only the contributors listed above may submit Pull Requests for the Backend module.

---

## 3. Technology Stack

### Core Framework
- **FastAPI** - Modern Python web framework
- **Uvicorn** - ASGI server for running FastAPI applications

### Database
- **MongoDB** - Primary database
- **Beanie** - Asynchronous ODM for MongoDB
- **PyMongo** - MongoDB driver for Python

### Authentication
- **Firebase Admin SDK** - Authentication and authorization

### Additional Packages
- **Pydantic** - Data validation using Python type hints
- **Pydantic-settings** - Settings management
- **WebSockets** - Real-time communication

---

## 4. Code Style Rules

### 4.1 Import Ordering

Imports must be organized in the following order:

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

### 4.2 Function Headings

Every function must have a heading comment in this format:

```python
#------This Function handles the [Purpose]---------
def verify_user_credentials(token: str) -> Optional[User]:
    # implementation
```

### 4.3 Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Classes | PascalCase | `UserModel`, `AuthService` |
| Functions | snake_case | `get_user_by_id`, `verify_credentials` |
| Variables | snake_case | `user_data`, `auth_token` |
| Files | snake_case | `auth_service.py`, `user_models.py` |
| Constants | UPPER_SNAKE_CASE | `MAX_LOGIN_ATTEMPTS` |

### 4.4 Type Hints

- Use Python type hints for all function arguments and return types
- Use `Optional[X]` instead of `X | None` for compatibility
- Use `Union[X, Y]` for multiple types
- Import types from the `typing` module

---

## 5. Route Naming Conventions

### 5.1 RESTful Endpoints

Follow REST principles with proper HTTP methods:

| Method | Usage | Example |
|--------|-------|---------|
| GET | Retrieve resources | `GET /users` |
| POST | Create new resources | `POST /users` |
| PUT | Update entire resource | `PUT /users/{id}` |
| PATCH | Partial update | `PATCH /users/{id}` |
| DELETE | Remove resources | `DELETE /users/{id}` |

### 5.2 Router Structure

Use FastAPI routers with appropriate prefixes:

```python
from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/users", tags=["users"])

@router.get("/")
async def get_users():
    pass
```

---

## 6. Schema and Model Conventions

### 6.1 Pydantic Models

Use Pydantic v2 `BaseModel` for request/response schemas:

```python
from pydantic import BaseModel, field_validator

class UserCreate(BaseModel):
    email: str
    password: str
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        if '@' not in v:
            raise ValueError('Invalid email format')
        return v
```

### 6.2 Beanie Documents

Use Beanie documents for MongoDB models:

```python
from beanie import Document
from pydantic import EmailStr
from datetime import datetime

class User(Document):
    email: EmailStr
    created_at: datetime = datetime.utcnow()
    
    class Settings:
        name = "users"
```

---

## 7. Database Rules

### 7.1 Beanie ODM Usage

- Use Beanie for all MongoDB operations
- Always use async/await patterns
- Initialize the ODM properly in the application startup

### 7.2 Indexing

Create indexes for frequently queried fields:

```python
class User(Document):
    email: EmailStr
    
    class Settings:
        name = "users"
        indexes = ["email"]
```

### 7.3 Connection Management

Handle database connections properly:

```python
async def startup_event():
    await init_beanie(database=client.database_name)

async def shutdown_event():
    await close_beanie()
```

---

## 8. PR Submission Rules

### 8.1 Authorized Submitters

Only the following contributors may submit Pull Requests for the Backend module:
- Kuriyan
- Binshid
- Christopher Joshy (via AI agent)

### 8.2 Pre-Submission Checklist

Before submitting a Pull Request:

1. Run linting tools:
   ```bash
   flake8 app/
   black --check app/
   mypy app/
   ```

2. Ensure all tests pass (if applicable)
3. Verify code follows naming conventions
4. Check that function headings are present

### 8.3 Commit Message Format

All commits must follow the format specified in `rules/Rules.md`:

```
<type>(<scope>): <description> #<report_id>
```

Example:
```
feat(api): added patient profile endpoints #41
```

---

## 9. Change Tracking

All changes made by AI agents to the Backend module must be tracked in `agent/Agent.md` with timestamps. The attribution should be:

```
## [timestamp]
- Description of changes
- Files modified
```

---

## 10. Code Authenticity

All code must feel human-written. Avoid generic AI-sounding names like:
- `process_data`, `handle_click`, `get_info`, `do_something`

Use descriptive, specific names that reflect the actual purpose.

---

*Last updated: February 2026*
