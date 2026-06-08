# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, so they
# must be present during `next build` — passing them as runtime env vars only
# is too late. Pass via `docker build --build-arg NEXT_PUBLIC_API_URL=...` or
# Compose `args:` so the value is baked into the production bundle.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Install git (needed by some postinstall scripts)
RUN apk add --no-cache git

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.26.0 --activate

# Copy workspace manifests and turbo config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/web ./apps/web

# Install dependencies — skip prepare script (lefthook) since there's no git repo
# Use --prefer-offline to allow pnpm to re-resolve workspace packages if lockfile is stale
RUN pnpm install --prefer-offline --ignore-scripts

# Build using turbo (respects dependsOn: ["^build"] to build workspace deps first)
# Clear turbo local cache to ensure fresh build
RUN rm -rf node_modules/.cache/turbo && \
    pnpm turbo build --filter=@resubuild/web

# Stage 2: Runtime
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

# Install pnpm and curl (for healthcheck)
RUN corepack enable && corepack prepare pnpm@10.26.0 --activate && \
    apk add --no-cache curl

# Copy all workspace manifests needed for pnpm to resolve workspace protocol
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps ./apps

# Fresh production install — pnpm will re-link workspace packages correctly for this location
# --ignore-scripts skips prepare/validate hooks that require git
RUN pnpm install --prod --ignore-scripts

# Copy built Next.js artifacts
COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/public ./public

EXPOSE 3000

CMD ["pnpm", "--filter", "@resubuild/web", "start"]
