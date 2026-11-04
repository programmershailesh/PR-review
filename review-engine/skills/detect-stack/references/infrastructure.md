# Infrastructure and CI

**Containers**: running as root; unpinned base images; secrets in layers or build args; a poor layer order that ruins cache; no `.dockerignore`.

**Kubernetes**: no resource requests or limits; missing or misleading readiness probes; no `PodDisruptionBudget` on critical services; config changes that do not trigger a rollout.

**Terraform**: changes that force replacement of stateful resources; broad IAM such as `*`; public exposure; unpinned providers; secrets in state or variables.

**CI**: third-party actions not pinned to a commit SHA; `pull_request_target` running untrusted code; secrets exposed to fork builds; excessive token permissions; caches poisoned across trust levels.

**Rollout**: no rollback path; changes applied to all environments at once; missing alerts for the new failure mode.
