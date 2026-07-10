#!/bin/bash
# SSH-based Docker deployment for PantryPal (OVH)
# Live cutover: PP-034 (requires domain PP-033)

set -e

LOCK_FILE="/tmp/pantry-pal-deploy.lock"
TAG=$1

if [ -z "$TAG" ]; then
    echo "Usage: $0 <tag>"
    echo "Example: $0 main"
    exit 1
fi

echo "Deploying pantry-pal at version $TAG to OVH server..."

ssh ovh "
  if [ -f '$LOCK_FILE' ]; then
    LOCK_PID=\$(cat '$LOCK_FILE' 2>/dev/null || echo '')
    if [ -n \"\$LOCK_PID\" ] && kill -0 \"\$LOCK_PID\" 2>/dev/null; then
      echo 'Deploy already in progress (PID \$LOCK_PID).'
      exit 1
    else
      rm -f '$LOCK_FILE'
    fi
  fi

  echo \$\$ > '$LOCK_FILE'
  trap 'rm -f $LOCK_FILE' EXIT

  cd /opt/pantry-pal &&
  git fetch origin &&
  (git checkout -B $TAG origin/$TAG 2>/dev/null || git checkout $TAG) &&
  export BUILD_ID=\$(git rev-parse --short HEAD) &&
  echo \"Build ID: \$BUILD_ID\" &&
  docker compose build &&
  docker compose up -d &&
  echo 'Waiting for health checks...' &&
  for i in \$(seq 1 30); do
    if docker compose ps --format json | grep -q '\"Health\":\"healthy\"'; then
      echo 'Services healthy.'
      break
    fi
    sleep 2
  done &&
  docker compose ps
"

echo "Deploy complete: $TAG"