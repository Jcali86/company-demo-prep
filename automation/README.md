# Deployment automation

Pull requests and `main` validate automatically. Deployment requires an explicit **Actions → Deploy Apps Script → Run workflow** on `main` after you configure your own Workspace instance. A merge alone does not deploy.

## One-time setup

1. Run `setup-clasp.command` once to connect the local copy to the existing Apps Script project and deployment.
2. Choose your repository with `GITHUB_REPOSITORY=OWNER/company-demo-prep` or an `OWNER/REPO` first argument, then run `finish-github-setup.command` once to store the three encrypted Actions secrets there. It can run from the repository's `automation` folder or Downloads; the fallback project path is `$HOME/Documents/company-demo-prep-system`. Set `COMPANY_DEMO_PREP_ROOT` if your configured project lives elsewhere.
3. Follow `docs/GITHUB-DEPLOYMENT.md` to protect `main` after its first validation run.

macOS may require **Control-click → Open** the first time a downloaded `.command` file is opened.
No Homebrew, administrator access, or permanent GitHub CLI installation is required. If a current secure `gh` is unavailable, the setup script downloads GitHub's official macOS binary for Apple Silicon or Intel, verifies it against the pinned official release checksum, runs it from a temporary folder, and removes it afterward.

## Normal release

Open a pull request, wait for **Validate**, review it, and merge it. Explicitly start **Deploy Apps Script** on `main` when you intend to release to your configured app.

## Local fallback

`deploy.command` is retained for an emergency local release. Both local and GitHub deployment call `deploy-apps-script.sh`, so version creation, redeployment, and verification cannot drift into two different implementations.

## Security

See `docs/SECURITY.md`. Never send clasp credentials in chat, email, issues, commits, or pull requests.
