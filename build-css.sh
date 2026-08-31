#!/usr/bin/env bash
# Build production Tailwind CSS (v3) cho Cloudflare Workers demo
# Yêu cầu: tailwindcss-v3.exe (Tailwind CLI v3.4) đã download về thư mục gốc
#   curl -sSL -o tailwindcss-v3.exe 'https://github.com/tailwindlabs/tailwindcss/releases/download/v3.4.17/tailwindcss-windows-x64.exe'

set -e

cd "$(dirname "$0")"

if [ ! -f "tailwindcss-v3.exe" ] && [ ! -f "tailwindcss-v3" ]; then
  echo "❌ Chưa có Tailwind v3 CLI. Tải về:"
  echo "   Windows: curl -sSL -o tailwindcss-v3.exe 'https://github.com/tailwindlabs/tailwindcss/releases/download/v3.4.17/tailwindcss-windows-x64.exe'"
  echo "   Linux:   curl -sSL -o tailwindcss-v3     'https://github.com/tailwindlabs/tailwindcss/releases/download/v3.4.17/tailwindcss-linux-x64'"
  echo "   macOS:   curl -sSL -o tailwindcss-v3     'https://github.com/tailwindlabs/tailwindcss/releases/download/v3.4.17/tailwindcss-macos-x64'"
  exit 1
fi

BIN="./tailwindcss-v3"
if [ -f "tailwindcss-v3.exe" ]; then
  BIN="./tailwindcss-v3.exe"
fi

echo "🔨 Building Tailwind v3 CSS..."
"$BIN" -c ./tailwind.config.js -i ./src/tailwind-v3.css -o ./public/styles.css --minify
echo "✅ Done: public/styles.css ($(wc -c < public/styles.css) bytes)"
echo
echo "Deploy với: cd .. && npx wrangler deploy --dir cf-pos-demo"