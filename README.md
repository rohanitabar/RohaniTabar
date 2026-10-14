# Abbas Rohani Tabar — Portfolio

A bilingual (Persian and English) personal portfolio built with React. It includes a responsive project gallery, an interactive blog, light and dark themes, PDF résumé uploads, and a password-protected admin area backed by a small Node.js API. Blog translation uses a self-hosted LibreTranslate service without per-character API billing.

## Features

- Persian RTL and English LTR layouts with a saved language preference.
- A Persian and English introduction identifying Abbas Rohani Tabar, with an editable career history shown as a company and position timeline.
- Career entries include company logos, company dates, position titles and descriptions, and position dates. Position text is translated locally to English. Current employment and active roles can be marked separately. When there is no work history, the owner can show a message about seeking hands-on and team experience.
- Light and dark themes with a saved theme preference.
- Responsive home page with the five newest articles and projects, plus separate magazine-style `/blog`, `/blog/:id`, and `/projects` pages. The header logo is also used as the browser favicon.
- Contact form messages saved on the server and shown only in the authenticated admin panel. Visitors can leave an email address, phone number, or both for a manual reply.
- Admin account setup with a private one-time setup key, scrypt password hashing, HTTP-only session cookies, and login rate limiting.
- Admin tools to add, edit, and remove skills with logo URLs or image uploads, choose used skills for each project, drag skills and footer social links into order, publish or edit bilingual blog posts, and publish or remove projects with demo and source links.
- Blog hashtags with filtered archive links, likes, comments, admin replies, and native share support. The share button copies a link when the browser does not support native sharing.
- An authenticated admin issue inbox for server failures, browser runtime errors, and local translation failures. Notices show a plain-language summary, the affected section, the page path and optional technical details.
- A managed image ad beneath the popular posts sidebar. When empty, it shows an advertising placeholder linked to WhatsApp.
- PDF résumé upload with file size and PDF signature checks.
- JSON file storage under `server/data` so portfolio content survives a restart.

## Project structure

```text
src/
  app/                 Application shell and portfolio page
  assets/images/       Imported profile and brand images
  components/ui/       Shared interface components
  features/
    admin/             Admin inboxes and issue reports
    career/            Work history editor, timeline, and date helpers
    editorial/         Blog and project presentation
    notifications/     Web push subscription controls
    projects/          Local demo deployment management
  lib/                 Shared diagnostics and runtime utilities
  styles/              Global and application stylesheets
  index.js             React entry point
  setupTests.js        Jest setup required by Create React App
server/
  index.js             HTTP API and file-backed content storage
  deployments.js       Local project archive deployment and proxy logic
scripts/               Local development and production preview commands
public/                Static site assets, manifest, and service worker
```

Feature code lives together with its styles and focused tests. Shared UI pieces and utilities stay outside feature folders so they can be reused without creating circular imports.

## Requirements

- Node.js 18 or newer
- npm
- Docker Desktop or Docker Engine with Docker Compose (for local Persian-English translation)

## Install and run locally

1. Install the packages:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set `ADMIN_SETUP_KEY` to a long, private value. The example configures `LIBRETRANSLATE_URL` to the local service; no translation provider credential is needed. Keep `.env` out of source control.

3. Start the local translation service (the first run downloads the Persian and English translation models):

   ```bash
   docker compose up -d
   ```

   The models are stored in a Docker volume and reused after restarts. The service listens only on your computer at `127.0.0.1:5001`.

   Stop the service with `docker compose down`. This keeps the downloaded models; `docker compose down -v` also removes them.

4. Start the API and React development server together:

   ```bash
   npm start
   ```

5. Open `http://localhost:3000/admin` directly. The site checks the session cookie: an already signed-in device opens the admin panel, while other devices see the login form. On first visit, enter the setup key and create your own username and password. The password must be at least 12 characters. On later visits, sign in with that account; the setup key is not needed again. There is no public admin button in the site header.

`npm start` starts the API on port 5000 and the React site on port 3000. The API must be running for admin changes to save. To run them separately, use `npm run start:api` and `npm run start:ui` in two terminals. The React development server forwards `/api` requests to port 5000.

If an older site or API is already running, stop its terminal with Ctrl+C before running `npm start` again. Restarting the API signs out existing admin sessions; sign in again with your existing username and password.

The React Developer Tools warning about a development build is expected with `npm start`. To preview the production build locally, run `npm run build` followed by `npm run preview`, then open `http://localhost:5000`.

## Local project demos

The admin panel includes a local demo deployer. Static ZIPs with a root `index.html` and no `package.json` run without Docker; backend projects and apps with `package.json` need a `Dockerfile` or Compose file (`compose.yaml`, `compose.yml`, or `docker-compose.yml`). Use each compact project row to toggle its running state, edit settings, or remove its demo source. Project order can be selected while adding a project or editing a demo. Compose projects can select a web service; published host ports, host bind mounts, privileged mode, host networking, devices and extra capabilities are blocked. Demos are exposed at `http://<subdomain>.localhost:5000`.

Static sites with a root `index.html` and no `package.json` run directly without Docker. Backend and packaged applications need a Dockerfile or Compose file; Compose service names are auto-detected when there is a single service. Container demos require Docker Desktop or Docker Engine. Uploads are limited to 150 MB and extracted source to 250 MB. `.git` folders are omitted during extraction. Do not include secrets in source archives. Dockerfile-launched containers are capped at 512 MB RAM, 0.5 CPU and 128 processes. Compose projects need their own resource limits. This local feature is an early deployment workflow: persistent demo data, automatic TLS, and deployment through the Hamravesh API are not configured yet. For production, use durable storage or a database for demo data and review the platform's container isolation and resource limits.

