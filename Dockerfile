FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 checker
COPY --from=build --chown=checker:nodejs /app/package*.json ./
COPY --from=build --chown=checker:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=checker:nodejs /app/.next ./.next
RUN mkdir -p /app/data/audits && chown -R checker:nodejs /app/data
USER checker
EXPOSE 3000
CMD ["npm", "start"]
