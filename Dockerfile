# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Setup Backend
FROM python:3.12-slim
WORKDIR /app

# Install uv
RUN pip install uv

# Copy backend
COPY backend/ ./backend/
WORKDIR /app/backend
RUN uv sync

# Copy frontend build
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Set environment
ENV PORT=8000
EXPOSE 8000

# Start server
CMD ["uv", "run", "uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
