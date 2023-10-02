#syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS builder

RUN addgroup -S node \
    && adduser -S node -G node

WORKDIR /tmp/
COPY ./src/ ./src/
COPY ./package.json ./
COPY ./tsconfig.json ./
COPY ./.env ./
#Install all dependencies
RUN npm install --ignore-scripts
RUN npm install -g typescript --ignore-scripts
RUN tsc
RUN rm -rf /tmp/src/ && \
    mv ./build/* ./ && \
    rm -rf /tmp/build/ && \
    mkdir /app/ && \
    cp --parents -R ./* /app/ && \
    rm -rf /tmp/

RUN chown -R node:node /app
USER node
EXPOSE 7000
ENTRYPOINT ["node", "/app/index.js"]  