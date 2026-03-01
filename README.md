# MLB App — Monorepo

A full-stack application for viewing historical and current MLB data.

## Structure

```
/
├── backend/          ← FastAPI backend
└── frontend/         ← Angular 17+ frontend
```

## Quick Start

### Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install the baseball-api wrapper in editable mode + backend deps
pip install -e <path_to_baseball-api_wrapper> ([text](https://github.com/pyerra27/baseball-api))
pip install -r requirements.txt

# Run the dev server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm start
```

### Running Backend Tests

```bash
cd backend
pytest
```
