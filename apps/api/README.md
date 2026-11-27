# TimeBank Connect API

The Laravel 12 REST API for TimeBank Connect. The React app in `apps/web` is its only client.

## Layout

| Folder | What is in it |
|---|---|
| `app/Models` | Eloquent models: users, skills, help requests, credit transactions, reviews, reports, audit logs |
| `app/Http/Controllers` | Thin controllers: they validate, call a service, and return a resource |
| `app/Http/Requests` | Form requests: the allowed fields for each write |
| `app/Http/Resources` | JSON shapes. Other members never see email or credit balance |
| `app/Services` | Business rules: credit transfer, request life cycle, trust score, badges, moderation, geocoding |
| `app/Console/Commands` | `countries:sync` (REST Countries) and `credits:reconcile` |
| `database/migrations`, `database/seeders` | Schema and demo data |
| `tests/Feature` | PHPUnit feature tests |

## Authentication

Sanctum SPA cookie auth. The client first calls `GET /sanctum/csrf-cookie`, then posts credentials. Signed-in routes also block suspended members and record when each member was last active.

## Main endpoints

All paths start with `/api`.

| Area | Endpoints |
|---|---|
| Auth | `POST auth/register`, `POST auth/login`, `POST auth/logout`, `GET auth/me`, `GET auth/check-email`, `POST auth/forgot-password`, `POST auth/reset-password` |
| Reference | `GET countries`, `GET areas`, `GET categories` |
| Skills | `GET skills`, `GET skills/{id}`, `POST skills`, `PUT skills/{id}`, `DELETE skills/{id}`, `GET my/skills` |
| Profile | `GET profile`, `PUT profile`, `PUT profile/availability` |
| Nearby | `GET nearby?lat=&lng=&radius_km=` |
| Requests | `GET help-requests?box=`, `POST help-requests`, then `accept`, `decline`, `mark-done`, `cancel`, `complete`, `reviews` under `help-requests/{id}` |
| Credits | `GET credits/transactions` |
| Notifications | `GET notifications`, read and unread routes |
| Reports | `POST reports` |
| Admin (admin only) | `admin/stats`, `admin/members`, `admin/categories`, `admin/moderation`, `admin/settings` |

## Tests

```powershell
php artisan test
```

The tests use `timebank_test`. Third-party HTTP calls are faked, and any unexpected real request fails the test.
