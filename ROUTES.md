- `async function interviewAgentReply({roomCode, history, message})` -> if env set, call; else return mock string (echo + follow-up question).

## Frontend routes/pages

- `/` Landing: fetch `GET /api/jobs?active=1`. Cards list, tags chips, Apply button.
- `/login`, `/register` (with role selector).
- `/candidate` Dashboard: applications with status + score if available.
- `/candidate/apply/:jobId` upload CV (multipart), success toast.
- `/candidate/invitations` list + accept/decline.
- `/candidate/interview/:roomCode` simple chat UI (WebSocket). Message list, input box, disable outside time range.
- `/hr` Dashboard: “Create Job” + list of owned jobs.
- `/hr/jobs/new` form.
- `/hr/jobs/:jobId/applicants` table with screening details; bulk “Invite to interview” action.
- `/hr/interviews/:jobId/schedule/:applicationId` datetime picker to create interview.

## Implementation details

- Add CORS (credentials) between `SERVER_URL` (4000) and Vite (5173).
- Serve `/uploads` statically at `/static/`.
- Use multer for CV upload; store original name + generate safe unique filename.
- ScreeningQueue: after application insert, enqueue screen job.
- WebSocket: store messages and broadcast back to client; on each candidate message, call `interviewAgentReply` and push Agent response.
- Tailwind: Responsive, simple navbar with role-aware menus.

## DX scripts

- root `package.json` with workspaces "client" and "server".
- `npm run dev` -> concurrently runs client and server (use `concurrently`).
- `server` scripts: `migrate`, `dev`, `start`.
- `client` scripts: `dev`, `build`, `preview`.

## Security & validation

- Validate payloads (zod or express-validator).
- Limit upload size (10 MB).
- Sanitize Markdown preview in job description (DOMPurify on client).
- Rate-limit auth endpoints.

## Tests (basic)

- Unit test `services/smythos.js` mock behavior.
- Supertest: auth flow, create job, apply, screening mock, invite, schedule.

Now, generate the repository with:
1) all folders/files scaffolded as above,
2) at least the first migration `001_init.sql`,
3) working auth routes and job creation/listing,
4) CV upload + mock screening end-to-end,
5) interview WebSocket chat room with mock agent,
6) minimal Tailwind UI matching pages/routes.

Write complete code files, not stubs. 
