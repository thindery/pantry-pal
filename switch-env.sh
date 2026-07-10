#!/bin/bash
# Switch between dev and prod environment configurations in the project root

ENV=$1

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

if [ "$ENV" = "dev" ] || [ "$ENV" = "development" ]; then
    ln -sf .env.dev .env
    echo "Switched to DEVELOPMENT environment (.env -> .env.dev)"
elif [ "$ENV" = "prod" ] || [ "$ENV" = "production" ]; then
    ln -sf .env.prod .env
    echo "Switched to PRODUCTION environment (.env -> .env.prod)"
else
    echo "Usage: $0 [dev|prod]"
    echo "Example: $0 dev"
    exit 1
fi