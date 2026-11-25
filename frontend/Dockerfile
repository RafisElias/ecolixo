FROM node:22-alpine
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# Corepack usa a versão do pnpm fixada em "packageManager" no package.json.
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile --ignore-scripts && pnpm rebuild esbuild
COPY . .
EXPOSE 5173
CMD pnpm install --frozen-lockfile --ignore-scripts --config.confirmModulesPurge=false && pnpm rebuild esbuild && pnpm dev
