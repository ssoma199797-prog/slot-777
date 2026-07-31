# Optional: only needed if you deploy to a container platform (Cloud Run, Fly, Koyeb).
# Render's native Node runtime does not need this file.
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/server.cjs"]
