# ---- Builder stage ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json tsconfig.json next-env.d.ts ./
COPY lib ./lib
COPY pages ./pages
RUN npm ci && npm run build

# ---- Runtime stage ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./

RUN npm ci --only=production
EXPOSE 3000
CMD ["npm", "start"]
