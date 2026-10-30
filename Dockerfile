FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends python3 python3-venv tzdata && rm -rf /var/lib/apt/lists/* \
    && python3 -m venv /opt/venv
COPY backend/requirements.txt /tmp/requirements.txt
RUN /opt/venv/bin/pip install --no-cache-dir -r /tmp/requirements.txt
COPY --from=builder /app /app
CMD ["/opt/venv/bin/python", "backend/launch.py"]
