# InterviewReady AI

A MERN interview preparation platform with authentication, separate job boards, JD analysis, requirement-linked questions, interview sessions, evidence-based readiness scoring, a personalized preparation roadmap, and a multi-job analytics dashboard. Phase 8 adds production serving, a container deployment, configuration checks, and release verification.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- MongoDB running locally, or a MongoDB Atlas connection string

## Run locally

1. Run `npm install` at the project root.
2. Copy `.env.example` to `server/.env` and set `MONGODB_URI` and a unique `JWT_SECRET` of at least 32 characters.
3. Set a valid `OPENAI_API_KEY` in `server/.env` to enable AI JD analysis, question generation, scored answer evaluation, and readiness scoring. A missing, rejected, or unavailable key produces clearly labeled **unscored** practice guidance; readiness remains unevaluated.
4. Run `npm run dev`.
5. Open `http://localhost:5173`.

The frontend proxies `/api` requests to `http://localhost:5000`. The API starts only after MongoDB connects. `GET /api/health` reports the server status.

If port 5000 is occupied, stop the other server. Changing `PORT` also requires changing the proxy target in `client/vite.config.js` for local development. A rejected API key must be replaced in `server/.env`, then the server restarted. Submit new answers after that; older unscored answers are not retroactively scored. Never put the API key in the client or commit `server/.env`.

## Verify the release

Run `npm run build`, `npm test`, and `npm audit --omit=dev`. In the browser, open **Overview** to switch between job boards. The selected board shows readiness, coverage, category scores and proficiency chart, strongest and lowest assessed JD requirements, completed answers, pending assessments, roadmap progress, and recent interviews. Its data always comes from that board's current JD version. In PowerShell, set `$env:RUN_DB_TESTS='1'` and run `npm test` to include the database integration test; it creates and removes temporary test accounts and boards.

To smoke test the production server locally after building, set `NODE_ENV=production`, `PORT=5000`, and `CLIENT_ORIGIN=http://localhost:5000`, then run `npm start`. Open `http://localhost:5000`; deep links such as `/app/jobs` return the client, while unknown `/api` routes return JSON 404 responses.

## Deploy

`Dockerfile` builds the React client and runs Express as a single service. Provide `MONGODB_URI`, a unique `JWT_SECRET` of at least 32 characters, a valid `OPENAI_API_KEY`, `CLIENT_ORIGIN` set to the public HTTPS origin, and `PORT` if your host requires a specific port. Set `NODE_ENV=production`. Put secrets in the host's environment settings; do not bake `server/.env` into the image. Use a managed MongoDB database and HTTPS when hosting publicly. The container exposes `/api/health` for health checks.

For a local container deployment with a persistent MongoDB volume, start Docker Desktop and run `docker compose up --build -d`. The app is available at `http://localhost:5000`. Compose reads `server/.env` for the secret and optional AI key, overrides the MongoDB address to its private database service, and stores MongoDB data in `mongo_data`. Stop with `docker compose down`; leave the volume intact to retain data.

Roadmap completion tracks study progress only; readiness changes when scored interview evidence changes. A roadmap is specific to one board and assessment version, so changing or reanalyzing the JD requires a new roadmap. Without an AI key, the roadmap still uses extracted JD terms, but topics remain unassessed until there are AI-scored answers.

The overall score uses technical skills 25%, DSA 20%, JD-specific knowledge 20%, project knowledge 15%, communication 10%, and HR/behavioral skills 10%. Each category needs two distinct AI-scored questions before it is evaluated. Until all six are evaluated, overall readiness is withheld; the page instead shows weighted evidence coverage and a clearly labeled partial observed score. Repeating the same question updates its evidence rather than counting as another distinct question. Changing or reanalyzing the JD starts a new assessment version, so old scores cannot be mixed into the current result. The score estimates preparation, not hiring probability.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Get the authenticated user |
| GET | `/api/health` | Health check |
| POST | `/api/jobs` | Create a job board, optionally with a PDF |
| GET | `/api/jobs` | List the signed-in user's boards |
| GET | `/api/jobs/:id` | Get a board and its analysis |
| PUT | `/api/jobs/:id` | Update a board |
| DELETE | `/api/jobs/:id` | Delete a board |
| POST | `/api/jobs/:id/analyze` | Analyze saved or supplied JD text/PDF |
| GET | `/api/jobs/:id/questions` | Get the current question bank for one board |
| POST | `/api/jobs/:id/questions/generate` | Generate or regenerate requirement-linked questions |
| POST | `/api/interviews/start` | Start a technical, coding, HR, full, or targeted challenge interview |
| POST | `/api/interviews/:id/answer` | Submit and evaluate the current answer |
| POST | `/api/interviews/:id/complete` | Finish a session early |
| GET | `/api/interviews/:id` | Resume a session and review its answers |
| GET | `/api/interviews/history` | List the user's interview sessions |
| GET | `/api/jobs/:id/readiness` | Get current category scores, evidence coverage, history, and challenge availability |
| POST | `/api/assessment/submit` | Recalculate readiness from a completed current interview session |
| POST | `/api/jobs/:id/roadmap` | Generate or refresh a job-specific preparation roadmap |
| GET | `/api/jobs/:id/roadmap` | Get the current roadmap and completion progress |
| PUT | `/api/roadmap/:id` | Mark one roadmap activity complete or incomplete |
| GET | `/api/dashboard/overview?jobId=:id` | Get all board summaries and selected-board analytics |

Authentication requests are validated and rate limited. Send protected requests with `Authorization: Bearer <token>`.

## Structure

- `client/`: Vite, React, Tailwind CSS, React Router, Axios
- `server/`: Express, Mongoose, JWT authentication, validation, and middleware

PDF uploads are limited to 5 MB and require selectable text. AI analysis, question generation, and answer feedback use strict JSON schemas with backend validation. The AI service uses the OpenAI Responses API when configured. Answer and readiness scores are calculated on the backend from AI rubric dimensions; an unavailable or missing key produces **unscored** guidance, not a fabricated score. Questions, interviews, evaluations, readiness evidence, preparation roadmaps, and dashboard analytics remain attached to one user and one job board. Changing or reanalyzing a JD increments that board's assessment version, preventing old answers from being used as current evidence.

## Signature feature: Challenge Your Score

Each readiness category shows the linked question evidence, the rubric used for its score, and what remains unassessed. Select **Prove it** for a targeted two-question challenge. The result shows the before/after category score and evidence count for that job board. A single answer cannot establish full readiness: coverage and distinct-question requirements remain visible. Without a working AI key, a challenge still provides unscored practice guidance and does not change readiness.
