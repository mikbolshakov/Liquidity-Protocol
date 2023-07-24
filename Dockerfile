FROM node:18
WORKDIR /app

ENV DEBIAN_FRONTEND=noninteractive
RUN apt update && apt install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*

RUN pip3 install requests
RUN pip3 install slither-analyzer

COPY yarn.lock .
COPY package.json .

RUN yarn install --ignore-engines

COPY . .
RUN yarn compile
# Explicitly specify entrypoint in docker compose
