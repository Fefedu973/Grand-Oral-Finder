FROM oven/bun:1.3.14-alpine AS base
WORKDIR /app
ENV SKIP_ENV_VALIDATION=1

RUN apk add --no-cache libc6-compat

COPY . .
RUN --mount=type=cache,target=/root/.bun/install/cache bun install

ENV NODE_ENV=production
RUN cd apps/server && bun run build
ENV SKIP_ENV_VALIDATION=

EXPOSE 3000

WORKDIR /app/apps/server
CMD ["sh", "-c", "bun --cwd /app/packages/db db:migrate && exec bun dist/index.mjs"]
