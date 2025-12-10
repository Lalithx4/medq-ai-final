# Production Dockerfile for Railway
FROM node:20-alpine AS base

# Add libc6-compat for some node modules
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Use pnpm via corepack
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.17.0 --activate

# Install dependencies first (better caching)
COPY package.json pnpm-lock.yaml* ./
# Ensure prisma schema is available for postinstall (prisma generate)
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

# Copy the rest of the app
COPY . .

# Prisma generate (needed at build-time for @prisma/client)
RUN pnpm prisma generate

# Build Next.js app
ENV SKIP_ENV_VALIDATION=1
RUN pnpm build

# Expose port (Railway sets PORT env)
EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

# Start the app; migrations are handled by Railway postDeploy (see railway.toml)
CMD ["pnpm", "start"]
