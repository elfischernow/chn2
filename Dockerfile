# syntax=docker/dockerfile:1.7

# ─────────────── deps ───────────────
FROM node:20-alpine AS deps

ARG CI_SERVER_HOST
ARG CI_JOB_TOKEN

WORKDIR /app

RUN apk add --no-cache libc6-compat git python3 make g++

# Private GitLab registry for @changenow/* packages.
# Token is wired in via build args so it never lands in an image layer
# beyond `deps` (we delete the file before this stage finishes).
RUN echo "@changenow:registry=https://${CI_SERVER_HOST}/api/v4/packages/npm/" > .npmrc \
 && echo "//${CI_SERVER_HOST}/api/v4/packages/npm/:_authToken=${CI_JOB_TOKEN}" >> .npmrc

COPY package.json package-lock.json* ./

RUN npm ci

RUN rm -f .npmrc


# ─────────────── builder ───────────────
FROM node:20-alpine AS builder

ARG CI_SERVER_HOST
ARG CI_JOB_TOKEN
ARG CONTENT_API_BASEURL

WORKDIR /app

ENV NODE_ENV=production
ENV CONTENT_API_BASEURL=${CONTENT_API_BASEURL}

RUN echo "@changenow:registry=https://${CI_SERVER_HOST}/api/v4/packages/npm/" > .npmrc \
 && echo "//${CI_SERVER_HOST}/api/v4/packages/npm/:_authToken=${CI_JOB_TOKEN}" >> .npmrc

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# `npm run build` runs:
#   1. prebuild → scripts/copy-kit-assets.mjs (kit SVGs → public/)
#   2. build:i18n → scripts/fetch-i18n.mjs (Strapi → lib/server/i18n/*.json)
#   3. next build (Turbopack, output: 'standalone')
RUN npm run build

RUN rm -f .npmrc


# ─────────────── runner ───────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Keep telemetry off in container builds.
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache libc6-compat \
 && addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 --ingroup nodejs nextjs

# Next standalone output bundles only what the runtime needs.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
