# BotAPI React TypeScript Frontend

This frontend connects to your FastAPI auth API.

## Backend required

FastAPI must be running:

```bash
uvicorn main:app --reload
```

Expected API endpoints:

```txt
POST http://127.0.0.1:8000/auth/register
POST http://127.0.0.1:8000/auth/login
```

## Setup

```bash
npm install
npm run dev
```

Open:

```txt
http://127.0.0.1:5173
```

## Environment

Copy `.env.example` to `.env` if needed:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Pages

```txt
/register - public registration
/login - login
/dashboard - protected user/customer/admin dashboard
/admin - admin-only dashboard
```

## Seed admin login

If you ran your seeder:

```txt
admin@botapi.com / 123456
```

## Notes

This is the frontend foundation only. Next backend step is to add protected APIs like `/me`, `/admin/users`, and user role update endpoints.
