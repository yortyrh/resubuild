# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Install git (needed by some postinstall scripts)
RUN apk add --no-cache git

# Install pnpm
RUN corepack enable && corepack prepare pnpm@11.8.0 --activate

# Copy workspace manifests and turbo config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/api ./apps/api
COPY apps/import-agent ./apps/import-agent

# Install dependencies — skip prepare script (lefthook) since there's no git repo
# Use --prefer-offline to allow pnpm to re-resolve workspace packages if lockfile is stale
RUN pnpm install --prefer-offline --ignore-scripts

# Build using turbo (dependsOn: ["^build"] builds workspace package deps first)
# @resubuild/import-agent is in apps/ so we explicitly include it along with api
# Clear turbo local cache to ensure fresh build
RUN rm -rf node_modules/.cache/turbo && \
    pnpm turbo build --filter=@resubuild/api --filter=@resubuild/import-agent && \
    pnpm --filter=@resubuild/api exec -- tsc --build --force

# Stage 2: Runtime
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

# Install curl (for healthcheck), git (for workspace resolution), and
# chromium-headless-shell (~181 MiB vs ~750 MiB for full chromium).
# This is the minimal headless-only build — no GUI, no full browser shell.
RUN apk add --no-cache curl git chromium-headless-shell

# Point Puppeteer at the headless shell and skip its own Chrome download.
# The headless shell is a minimal Chromium binary optimized for server-side rendering.
ENV CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-headless-shell
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Install pnpm
RUN corepack enable && corepack prepare pnpm@11.8.0 --activate

# Copy all workspace manifests needed for pnpm to resolve workspace protocol
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps ./apps

# Fresh production install — pnpm will re-link workspace packages correctly for this location
# --ignore-scripts skips prepare/validate hooks that require git
RUN pnpm install --prod --ignore-scripts

EXPOSE 3000

CMD ["node", "apps/api/dist/main"]
