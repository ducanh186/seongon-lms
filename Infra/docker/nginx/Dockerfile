FROM node:22-alpine AS frontend-build

WORKDIR /frontend

COPY FE/DEMO/package.json FE/DEMO/package-lock.json ./
RUN npm ci

COPY FE/DEMO/ ./

ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

FROM nginx:1.28-alpine AS runtime

COPY Infra/docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /frontend/dist/ /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
    CMD wget -q -O - http://127.0.0.1/healthz | grep -q '^ok$' || exit 1
