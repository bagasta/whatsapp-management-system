#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-}"
if [ -z "$TARGET" ]; then
  echo "Usage: $0 /absolute/path/to/laravel-app"
  exit 1
fi

echo "Applying overrides into: $TARGET"

# Copy views, controllers, routes, and JS
mkdir -p "$TARGET/resources/views" "$TARGET/resources/js" "$TARGET/app/Http/Controllers" "$TARGET/routes"

cp -r "$(dirname "$0")/../resources/views/." "$TARGET/resources/views/"
cp -r "$(dirname "$0")/../resources/js/." "$TARGET/resources/js/"
cp -r "$(dirname "$0")/../app/Http/Controllers/." "$TARGET/app/Http/Controllers/"
cp -r "$(dirname "$0")/../routes/." "$TARGET/routes/"

echo "Done. Re-run: npm run dev"
