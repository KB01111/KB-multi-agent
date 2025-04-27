FROM python:3.11-slim AS base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    POETRY_HOME="/opt/poetry" \
    POETRY_VIRTUALENVS_IN_PROJECT=true \
    POETRY_NO_INTERACTION=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN curl -sSL https://install.python-poetry.org | python3 -
ENV PATH="$POETRY_HOME/bin:$PATH"

# Set working directory
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY pyproject.toml poetry.lock* ./

# Install dependencies using poetry
RUN mkdir -p mcp_agent && \
    touch mcp_agent/__init__.py && \
    poetry config virtualenvs.in-project true && \
    poetry install --without dev --no-interaction --no-ansi

# Install dependencies using poetry without adding conflicting packages
# We'll use the dependencies already defined in pyproject.toml

# Development image
FROM base AS development
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

# Copy application code
COPY . .

# Expose port
EXPOSE 8124

# Start the application in development mode
CMD ["poetry", "run", "custom-server"]

# Production image
FROM base AS production
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

# Copy application code
COPY . .

# Expose port
EXPOSE 8124

# Start the application in production mode
CMD ["poetry", "run", "custom-server"]
