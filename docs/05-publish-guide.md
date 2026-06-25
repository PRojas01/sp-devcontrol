# Publish Guide — SP-DevControl

> Instructions for releasing SP-DevControl to GitHub and npm.

---

## Prerequisites

- Git configured with your identity (`git config user.name / user.email`)
- GitHub account with access to `SolucionesPro/sp-devcontrol`
- npm account with publish rights to `sp-devcontrol` (or chosen package name)
- SSH key added to GitHub **or** a Personal Access Token (PAT)

---

## 1. Create the GitHub Repository

If the repo does not exist yet:

1. Go to https://github.com/new
2. Organization: `SolucionesPro` (or your personal account)
3. Repository name: `sp-devcontrol`
4. Visibility: **Public**
5. **Do NOT** initialize with README, .gitignore, or license — the repo already has these
6. Click **Create repository**

---

## 2. Configure Authentication

### Option A — SSH (recommended)

```bash
# Generate key if you don't have one
ssh-keygen -t ed25519 -C "sisgestion0@gmail.com"

# Add public key to GitHub:
# https://github.com/settings/keys → New SSH key
cat ~/.ssh/id_ed25519.pub

# Set remote to SSH
cd /media/master/Datos_3/DevControl-v2
git remote set-url origin git@github.com:SolucionesPro/sp-devcontrol.git
```

### Option B — Personal Access Token (HTTPS)

```bash
# Create PAT at: https://github.com/settings/tokens
# Required scopes: repo, workflow

cd /media/master/Datos_3/DevControl-v2
git remote set-url origin https://YOUR_TOKEN@github.com/SolucionesPro/sp-devcontrol.git
```

---

## 3. Push to GitHub

```bash
cd /media/master/Datos_3/DevControl-v2

# Push all commits
git push -u origin master

# Verify
git log --oneline -5
git branch -vv
```

---

## 4. Tag and Release v2.0.0

The `release.yml` workflow triggers on `v*` tags and automatically:
- Builds TypeScript
- Compiles standalone binaries (Linux x64/ARM64, Windows x64)
- Creates a GitHub Release with the binaries and checksums
- Publishes to npm with `--provenance`

```bash
# Create and push the release tag
git tag -a v2.0.0 -m "feat: v2.0.0 — production release with security hardening, CI/CD, 76 tests"
git push origin v2.0.0
```

After pushing the tag:
1. Go to `https://github.com/SolucionesPro/sp-devcontrol/actions`
2. Watch the **Release** workflow run
3. Check the release at `https://github.com/SolucionesPro/sp-devcontrol/releases`

---

## 5. Configure npm Publish (release.yml)

The workflow uses `NPM_TOKEN` secret. Add it once:

1. Generate token at https://www.npmjs.com/settings/~/tokens → **Automation** type
2. Go to GitHub repo → **Settings → Secrets → Actions → New repository secret**
3. Name: `NPM_TOKEN`, Value: your npm token
4. Save

> **Note on package name**: `devcontrol` (no scope) is taken on npm (50k downloads/week).
> Current package name is `sp-devcontrol`. Verify it is available:
> ```bash
> npm view sp-devcontrol 2>&1 | head -3
> ```
> If taken, use a scoped name: `@solucionespro/devcontrol`
> Update `package.json` → `"name"` before tagging.

---

## 6. Enable GitHub Features (post-push)

After the first push, configure these in the repo settings:

| Feature | Location | Action |
|---------|----------|--------|
| Branch protection | Settings → Branches → Add rule | Protect `master`: require PR + status checks |
| Vulnerability alerts | Settings → Security | Enable Dependabot alerts |
| Private vuln reporting | Security → Advisories | Enable (referenced in SECURITY.md) |
| Discussions | Settings → General | Enable (for community Q&A) |
| Pages (optional) | Settings → Pages | Publish `docs/` as GitHub Pages |

---

## 7. Verify CI Passes

After push, CI runs automatically on every push/PR via `.github/workflows/ci.yml`:

```
https://github.com/SolucionesPro/sp-devcontrol/actions/workflows/ci.yml
```

The matrix tests Node.js 18, 20, and 22. All 76 tests must pass before merging PRs.

---

## 8. Post-Release Checklist

- [ ] `git push -u origin master` succeeded
- [ ] `git push origin v2.0.0` triggered release workflow
- [ ] GitHub Release created with binaries
- [ ] npm package published (`npm view sp-devcontrol`)
- [ ] README badges resolve (CI badge, npm badge)
- [ ] Branch protection enabled on `master`
- [ ] `NPM_TOKEN` secret added to repo
- [ ] Dependabot alerts enabled
- [ ] Private vulnerability reporting enabled

---

_SP-DevControl v2.0.0 — Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador) — MIT License_
