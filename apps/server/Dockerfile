FROM oven/bun:1.4.4-alpine@sha256:4cf82f5686b196504fe119db3fcd9185b191f82ece82c40680e597228ec6070a AS base
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
