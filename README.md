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

Requires the [baseball-api-wrapper](https://github.com/pyerra27/baseball-api-wrapper) — clone it alongside this repo first.

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install the baseball-api-wrapper and backend dependencies
pip install -e <path_to_baseball-api-wrapper>
pip install -e .

# Run the dev server (available at http://localhost:8000)
uvicorn app.main:app --reload --port 8000
```

To install test dependencies as well:

```bash
pip install -e ".[dev]"
```

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