## Production

Build the React app and start the Node server:

```bash
npm run build
npm run preview
```

Start the local LibreTranslate service on the production host with `docker compose up -d` before publishing posts or projects. It downloads models on first startup and then translates locally. The app can still save Persian content if the service is stopped; that content is marked for translation retry.

Set `PUBLIC_ORIGIN` to the public origin (for example, `https://example.com`) and terminate HTTPS at a trusted reverse proxy. Use a fresh, high-entropy `ADMIN_SETUP_KEY` before the first deployment. After the first admin account is created, setup remains closed; keep the setup key private and rotate or remove it from the environment.

The production process serves the compiled React app and API from the same origin. Admin sessions use HTTP-only, same-site cookies and are cleared when the server restarts. Uploads are saved under `public/uploads`; the JSON content store is under `server/data`. Back up both folders.

## Admin workflow

- **Skills:** add, edit, or remove skills. Drag a list item's grip to change its public order; keyboard users can focus the grip and press Up/Down. New skills are appended to the end. The order saves on drop. Adding a name that already exists updates that skill's logo. Use a direct image URL or upload a PNG/JPEG/WebP logo; SVG files are converted to PNG in the browser. Uploads are limited to 3 MB. The image preview is advisory and does not block saving a link. A direct URL must point to an image file for the logo to display; uploads are stored locally to avoid hotlink restrictions.
- **Social links:** add, edit, or remove a profile URL and its logo URL or image upload. Drag the grip to arrange footer icons; the order saves on drop. Adding an existing profile URL updates its logo. PNG/JPEG/WebP and SVG uploads are supported. The footer shows each logo as a clickable link with no visible label.
- **Projects:** write the Persian title and description once; the local LibreTranslate service generates and saves the English versions. Set an optional project cover by direct image URL or upload (PNG/JPEG/WebP, up to 3 MB); it appears in the project card. If translation is unavailable, the project is still saved and marked as pending; edit and save it again to retry. Add optional live demo and repository links.
- **Blog:** write the Persian title, summary and article once; the local LibreTranslate service generates and saves English text when the Persian source changes. Unchanged fields reuse their saved translations. Add hashtags and save drafts. The first translation-service startup downloads its language models; after that, translations run on your own server without a per-character API charge. If the service is offline, Persian content still saves, the post is marked as pending, and editing and saving it again retries the translation. Every new or edited post requires a poster image, supplied by URL or upload; preview cards place the poster beside the summary. Each post has a separate page with its full content, comments, likes, sharing controls, and the same sidebar as the blog archive. In the editor, select text and press **Bold**, insert a heading, or upload/insert an image at the cursor between paragraphs. The editor uses `**bold text**`, `## Heading`, and `![caption](image-url)` syntax and shows a preview. Readers can like, share and comment on published articles. Review, reply to, and remove comments from the admin panel. Admin replies display the name عباس روحانی تبار and the gray-background portrait used on the home page. The blog and article pages include latest and popular post lists.
- **Sidebar ad:** enter an image URL or upload a PNG/JPEG/WebP image, then set the destination URL and optional descriptions. Remove the ad to show the clickable "Your ad here" placeholder, which opens the WhatsApp profile configured in social links.
- **Contact inbox:** view submitted messages in the admin panel and use the visitor's email or phone link to respond directly. Mark messages as read or delete them. Contact messages are stored in `server/data/site.json` and never included in the public site data response. Back up this file and restrict server access to it.
- **Résumé:** upload a PDF up to 10 MB. The public site shows a download link after upload.

Blog content supports the formatting above. HTML entered as text is never rendered as markup.

## Web push notifications

Visitors can opt in with the bell button in the site header. Browsers require HTTPS for remote sites; `localhost` is allowed for local development. The browser asks permission only after the visitor clicks the button.

VAPID keys and subscriptions are stored in `server/data`. Keep this directory private and persistent across deployments so existing subscriptions remain valid. Signed-in administrators can send a notification from the admin panel; expired browser subscriptions are removed automatically.

## Data and deployment notes

The API is intentionally small and uses Node's built-in HTTP, crypto and filesystem modules. It keeps content in a local JSON file and sessions in memory. This works for a single server instance with persistent disk. For multi-instance or serverless hosting, replace those stores with a shared database and session store, and use private object storage for PDF files. In production, run LibreTranslate on the same host and keep it bound to loopback; if Node runs in a container on the same Compose network, set `LIBRETRANSLATE_URL=http://libretranslate:5000/translate`. Put the site behind HTTPS in production and do not expose the setup key.

## Scripts

- `npm start` — API and React development server together
- `npm run start:ui` — React development server only
- `npm run start:api` — portfolio API
- `npm run build` — production React build
- `npm run preview` — serve the production build and API
- `npm test` — Create React App test runner

GitHub Actions runs the test suite and production build on pushes and pull requests to `main` and `v2.0.0`. Enable repository notifications for failed workflow runs to receive email alerts. Runtime issue reports are stored with the site's admin data and appear in the **Issue reports** tab; they do not depend on running tests.
