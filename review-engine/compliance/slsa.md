# SLSA and SBOM: code review checklist

Sources: SLSA specification v1.2, Build Track (status Approved, released 24 November 2025), https://slsa.dev/spec/v1.2/build-track-basics and https://slsa.dev/spec/v1.2/build-requirements. OpenSSF Scorecard check documentation (as of November 2026, latest release v5.7.0), https://github.com/ossf/scorecard/blob/main/docs/checks.md. OpenSSF Secure Supply Chain Consumption Framework (S2C2F) v1.1, https://github.com/ossf/s2c2f/blob/main/specification/framework.md. CISA, NSA, FBI and international partners, 2026 Minimum Elements for a Software Bill of Materials (SBOM), version 2.1 (29 July 2026), https://www.cisa.gov/resources-tools/resources/2026-minimum-elements-software-bill-materials-sbom, which replaces NTIA's The Minimum Elements for a Software Bill of Materials (12 July 2021), https://www.ntia.gov/report/2021/minimum-elements-software-bill-materials-sbom. Written in our own words.

SLSA v1.2 says it doesn't yet address dependency threats. Its Build Track sets rules for build platforms and provenance, not for how a project picks its packages or writes its workflow files. So checks about lockfiles, pinning, package sources, install scripts and workflow safety cite OpenSSF Scorecard checks and S2C2F requirements. Both come from OpenSSF, the foundation that also maintains SLSA. Never cite an SLSA level for those problems. The SLSA IDs below are the Build Track levels and the producer requirements, named as the spec names them. Cite every ID exactly as written in the headings.

The SBOM checks cite the 2026 CISA minimum elements. If a project or contract still names the 2021 NTIA list, its elements carry over under new names: Supplier Name is now Component Producer, Depth is now Coverage, Automation Support is now Machine-Processable Data, Known Unknowns is now Explicitly Identifying Unknown Information, and Access Control is now part of Distribution and Delivery.

SLSA v1.2 also adds a Source Track. Its controls, such as branch protection and required review, live in the source control platform's settings rather than in the diff, so this checklist doesn't cover them.

## When this applies

Apply these checks to changes in dependency manifests and lockfiles (such as `package.json`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `requirements.txt`, `poetry.lock`, `uv.lock`, `go.mod`, `go.sum`, `Cargo.lock`, `pom.xml`, `build.gradle` and `*.csproj`), package manager settings (`.npmrc`, `.yarnrc.yml`, `pip.conf`, `nuget.config`, Maven `settings.xml`), Dockerfiles, build and release scripts, CI/CD files (`.github/workflows/`, `.gitlab-ci.yml`, `bitbucket-pipelines.yml`, `Jenkinsfile`, `azure-pipelines.yml`), binary files added to the repository, and provenance or SBOM settings.

The provenance and SBOM checks apply only to projects that release artifacts, such as packages, container images, binaries or installers. Skip them for code that is never released as an artifact.

If the change has no dependency, build or CI changes, report this standard as `not_applicable`.

## Checks

### [OpenSSF Scorecard Pinned-Dependencies] Build and release dependencies are locked to exact versions or hashes
Look for: a manifest changed without its lockfile, a lockfile deleted or added to `.gitignore`, or CI installing with a command that ignores the lockfile, such as `npm install` instead of `npm ci`, `yarn install` without its frozen or immutable flag, or `pip install` from a requirements file with version ranges and no `--require-hashes`. GitHub Actions referenced by a tag or branch (`uses: some-org/some-action@v3` or `@main`) instead of a full 40-character commit SHA, especially third-party actions. Container images referenced by tag (`FROM node:22`, `image: python:3.12`) instead of by digest (`@sha256:...`) in Dockerfiles and CI files. CI templates from another project included by branch name instead of a fixed commit. Scripts, including `package.json` scripts such as `postinstall`, that download and run code with no checksum check, such as `curl ... | sh`, `wget ... && bash` or `irm ... | iex` in PowerShell.
Acceptable: a SHA pin with the version in a comment (`@<sha> # v4.2.0`), kept up to date by Dependabot or Renovate. Go modules at full versions, which `go.sum` verifies. A tag backed by a GitHub immutable release, which Scorecard also counts as pinned. Actions stored in the same repository (`uses: ./.github/actions/...`).
Not a breach: version ranges in a library's published manifest, as long as the repository's own lockfile pins what CI builds with.
Decided from code: yes.

