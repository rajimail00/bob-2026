# BOB Admin Portal

Desktop-first administration website for the BOB platform. It uses the existing Express API and does not connect to MongoDB directly.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Set `BACKEND_API_URL` to the intended local or hosted BOB API.
3. Replace `ADMIN_SESSION_SECRET` with at least 32 random characters.
4. From the repository root, run `npm install`.
5. Start the website with `npm run admin:dev`.
6. Open `http://localhost:3001`.

The login form expects the email and password of an existing active administrator account. There is no public administrator registration flow.

## Validation

From the repository root:

```powershell
npm run admin:typecheck
npm run admin:test
npm run admin:build
```

## Production configuration

Configure all values from `.env.example` as encrypted hosting secrets. Use an HTTPS `ADMIN_APP_URL` and a unique production session secret. The production process can be started with `npm run start -w apps/admin` after a successful build.

The browser talks to same-origin route handlers. These handlers keep the backend access and refresh tokens inside an encrypted HTTP-only cookie and forward allowlisted requests to the BOB API.
