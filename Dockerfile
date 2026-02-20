FROM node:20-bookworm-slim

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY scripts/docker-dev-entrypoint.sh /usr/local/bin/docker-dev-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-dev-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["docker-dev-entrypoint.sh"]