### [S2C2F ENF-1] Package source settings make packages come only from the intended registries
Look for: new or changed registries in `.npmrc`, `.yarnrc.yml`, `pip.conf`, `nuget.config`, Maven `settings.xml` or `pom.xml` repositories, Gradle `repositories` blocks or Cargo config. Registry URLs over plain `http://`. TLS checks turned off, such as `strict-ssl=false` in `.npmrc` or `--trusted-host` for pip. Internal package names that could also be fetched from a public registry (dependency confusion), such as pip `--extra-index-url` mixing a private index with PyPI, internal npm packages not under a scope mapped to the private registry, or several NuGet feeds with no package source mapping. Dependencies fetched straight from git URLs, tarball URLs or personal forks instead of the registry.
Acceptable: a single upstream feed or proxy registry, scoped registries (`@company:registry=...`), NuGet package source mapping, and lockfiles that record where each package came from.
Decided from code: yes, for settings in this repository. Machine-wide or CI-level settings kept outside the repository need a person to check.

### [S2C2F SCA-4] New dependencies are screened for malicious code, especially code that runs at install time
Look for: new direct or transitive dependencies that run scripts when installed, shown in `package-lock.json` as `"hasInstallScript": true`, or Python packages installed from source distributions that run build code. Package names that look like a misspelling of a popular package. Lockfile changes that add or swap packages the pull request doesn't explain. `ignore-scripts=true` removed from `.npmrc`, or `--ignore-scripts` removed from CI installs. A malware or dependency scanning step removed from CI.
Decided from code: partly. The diff shows the warning signs. Whether a package is really malicious needs its published contents and a scanner, which are outside the repository.

### [OpenSSF Scorecard Binary-Artifacts] No binaries that can't be reviewed are committed
Look for: new compiled files added to the repository, such as `.exe`, `.dll`, `.so`, `.dylib`, `.jar`, `.class` or `.pyc` files, and vendored minified JavaScript with no source or version. Tools downloaded once and committed instead of being fetched at a pinned version with a checksum.
Acceptable: a `gradle-wrapper.jar` that CI checks with `gradle/actions/wrapper-validation`.
Not a breach: scripts that are both source code and executable, generated source code such as parser output, and generated documentation.
Decided from code: yes.

### [OpenSSF Scorecard Token-Permissions] Workflow tokens have only the permissions each job needs
Look for: GitHub workflows with no top-level `permissions:` block, with `permissions: write-all`, or with write permissions set at the top level instead of on the one job that needs them. Write scopes such as `contents: write`, `packages: write`, `actions: write`, `pull-requests: write` or `id-token: write` given to jobs that only build or test. In other CI systems, new tokens or credentials with wider access than the job needs.
Acceptable: `permissions: read-all` or `contents: read` at the top, with each write permission on the job that uses it, such as `id-token: write` on the job that signs provenance, or `packages: write` on the publish job.
Decided from code: yes, for permissions set in workflow files. The repository's default token setting is outside the code.

### [OpenSSF Scorecard Dangerous-Workflow] Workflows never run untrusted code or input with secrets or write access
Look for: `pull_request_target` or `workflow_run` workflows that check out the pull request's code (for example `ref: ${{ github.event.pull_request.head.sha }}` or `${{ github.head_ref }}`) and then install, build, test or run scripts from it. These triggers run with the base repository's secrets and a write token. Untrusted values placed straight into `run:` or into an `actions/github-script` `script:`, such as `${{ github.event.issue.title }}`, `${{ github.event.pull_request.body }}`, `${{ github.event.comment.body }}` or `${{ github.head_ref }}`. Secrets or whole contexts printed to the log, such as `echo ${{ secrets.TOKEN }}`, `${{ toJSON(secrets) }}` or `${{ toJSON(github) }}`. Values derived from a secret, such as its base64 form, printed to the log, because log masking hides only the exact secret.
Acceptable: untrusted values passed through `env:` and used as quoted shell variables (`"$TITLE"`). Builds of fork code on `pull_request`, with `pull_request_target` kept for jobs that never run the pull request's code, such as adding labels.
Decided from code: yes.

### [SLSA Follow a consistent build process] Releases come from one defined build process
Look for: a second way to release, such as a new script or manual workflow that publishes outside the usual release workflow. Release workflows started by hand (`workflow_dispatch`) with free-form inputs that change compiler flags, build options or the source ref. Release jobs that run from any branch or tag, with no limit to the protected release branch or tags. Build steps downloaded from outside the repository at run time. Build metadata files that a package ecosystem requires, left out of date when the build changes.
Decided from code: yes, for workflow and script files. What verifiers expect a correct build to look like is set outside the repository.

