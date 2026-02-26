# 前端 Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
ARG VITE_API_BASE_URL=/api
ARG VITE_GRAPHQL_URL=/graphql
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GRAPHQL_URL=$VITE_GRAPHQL_URL
COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com && \
    npm install && \
    npm cache clean --force
COPY . .
RUN npx vite build

FROM nginx:alpine AS production
RUN apk add --no-cache curl
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
