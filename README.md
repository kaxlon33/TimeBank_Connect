# TimeBank Connect

A community time-banking platform: neighbours swap skills using time credits (1 hour of help = 1 credit) instead of money.

Coursework project for Advanced Full Stack Development.

## Stack

| Part | Technology |
|---|---|
| Frontend | React 18, TypeScript (strict), Vite, Tailwind CSS (`apps/web`) |
| Backend | PHP 8.2, Laravel 12 REST API (`apps/api`) |
| Auth | Laravel Sanctum (SPA cookie auth), Member and Admin roles |
| Database | MySQL / MariaDB (XAMPP), Eloquent ORM, migrations and seeders |
| Third-party APIs | OpenStreetMap Nominatim (area lookup), REST Countries v5 (country list) |
| Tests | PHPUnit feature tests on a separate `timebank_test` database |

## Project layout

```
apps/web    React + TypeScript single-page app (talks to the API)
apps/api    Laravel REST API (MVC: models, controllers, services)
docs        Design notes, ERD and architecture decisions
```

## Setup (Windows, XAMPP)

You need PHP 8.2+, Composer, Node.js 20+ and XAMPP with MySQL.

1. **Start MySQL** in the XAMPP Control Panel.
2. **Create the databases and a database user** (in phpMyAdmin or the MySQL shell). Use your own password:
   ```sql
   CREATE DATABASE timebank CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE DATABASE timebank_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'timebank'@'localhost' IDENTIFIED BY 'choose-a-password';
   GRANT ALL PRIVILEGES ON timebank.* TO 'timebank'@'localhost';
   GRANT ALL PRIVILEGES ON timebank_test.* TO 'timebank'@'localhost';
   ```
3. **Set up the API:**
   ```powershell
   cd apps/api
   composer install
   copy .env.example .env
   php artisan key:generate
   ```
   Open `apps/api/.env` and set `DB_PASSWORD` to the password from step 2. Optional: set `RESTCOUNTRIES_API_KEY` (a free key from restcountries.com) to load the country list.
4. **Create the tables and demo data:**
   ```powershell
   php artisan migrate:fresh --seed
   php artisan storage:link
   ```
5. **Set up the front end:**
   ```powershell
   cd ..\web
   npm install
   ```

## Running the app

Open two terminals.

```powershell
# terminal 1: the API
cd apps/api
php artisan serve --host=127.0.0.1 --port=8000

# terminal 2: the web app
cd apps/web
npm run dev
```

Then open http://localhost:5173. Vite forwards `/api`, `/sanctum` and `/storage` to the API, so the browser only talks to one address.

## Demo accounts

All demo accounts use the password `password`.

| Role | Email | Notes |
|---|---|---|
| Admin | `admin@timebank.test` | Admin console at `/admin` |
| Member | `tom@timebank.test` | Has skills, requests, reviews and notifications |
| Member | `daniel@timebank.test` | Offers bicycle repair |
| Member | `aye@timebank.test` | Wrote a review that an admin later removed |

Sign up with a new email to see the starter credit (3 hours) arrive.

## Running the tests

The tests use `timebank_test` and refuse to run on any other database.

```powershell
cd apps/api
php artisan test
```

## Checking the credit ledger

```powershell
php artisan credits:reconcile
```

This checks that every balance equals the sum of its ledger rows and that every transfer nets to zero. It only reports.

## Third-party APIs

- **OpenStreetMap Nominatim** turns area names into map positions. Calls go through Laravel, use a generic User-Agent, are cached for a day and are spaced one second apart. If it is unreachable, the app falls back to areas it already knows.
- **REST Countries v5** supplies country names, flags and calling codes via `php artisan countries:sync`. It needs `RESTCOUNTRIES_API_KEY`. Without a key the command changes nothing and the app keeps its built-in countries.

## Features

- **Members:** sign up, log in, reset password, post up to 10 skills with pictures, browse and search, see helpers nearby on a map, request help, accept or decline, mark a session done, confirm to move credits, review each other, report content.
- **Credits:** an append-only ledger. Confirming a session moves credits in one locked database transaction, so credits cannot be lost, doubled or go negative.
- **Trust and badges:** a trust score from ratings, reliability and experience, and six badges awarded by rule.
- **Admin:** overview numbers, suspend and reactivate members, manage skill categories, moderate reported skills and reviews (with restore), change starter credit and matching settings. Every admin action is written to an audit log.
- **Phone friendly:** responsive layout with a bottom navigation bar, camera or file photo upload, and an installable PWA shell.

## Demo script (about 10 minutes)

Use two browsers: one for Tom (member) and one for Ada (admin). Start both servers first (see Running the app).

1. **Sign up.** Open the register page, pick a country (flags show) and type an area such as "Camden". Note that the form asks for a town or district, not a street.
2. **Browse.** Sign in as `tom@timebank.test`. Type "yoga" in search, clear it, and show that "yoga" appears under Recent.
3. **Skill and helpers.** Open a skill. Show "Other helpers you could ask" with match scores and reasons.
4. **Ask for help.** Write a request message, refresh the page, and show that the message is still there. Send the request.
5. **Accept.** Sign in as the helper of the skill you requested (for example `daniel@timebank.test` for bicycle repair), open Requests, accept, and mark it done.
6. **Confirm.** Back as Tom, confirm the session. Show the credits moved in the header and in Credits.
7. **Review.** Leave a review for the helper. Show the rating on their profile.
8. **Profile.** Choose a friendly character avatar, reload, and show it is still selected.
9. **Nearby.** Open Nearby. Explain that location is used when allowed, and the saved area is used otherwise.
10. **Admin.** Sign in as `admin@timebank.test`. Show the overview charts, then Places (switch a country off and on, rename an area), then Moderation and the audit log.

Expected: the admin ledger check says "Ledger balanced".

## Future work

Ideas that were out of scope for the coursework (see `docs/product/prd.md`, section 3.2):

- Groups of neighbours, leaderboards and a care pool.
- Real payments instead of simulated credits.
- Push notifications on phones (today the app checks every 15 seconds).
- Native mobile apps, built from the same API.
- Machine-learned helper matching, instead of the simple rule-based score.

## Notes

- `apps/api/.env` holds secrets and is git-ignored. Never commit it.
- Demo reset links and reset emails are written to `apps/api/storage/logs/laravel.log` in development (mail uses the log driver).
