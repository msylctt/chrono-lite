# Chrono

A full-stack application with Python FastAPI backend and Next.js frontend.

## Project Structure

```
chrono/
├── backend/          # Python FastAPI backend
│   ├── main.py      # FastAPI application
│   └── pyproject.toml
└── frontend/        # Next.js frontend
    ├── app/
    └── package.json
```

## Development

### Backend

```bash
cd backend
uv run uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm run dev
```

The frontend will be available at http://localhost:3000
The backend API will be available at http://localhost:8000
