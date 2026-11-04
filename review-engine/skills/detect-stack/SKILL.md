---
name: detect-stack
description: Identify the languages, frameworks and pinned versions a PR touches, and select the stack-specific review references. Use before dispatching stack-aware reviewers.
---

# Detect the stack

Review each file by the standards of its own stack. A monorepo PR can touch several stacks, so detect them per changed path, not per repository.

## Method

1. For each changed path, walk up to the nearest manifest in `head/`.
2. Read the manifest and take the framework and version actually pinned. Prefer the lockfile when the manifest gives a range.
3. Compare with the same manifest in `base/`. A version change is itself something to review.
4. Note repo tooling (linters, formatter, test framework, ORM), since it shows what is already enforced and which patterns are local.

| Manifest | Stack |
| --- | --- |
| `package.json`, `tsconfig.json` | JavaScript/TypeScript. Check dependencies for React, Next, Vue, Angular, Express, Nest, Prisma |
| `pyproject.toml`, `requirements*.txt`, `Pipfile` | Python. Check for Django, FastAPI, Flask, Celery, SQLAlchemy |
| `go.mod` | Go |
| `pom.xml`, `build.gradle*` | Java/Kotlin. Check for Spring Boot, Hibernate |
| `Cargo.toml` | Rust. Check for tokio, axum, actix |
| `*.csproj`, `*.sln` | C#/.NET. Check for ASP.NET Core, EF Core |
| `composer.json` | PHP. Check for Laravel, Symfony |
| `Gemfile` | Ruby. Check for Rails |
| `Package.swift`, `*.xcodeproj`, `pubspec.yaml`, `build.gradle` with Android plugin | Mobile |
| `*.sql`, `migrations/`, `schema.prisma` | SQL and data |
| `Dockerfile`, `*.tf`, `k8s/`, `helm/`, `.github/workflows/`, `.gitlab-ci.yml` | Infrastructure and CI |

## References

Select only the references for stacks this PR touches. Paths are relative to this skill's directory.

- `references/javascript-typescript.md`
- `references/python.md`
- `references/go.md`
- `references/java-kotlin.md`
- `references/rust.md`
- `references/dotnet.md`
- `references/php-ruby.md`
- `references/mobile.md`
- `references/sql-data.md`
- `references/infrastructure.md`

References are starting points, not limits. If no reference covers a stack, review it from what you know of that stack, and say that no reference applied.

## Output

```
STACK
- <name> <pinned version>: <paths it covers>
REFERENCES
- <absolute path to each selected reference>
TOOLING
- <linters, test framework, ORM>
```
