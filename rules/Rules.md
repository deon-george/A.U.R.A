# A.U.R.A Project Rules

This document outlines the master rules and guidelines for developing the A.U.R.A (Assistive User Reminder App) project. All contributors and AI agents must adhere to these rules.

---

## 1. Development Rules

### 1.1 No Comments in Code

Only add function headings above functions. Do not add inline implementation comments.

**TypeScript Example:**
```typescript
//------This Function handles the Auth---------
function handleUserLogin(credentials: Credentials): Promise<User> {
    const response = await authService.login(credentials);
    return response.user;
}
```

**Python Example:**
```python
#------This Function handles the Auth---------
def verify_user_credentials(token: str) -> Optional[User]:
    user = await TokenService.validate(token)
    return user
```

### 1.2 Always Use the Latest Version

Use the latest stable versions of all tools and packages. Check for updates before starting new development tasks.

### 1.3 Keep Track of All Changes

All changes made by AI agents must be logged in `agent/Agent.md` with timestamps. The agent folder must **NOT** be pushed to git.

Example entry:
```
## 2026-02-28 14:30
- Updated login screen UI components
- Fixed authentication flow bug
```

### 1.4 Commit Messages Format

All commit messages must follow this format:
```
<type>(<scope>): <description> #<report_id>
```

Example:
```
feat(ui): refined and fully functional overview page #41
```

- The `#<report_id>` corresponds to a detailed report in `commits/reports/report<id>.md`
- The commits folder **MUST** be pushed to the repository

### 1.5 Code Must Not Feel AI-Generated

Write code that feels human-written. Avoid generic AI patterns and names like:
- `processData`, `handleClick`, `getInfo`, `doSomething`

Use descriptive, specific names that reflect actual purpose.

### 1.6 Use Human-Like Variable and Function Names

- **TypeScript**: `camelCase` for variables/functions, `PascalCase` for components
- **Python**: `snake_case` for variables/functions, `PascalCase` for classes

### 1.7 No AI Evidence

Anything that proves the codebase is AI-made must NOT be pushed, including:
- `agent/` folder
- `.agent/` folders
- Any AI-generated documentation or comments

### 1.8 Verify Before Pushing

Always check code for errors and ask the user to verify design/code before pushing. The user must explicitly say "no issues with the implementations" before proceeding.

### 1.9 Human-Like Commits

- Avoid massive commits (3000+ lines)
- Avoid many small commits at once (12+ in a row)
- Make commits that feel natural and human-made

### 1.10 Create Required Directories

Always create the following directories when needed:
- `agent/` - For tracking AI agent changes
- `commits/` - For commit reports
- Add `agent/` to `.gitignore`

### 1.11 Refer to Reference Directories

Before making code or editing any file, always refer to the Reference directories in the project if they exist.

---

## 2. Pull Request Rules

### 2.1 Always Send a Pull Request

Do not push directly to the main branch unless explicitly instructed by the user. Always create a pull request for review.

### 2.2 Confirm Before Pushing

Always confirm with the user whether they want to:
- Push directly to the repository, or
- Send a Pull Request for review

---

## 3. Change Tracking

### 3.1 Agent Attribution

All changes made by AI agents are tracked under the name **Christopher Joshy** in the reports.

### 3.2 Report File Location

Report files must be placed in the `commits/` folder with the following format:
```
commits/reports/report<id>.md
```

Example: `commits/reports/report41.md`

---

## 4. Contribution Access

### 4.1 Owner

| Name | Access Level |
|------|--------------|
| **Christopher Joshy (Chriss)** | Full access. Only accepts Pull Requests based on the contribution list below |

### 4.2 Contributors

| Name | Allowed Modules |
|------|-----------------|
| **Deon** | Frontend, Aura Module |
| **Kuriyan** | Backend, Aura Module |
| **Binshid** | Backend only |

### 4.3 Pull Request Requirements

- Contributors may only submit Pull Requests to their assigned modules
- All Pull Requests must be reviewed and approved by **Christopher Joshy (Chriss)** before merging
- Any Pull Request outside a contributor's assigned scope will be rejected

---

## 5. Code Style Guidelines

### 5.1 TypeScript (Frontend)

```typescript
// Import order:
// 1. React/React Native core
// 2. Expo packages
// 3. Third-party libraries
// 4. Local components/contexts
// 5. Theme/constants
```

### 5.2 Python (Backend & Aura Module)

```python
# Import order:
# 1. Standard library
# 2. Third-party packages
# 3. Local application imports
```

---

*Last updated: February 2026*