### [SLSA Build L1] Released artifacts have provenance that says how they were built
Look for: workflows or scripts that publish packages, container images or binaries (such as `npm publish`, `twine upload`, `docker push`, `goreleaser`, `gh release upload` or `mvn deploy`) with no provenance step. Changes that remove or turn off provenance, such as dropping `--provenance` from `npm publish`, setting `provenance: false` on `docker/build-push-action`, removing `actions/attest-build-provenance` or the SLSA GitHub generator, or removing `RUNNER_GENERATE_ARTIFACTS_METADATA: "true"` from GitLab CI. Provenance that doesn't identify the output by its cryptographic digest.
Not a breach: workflows that only test and publish nothing. npm trusted publishing, which creates provenance without the `--provenance` flag.
Decided from code: yes, for whether the build creates provenance.

### [SLSA Build L2] Releases are built on a hosted build platform that creates and signs the provenance
Look for: release steps moved to a developer's machine, such as a `make release` target or a `release.sh` that publishes with local credentials, or docs telling maintainers to publish by hand. Provenance written by the project's own build steps, such as a script that writes a JSON file, instead of by the build platform or a trusted generator. Provenance published without a signature. A step that checks the provenance of downloaded artifacts removed, such as `slsa-verifier`, `gh attestation verify` or `cosign verify-attestation`.
Decided from code: partly. The code shows where the release runs. Whether the platform signs the provenance and meets Build L2 is a property of the platform, outside the repository.

### [SLSA Build L3] Build steps can't forge the provenance or tamper with other builds
Look for: in projects that claim Build L3, provenance created or signed inside the same job as the project's own build steps, for example with a signing key kept in a repository secret and passed to the build job. Release builds that restore caches which less-trusted jobs, such as pull request builds, can write.
Acceptable: provenance made by a separate, isolated generator that the build steps can't change. Check the generator's or platform's own documentation for the level it supports.
Decided from code: partly. Isolation between builds is a property of the build platform. The code shows only where signing happens and how caches are shared.

### [SLSA Distribute provenance] Provenance is published where users of the artifact can find it
Look for: provenance that is created but kept only as a short-lived CI artifact, instead of being attached to the release, pushed to the registry with the image, or published through the package ecosystem. A change that stops uploading the provenance file (often `*.intoto.jsonl`) or the attestation.
Decided from code: yes, for what the release workflow publishes.

### [CISA SBOM Frequency] Each release gets a new SBOM, made from that release
Look for: an SBOM committed to the repository once and never regenerated. Release workflows that publish a new version with no SBOM step, or that reuse an old SBOM. An SBOM generated from a different commit or build than the one released.
Decided from code: yes, for the release workflow in this repository.

### [CISA SBOM Coverage] The SBOM lists every component that ships, including transitive dependencies
Look for: SBOM generators run on a manifest without its lockfile, so only direct dependencies and version ranges appear. Options that limit depth or skip production dependencies. A repository with several ecosystems, such as npm and Go, or an app and its container image, where the SBOM covers only one. An SBOM of the source code when what ships is a container image, which leaves out the base image's packages.
Not a breach: leaving out development-only tools that aren't part of the shipped software, and non-code files.
Decided from code: partly. The generator settings are in the code, but whether the output is complete needs the generated file.

### [CISA SBOM Data Fields] The SBOM records the required data about itself and each component
Look for: generator settings, templates or post-processing that drop or blank required fields. For the SBOM itself these are the author, the author's signature, the data format name and version, the generation context (such as before build, build or after build), the timestamp, the tool name and version, and the SBOM version. For each component they are the producer, name, version, identifiers (such as a PURL or CPE), hash value and hash algorithm, license, and dependency relationships. Hand-written placeholder values such as "TODO" or a fixed date. An SBOM published without a signature.
Acceptable: a field marked as unknown when the author really doesn't know it. The guidance asks for unknown or withheld information to be stated, not silently left out.
Decided from code: partly. The code shows the generator and its settings. Whether every field is filled in needs the generated file.

### [CISA SBOM Machine-Processable Data] SBOMs are generated by a tool in SPDX or CycloneDX
Look for: SBOMs kept as hand-edited spreadsheets, Markdown tables or a custom JSON shape. Generators set to a proprietary format, or to a format version that its maintainers have deprecated. SWID tags as the only format, which the 2026 guidance no longer lists.
Acceptable: SPDX or CycloneDX output from a tool, such as Syft, a CycloneDX generator, Microsoft's SBOM Tool, or the `sbom` option of `docker/build-push-action`.
Decided from code: yes.

### [CISA SBOM Distribution and Delivery] The SBOM is published with, or linked to, the exact version it describes
Look for: SBOMs generated in CI but kept only as short-lived build artifacts, instead of being attached to the release, pushed with the container image, or published at a version-specific URL. Access settings that would stop authorised customers or their security tools from getting the SBOM.
Decided from code: partly. Where the SBOM is published is usually in the code, but who can access it may be set outside the repository.
