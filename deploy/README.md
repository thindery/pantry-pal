# Deploy — mypantryhub.com on OVH

See [CUTOVER.md](./CUTOVER.md) for the full production checklist.

```bash
./deploy/deploy-docker.sh <tag>
```

Needs SSH `ovh`, shared `app-network`, and the central nginx stack at `/opt/nginx/`.

## Compose project (shared-host safety)

OVH runs many apps on one Docker host. Always use project name **`pantry-pal`**:

- `name: pantry-pal` in the repo-root `docker-compose.yml`
- `docker compose -p pantry-pal …` on every pantry-pal compose invocation

Never default to a generic project label such as `deploy` (the directory name). Never `--remove-orphans` on `up` or `down` — other stacks must not be swept. Routine deploy must not run `docker compose down -v` or volume prune.
