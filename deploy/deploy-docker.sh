#!/bin/bash
# SSH-based Docker deployment for PantryPal (OVH) — aligned with agent-paige / userkudos
# Live cutover: PP-034

set -e

TAG=$1
if [ -z "$TAG" ]; then
    echo "Usage: $0 <tag>"
    echo "Example: $0 main"
    exit 1
fi

LOCAL_LOCK="/tmp/pantry-pal-deploy-local.lock"
if [ -f "$LOCAL_LOCK" ]; then
    LOCK_PID=$(cat "$LOCAL_LOCK" 2>/dev/null || echo '')
    if [ -n "$LOCK_PID" ] && kill -0 "$LOCK_PID" 2>/dev/null; then
        echo "Local deploy already in progress (PID $LOCK_PID). Aborting."
        exit 1
    fi
    rm -f "$LOCAL_LOCK"
fi
echo $$ > "$LOCAL_LOCK"
trap 'rm -f "$LOCAL_LOCK"' EXIT

echo "Deploying pantry-pal version $TAG to OVH server..."

ssh ovh "
  set -e

  LOCK_FILE='/tmp/pantry-pal-deploy.lock'
  LOG_DEPLOY='/home/thindery/ovh-server-ops/scripts/log-deploy.sh'
  REMOTE_DIR='/opt/pantry-pal'
  REPO_URL='git@github.com:thindery/pantry-pal.git'
  DEPLOY_START=\$(date +%s)
  DEPLOY_SITE='pantry-pal'
  DEPLOY_TAG='$TAG'

  if [ -f \"\$LOCK_FILE\" ]; then
    LOCK_PID=\$(cat \"\$LOCK_FILE\" 2>/dev/null || echo '')
    if [ -n \"\$LOCK_PID\" ] && kill -0 \"\$LOCK_PID\" 2>/dev/null; then
      echo 'Deploy already in progress on server (PID '\$LOCK_PID'). Aborting.'
      exit 1
    fi
    rm -f \"\$LOCK_FILE\"
  fi
  echo \$\$ > \"\$LOCK_FILE\"
  trap 'rm -f \$LOCK_FILE' EXIT

  log_deploy_event() {
    local status=\"\$1\"
    local message=\"\$2\"
    local duration=\$(( \$(date +%s) - DEPLOY_START ))
    local git_sha
    git_sha=\$(git -C \"\$REMOTE_DIR\" rev-parse HEAD 2>/dev/null || echo unknown)
    \"\$LOG_DEPLOY\" \
      --site \"\$DEPLOY_SITE\" \
      --tag \"\$DEPLOY_TAG\" \
      --git-sha \"\$git_sha\" \
      --status \"\$status\" \
      --deployed-by \"\$USER\" \
      --duration-seconds \"\$duration\" \
      --message \"\$message\" 2>/dev/null || true
  }

  on_deploy_failure() {
    local exit_code=\$?
    log_deploy_event failure \"Deploy failed (exit \$exit_code)\"
    echo 'Deploy failed — attempting to restore running containers...'
    # Unique project name pantry-pal — never default \"deploy\" from working_dir.
    # Do NOT use --remove-orphans (can sweep siblings sharing a project label).
    cd \"\$REMOTE_DIR\" 2>/dev/null && docker compose -p pantry-pal up -d 2>/dev/null || true
    exit \"\$exit_code\"
  }
  trap on_deploy_failure ERR

  if [ ! -d \"\$REMOTE_DIR/.git\" ]; then
    echo 'Bootstrapping \$REMOTE_DIR (first deploy)...'
    if [ -d \"\$REMOTE_DIR\" ] && [ \"\$(ls -A \"\$REMOTE_DIR\" 2>/dev/null)\" ]; then
      ENV_BACKUP=\"/tmp/pantry-pal-env.prod.bak\"
      [ -f \"\$REMOTE_DIR/.env.prod\" ] && cp \"\$REMOTE_DIR/.env.prod\" \"\$ENV_BACKUP\"
      git clone \"\$REPO_URL\" \"\$REMOTE_DIR\"
      [ -f \"\$ENV_BACKUP\" ] && mv \"\$ENV_BACKUP\" \"\$REMOTE_DIR/.env.prod\"
    else
      git clone \"\$REPO_URL\" \"\$REMOTE_DIR\"
    fi
  fi

  docker network inspect app-network >/dev/null 2>&1 || docker network create app-network

  cd \"\$REMOTE_DIR\" &&
  echo 'Fetching origin...' &&
  git fetch origin &&
  rm -f .env &&
  git checkout -f -B $TAG origin/$TAG &&
  git reset --hard origin/$TAG &&
  ln -sf .env.prod .env &&

  # --- Ralph Compliance Check ---
  echo 'Checking Ralph compliance...' &&
  DEPLOYED_COMMIT=\$(git rev-parse HEAD) &&
  DEPLOYED_MSG=\$(git log -1 --pretty=format:'%s' \$DEPLOYED_COMMIT) &&
  echo \"  Commit: \$DEPLOYED_COMMIT\" &&
  echo \"  Message: \$DEPLOYED_MSG\" &&
  if echo \"\$DEPLOYED_MSG\" | grep -qE \"^(PP-[0-9]+|PP-XXX):\s+.+\"; then
    TICKET=\$(echo \"\$DEPLOYED_MSG\" | grep -oE \"PP-[0-9]+|PP-XXX\" | head -1) &&
    echo \"  ✅ Ralph: Deploy references \$TICKET\"
  elif [ \"\$TAG\" = \"main\" ] || echo \"\$TAG\" | grep -qE \"^(hotfix|release)\"; then
    echo \"  ✅ Ralph: Tag '\$TAG' is an exception\"
  else
    echo \"  ⚠️  Ralph warning: Commit message should reference ticket (PP-XXX: description)\"
  fi &&

  echo 'Cleaning leftover pantry-pal compose names only...' &&
  docker ps -a --format '{{.Names}}' | grep '_pantry-pal' | xargs -r docker rm -f 2>/dev/null || true &&

  export BUILD_ID=\$(git rev-parse --short HEAD) &&
  export COMPOSE_PROJECT_NAME=pantry-pal &&
  echo \"Build ID: \$BUILD_ID\" &&
  # Unique project name pantry-pal — never default \"deploy\" from working_dir.
  # Do NOT use --remove-orphans (can sweep siblings sharing a project label).
  # Do NOT use compose down -v or volume prune (wipes this app's data).
  docker compose -p pantry-pal up -d --build &&

  echo 'Running database migrations...' &&
  docker compose -p pantry-pal run --rm backend python database/migrate.py migrate &&

  echo 'Waiting for services to become healthy...' &&
  (
    for i in \$(seq 1 30); do
      HEALTH_DB=\$(docker inspect --format='{{.State.Health.Status}}' pantry-pal-db 2>/dev/null | tr -d '\"' || echo 'unknown')
      HEALTH_BE=\$(docker inspect --format='{{.State.Health.Status}}' pantry-pal-backend 2>/dev/null | tr -d '\"' || echo 'unknown')
      HEALTH_FE=\$(docker inspect --format='{{.State.Health.Status}}' pantry-pal-frontend 2>/dev/null | tr -d '\"' || echo 'unknown')
      echo \"DB: \$HEALTH_DB, Backend: \$HEALTH_BE, Frontend: \$HEALTH_FE (\$i/30)\"
      if [ \"\$HEALTH_DB\" = 'healthy' ] && [ \"\$HEALTH_BE\" = 'healthy' ] && [ \"\$HEALTH_FE\" = 'healthy' ]; then
        echo 'All services healthy.'
        exit 0
      fi
      if [ \"\$HEALTH_DB\" = 'unhealthy' ] || [ \"\$HEALTH_BE\" = 'unhealthy' ] || [ \"\$HEALTH_FE\" = 'unhealthy' ]; then
        echo 'A service became unhealthy.'
        exit 1
      fi
      sleep 2
    done
    echo 'Health check timed out.'
    exit 1
  ) &&

  echo 'Installing nginx vhost...' &&
  cp deploy/nginx/pantry-pal.conf /opt/nginx/conf.d/pantry-pal.conf &&
  cd /opt/nginx && docker compose exec -T nginx nginx -t && docker compose exec -T nginx nginx -s reload &&

  docker system prune -f &&
  docker builder prune -af --filter \"until=6h\" 2>/dev/null || true &&
  docker image prune -f &&
  log_deploy_event success 'docker compose up completed' &&
  echo 'pantry-pal deployed at $TAG — https://www.mypantryhub.com'
"

echo "Deploy complete: $TAG"