FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock* turbo.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/twilio-mock/package.json apps/twilio-mock/package.json
COPY apps/frontend/package.json apps/frontend/package.json

RUN bun install --frozen-lockfile

COPY . .

WORKDIR /app/apps/worker

CMD ["bun", "run", "dev"]
