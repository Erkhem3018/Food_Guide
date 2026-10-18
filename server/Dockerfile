# Built from the repo root (see railway.json) so the server can reuse the app's
# recipe data, Nomin catalog and Mongolian strings from src/.
FROM node:22-slim
WORKDIR /app
COPY server/package.json server/package-lock.json server/
RUN cd server && npm ci --omit=dev
COPY server/*.ts server/
COPY src/data src/data
COPY src/i18n/mn.ts src/i18n/mn.ts
WORKDIR /app/server
ENV NODE_ENV=production
CMD ["node", "--import", "tsx", "index.ts"]
