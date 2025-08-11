# Laravel Breeze Overrides – Install

1. Create a fresh Laravel app and install Breeze (Blade):
```bash
composer create-project laravel/laravel frontend
cd frontend
composer require laravel/breeze --dev
php artisan breeze:install blade
npm install
```

2. Apply overrides (from the root of this zip):
```bash
bash frontend-overrides/scripts/apply-overrides.sh /absolute/path/to/frontend
```

3. Configure `.env` in your Laravel app:
```
BACKEND_BASE_URL=http://localhost:3001
BACKEND_API_KEY=CHANGE_ME
```

4. Build frontend:
```bash
npm run dev   # or npm run build
php artisan migrate
php artisan serve
```

Login with a seeded user or register. Open `/dashboard` to access the WA management UI.
