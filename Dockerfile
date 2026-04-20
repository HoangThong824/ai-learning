# ===== STAGE 1: BUILD FRONTEND =====
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# ===== STAGE 2: RUN NGINX =====
FROM nginx:alpine

# Copy build result from Stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]