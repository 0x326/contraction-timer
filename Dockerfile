# syntax=docker/dockerfile:1

## Build the React frontend
FROM node:18 AS frontend-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY public ./public
COPY src ./src
ARG REACT_APP_SERVER_URL
ENV REACT_APP_SERVER_URL=$REACT_APP_SERVER_URL
RUN npm run build

## Serve the built frontend with nginx
FROM nginx:alpine AS frontend
COPY --from=frontend-build /app/build /usr/share/nginx/html
EXPOSE 80

## Node backend
FROM node:18-alpine AS backend
WORKDIR /app
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY server/ .
EXPOSE 4000
CMD ["node", "index.js"]
