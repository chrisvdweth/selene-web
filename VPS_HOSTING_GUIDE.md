# VPS hosting guide

This guide deploys SELENE as a **static Astro site** alongside existing sites on a shared VPS. It uses the VPS's existing Nginx installation and deploys only the built `dist/` files.

It deliberately does **not** install or run Caddy, Docker, Redis, Node, PM2, or a new application service on the VPS. It also does not run `apt upgrade` or restart Docker. Those actions can interrupt unrelated sites.

## Architecture

```text
push to main
  -> GitHub Actions: check, test, build
  -> SSH/rsync: /var/www/selene-web/releases/<commit>/
  -> atomic symlink: /var/www/selene-web/current
  -> existing Nginx serves a new hostname from current/
```

The `deploy` account only owns `/var/www/selene-web`, so CI cannot modify existing Nginx sites or restart services.

## Before starting

1. Confirm the existing sites are healthy. In particular, if the existing SELENE application uses Nginx proxying to port `14048`, verify it is running before changing anything:

   ```bash
   sudo ss -ltnp | grep ':14048'
   ```

2. Choose a **new hostname**, rather than adding this static site below an existing application's path. For example, use `atlas.example.com`, not `example.com/selene/`.

3. In the domain's DNS control panel, create an `A` record from the new hostname to the VPS public IPv4 address. Confirm it resolves before requesting TLS:

   ```bash
   getent hosts atlas.example.com
   ```

4. Do not run these commands on the shared VPS:

   ```bash
   sudo apt upgrade -y
   sudo systemctl restart docker
   sudo docker compose down
   ```

   Do not enable Caddy on a server already using Nginx:

   ```bash
   sudo systemctl disable --now caddy
   ```

## One required static-hosting adjustment

This repository contains Cloudflare Pages Functions under `functions/`. Nginx serves static files and does not execute those functions.

In particular, `src/lib/notebook-links.ts` currently makes `/download/<notebook>` links. Those links depend on `functions/download/[notebook].ts` and will return 404 when served only by Nginx. Before the first VPS deployment, replace that helper with direct, pinned upstream notebook URLs, or provide a separate backend for downloads.

The `/admin` page is static; the Nginx configuration below replaces its Cloudflare authentication Function with HTTP Basic Authentication.

## Create the isolated deployment directory

Run this once on the VPS. It is safe alongside existing web sites:

```bash
sudo install -d -o deploy -g deploy -m 755 /var/www/selene-web/releases
```

If the `deploy` user has not already been created, create it without sudo access:

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo install -d -o deploy -g deploy -m 755 /var/www/selene-web/releases
```

There is no need to clone the source repository or install npm on the VPS. GitHub Actions checks out and builds the source; the server receives only static files.

## Create an SSH key for GitHub Actions

On a trusted local computer:

```bash
ssh-keygen -t ed25519 -f ./selene-static-deploy -C "github-actions-selene-static"
ssh-copy-id -i ./selene-static-deploy.pub deploy@YOUR_VPS_IP
```

In GitHub, open **repository Settings -> Secrets and variables -> Actions** and add:

| Secret | Value |
| --- | --- |
| `VPS_HOST` | The VPS IP address or hostname |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | The complete private-key contents of `selene-static-deploy` |
| `SITE_URL` | `https://atlas.example.com` |

Never commit the private key to the repository.

## Add an independent Nginx virtual host

Create a new Nginx file. Do not edit existing files for other domains:

```bash
sudoedit /etc/nginx/sites-available/atlas.example.com
```

