# MLB App — Monorepo

A full-stack application for viewing historical and current MLB data.

## Structure

```
/
├── backend/          ← FastAPI REST API
└── frontend/         ← React 18 + Vite frontend
```

## Quick Start

### Backend

Requires Python 3.14. The [baseball-api-wrapper](https://pypi.org/project/baseball-api-wrapper/) is installed from PyPI along with the other dependencies.

```bash
cd backend

# Create and activate a virtual environment
python3.14 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install the locked dependencies and the backend (add [dev] for test tools)
pip install -r requirements.lock -e ".[dev]"

# Run the dev server (available at http://localhost:8000)
uvicorn app.main:app --reload --port 8000
```

#### Updating dependencies

Direct dependencies are pinned in `pyproject.toml`; `requirements.lock` pins everything they pull in, and is what Render installs. After changing a version in `pyproject.toml`, regenerate the lock from a clean environment and run the tests:

```bash
cd backend
python3.14 -m venv /tmp/lock-venv
/tmp/lock-venv/bin/pip install .
/tmp/lock-venv/bin/pip freeze --exclude mlb-app-backend > requirements.lock
rm -rf /tmp/lock-venv
```

If the lock and `pyproject.toml` disagree on a version, `pip install -r requirements.lock -e .` fails with a conflict, so a stale lock is caught at build time.

### Frontend

```bash
cd frontend
npm install
npm run dev  # available at http://localhost:5173
```

### Running Backend Tests

```bash
cd backend
pytest
```
