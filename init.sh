#!/bin/bash

# Gather configuration details for application
read -p "Container name: " container_name
read -p "External port: " external_port

# Generate the required yaml file and build the container
echo "services:
  $container_name:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: $container_name
    restart: unless-stopped
    env_file: .env
    ports:
      - \"$external_port:8080\"
    volumes:
      - .:/usr/src/app
      - node_modules:/usr/src/app/node_modules
      - .data:/usr/src/app/.data

volumes:
  .data:
  node_modules:" >> docker-compose.yml

docker compose build
docker compose up -d
