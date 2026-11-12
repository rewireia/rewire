# Deployment

Rewire runs as one process. In production the API also serves the built web, so one address is
enough: no cross-origin calls, one cookie, one place for PayPal to send its webhooks.

## One server for everything

```sh
npm ci
npm run build                        # compiles the packages and the API, and builds the web
APP_ENV=production \
HOST=0.0.0.0 \
PUBLIC_ORIGIN=https://your.address \
SESSION_SECRET=<32 characters or more> \
WEB_ROOT=../web/dist \
npm start
```

| Variable         | In production                                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `APP_ENV`        | `production`: the session cookie is sent over HTTPS only and needs `SESSION_SECRET`.                                        |
| `PUBLIC_ORIGIN`  | The public address, required: a request that changes state is accepted from this origin only.                               |
| `WEB_ROOT`       | The folder of the built web; a relative path starts at `apps/api`. The server refuses to start if it holds no `index.html`. |
| `SESSION_SECRET` | Signs the session cookie. Changing it signs every learner out.                                                              |
| `DATABASE_URL`   | A SQLite file, `file:var/rewire.db` under `apps/api` by default.                                                            |

The rest of the variables are in `.env.example`. Every credential is optional: without PayPal the site
shows its catalogue and sells nothing; without an AI key it works without the guide.

How the web is served (`apps/api/src/http/web-files.ts`):

- A file under `assets/` is named after its content, so the browser may keep it for good.
- Any other path that is not a file is a page of the web application and gets `index.html`, which the
  browser checks with the server, by its entity tag, before every use.
- A missing file under `assets/` is a 404, never the home page under the name of a script.
- A wrong address under `/api` is answered by the API with a problem, never with a page.
- Answers are compressed, and the page allows the window PayPal opens to answer it
  (`Cross-Origin-Opener-Policy: same-origin-allow-popups`).

## Buyer access for a public sandbox demo

Configure `PAYPAL_SANDBOX_DEMO_BUYER_EMAIL` and `PAYPAL_SANDBOX_DEMO_BUYER_PASSWORD`
with a fictional Personal account created in PayPal Sandbox. The checkout deliberately displays
these values so reviewers can copy them and approve a test purchase without a personal account.
Only addresses ending in `@personal.example.com` are accepted. These settings are rejected with
`PAYPAL_ENV=live`; they must never contain a merchant login, API secret or real personal password.
The private automated-test buyer variables are not exposed automatically.

Validate the published checkout with this buyer before handing the demo to reviewers. PayPal
still requires the buyer's approval; Rewire does not automate or bypass it.

## On Render

`render.yaml` describes the service: Render builds the repository, starts the server and gives it its
public address, which the start command passes on as `PUBLIC_ORIGIN`.

1. In Render, create a **Blueprint** from the repository.
2. Enter the secrets it asks for: `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` of a PayPal sandbox
   app, and `OPENAI_API_KEY` for the guide. Leave empty what you do not have.
   If the account of the model provider lets it learn from what it receives, set
   `GUIDE_PROVIDER_TRAINS_ON_DATA` to `true`: the guide then tells the person.
3. For webhooks, add a webhook in the PayPal app pointing to `https://<address>/api/webhooks/paypal`
   and set its id as `PAYPAL_WEBHOOK_ID`.

What to expect of the free instance:

- **Memory.** The server holds the data bundle in memory. With the heap capped at 256 MB, as the
  blueprint does, it used about 380 MB with every region in use: within the 512 MB of the instance.
- **The database starts empty every time the instance starts**: on each deploy, and each time a free
  instance wakes up after sleeping, because it has no persistent disk. The occupations, the scores and
  the catalogue ship with the repository and are not affected; learners, orders and certificates are.
  PayPal keeps its own record of every sandbox payment. For data that lasts, use an instance with a
  disk and point `DATABASE_URL` at a file on it.
- **A free instance sleeps** after a while without visits and takes a moment to wake up on the next
  one.

## Persistent deployment candidate

For a review instance that keeps learner history across restarts, select
`render.persistent.yaml` as the Blueprint path. It uses the paid `0.5c-512mb` service
and a 1 GB disk mounted at `/var/data`; `DATABASE_URL` points to the database on that disk.
Automatic deployment is disabled so releases are deliberate. Review billing before creating it.
This configuration is prepared locally; it has not been deployed or validated in a Render account.

Render lists this compute tier at USD 7/month and disks at USD 0.25/GB/month: an estimated
USD 7.25/month before taxes or additional usage. Verify pricing when activating the service.
See [pricing](https://render.com/pricing), [persistent disks](https://render.com/docs/disks),
and [Blueprint configuration](https://render.com/docs/blueprint-spec).

Use one instance with the file database. Keep `SESSION_SECRET` stable across releases, and back
up the SQLite database consistently before migrations. Reopening the same file preserves data;
replacing the filesystem does not. The free blueprint is for disposable evaluation only.

The application currently requires a Node server and SQLite. Its frontend alone is not the
complete product: a static-only upload cannot run the wallet, payments or learner histories.
A Cloudflare frontend would still need this API and its persistent storage, or a separate runtime port.
