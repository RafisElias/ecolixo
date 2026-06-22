FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml .npmrc ./
RUN pnpm install --no-frozen-lockfile --ignore-scripts
RUN pnpm rebuild esbuild
COPY . .
EXPOSE 5173
CMD pnpm install --no-frozen-lockfile --ignore-scripts --config.confirmModulesPurge=false && pnpm rebuild esbuild && pnpm dev
