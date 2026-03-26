FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runner
WORKDIR /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/out ./
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