Replace `atlas.example.com` with the chosen hostname:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name atlas.example.com;

    root /var/www/selene-web/current;
    index index.html;

    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;
    add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; frame-src 'self'; img-src 'self' data:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; upgrade-insecure-requests" always;

    location / {
        try_files $uri $uri/ $uri.html =404;
    }

    location ^~ /_astro/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    location ^~ /notebooks/ {
        expires 1d;
        add_header Cache-Control "public, max-age=86400, stale-while-revalidate=604800";
        try_files $uri $uri/ =404;
    }

    location = /admin {
        auth_basic "SELENE admin";
        auth_basic_user_file /etc/nginx/.htpasswd-selene;
        try_files $uri $uri/ $uri.html =404;
    }

    location ^~ /admin/ {
        auth_basic "SELENE admin";
        auth_basic_user_file /etc/nginx/.htpasswd-selene;
        try_files $uri $uri/ $uri.html =404;
    }
}
```

Enable only this new site and validate the full Nginx configuration before a graceful reload:

```bash
sudo ln -s /etc/nginx/sites-available/atlas.example.com /etc/nginx/sites-enabled/atlas.example.com
sudo nginx -t
sudo systemctl reload nginx
```

If `nginx -t` reports an error, do not reload Nginx. Fix or remove only the new `atlas.example.com` file.

### Protect `/admin`

Check whether `htpasswd` is present:

```bash
command -v htpasswd
```

If needed, install only the small utility package (do not run a system upgrade):

```bash
sudo apt install -y apache2-utils
```

Create the password file interactively:

```bash
sudo htpasswd -c /etc/nginx/.htpasswd-selene admin
```

## Enable HTTPS

After DNS works and the HTTP Nginx site has been enabled, request a certificate for the new hostname only:

```bash
sudo certbot --nginx -d atlas.example.com
```

Choose the HTTPS redirect when prompted. This command only changes the virtual host for `atlas.example.com`.

## CI/CD workflow

Add `.github/workflows/deploy-vps.yml`:

```yaml
name: Deploy static site to VPS

on:
  push:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: selene-static-production
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      SITE_URL: ${{ secrets.SITE_URL }}

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci
      - run: npm run check
      - run: npm test
      - run: npm run build
      - run: npm run verify:release

      - name: Configure SSH
        env:
          SSH_KEY: ${{ secrets.VPS_SSH_KEY }}
        run: |
          mkdir -p ~/.ssh
          printf '%s\n' "$SSH_KEY" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          ssh-keyscan -H "${{ secrets.VPS_HOST }}" >> ~/.ssh/known_hosts

      - name: Upload and activate static release
        env:
          VPS_HOST: ${{ secrets.VPS_HOST }}
          VPS_USER: ${{ secrets.VPS_USER }}
          RELEASE: ${{ github.sha }}
        run: |
          ssh -i ~/.ssh/id_ed25519 "$VPS_USER@$VPS_HOST" \
            "mkdir -p /var/www/selene-web/releases/$RELEASE"

          rsync -az --delete \
            -e "ssh -i ~/.ssh/id_ed25519" \
            dist/ \
            "$VPS_USER@$VPS_HOST:/var/www/selene-web/releases/$RELEASE/"

          ssh -i ~/.ssh/id_ed25519 "$VPS_USER@$VPS_HOST" \
            "ln -sfn /var/www/selene-web/releases/$RELEASE /var/www/selene-web/current-new &&
             mv -Tf /var/www/selene-web/current-new /var/www/selene-web/current"
```

Commit and push the workflow:

```bash
git add .github/workflows/deploy-vps.yml VPS_HOSTING_GUIDE.md
git commit -m "docs: add safe shared-VPS hosting guide"
git push origin main
```

Each successful push to `main` builds and tests the site on GitHub, uploads a complete new release, then atomically switches the `current` symlink. Nginx, Docker, Redis, and the other hosted sites are not restarted or modified.

## Roll back a bad static release

List releases:

```bash
ls -lt /var/www/selene-web/releases
```

Point `current` at a previous release directory:

```bash
sudo -u deploy ln -sfn /var/www/selene-web/releases/PAST_COMMIT /var/www/selene-web/current-new
sudo -u deploy mv -Tf /var/www/selene-web/current-new /var/www/selene-web/current
```

No Nginx reload is needed for a static rollback.
