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
   CREATE USER 'timebank'@'localhost' IDENTIFIED BY 'your-password';
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
