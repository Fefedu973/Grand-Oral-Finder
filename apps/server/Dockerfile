FROM oven/bun:1.4.5-alpine@sha256:da816670775f4c2b4e990b6b1847cf5540dcdc721a42033dd331ce7a88ba6a3b AS base
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
