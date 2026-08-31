#!/usr/bin/env bash
# Build production Tailwind CSS cho Cloudflare Workers demo
# Yêu cầu: tailwindcss.exe (CLI standalone) đã download về thư mục gốc

set -e

cd "$(dirname "$0")"

if [ ! -f "tailwindcss.exe" ] && [ ! -f "tailwindcss" ]; then
  echo "❌ Chưa có Tailwind CLI. Tải về:"
  echo "   Windows: curl -sSL -o tailwindcss.exe 'https://github.com/tailwindlabs/tailwindcss/releases/latest/download/tailwindcss-windows-x64.exe'"
  echo "   Linux:   curl -sSL -o tailwindcss     'https://github.com/tailwindlabs/tailwindcss/releases/latest/download/tailwindcss-linux-x64'"
  echo "   macOS:   curl -sSL -o tailwindcss     'https://github.com/tailwindlabs/tailwindcss/releases/latest/download/tailwindcss-macos-x64'"
  exit 1
fi

BIN="./tailwindcss"
if [ -f "tailwindcss.exe" ]; then
  BIN="./tailwindcss.exe"
fi

echo "🔨 Building Tailwind CSS..."
"$BIN" -i ./src/input.css -o ./public/styles.css --minify
echo "✅ Done: public/styles.css ($(wc -c < public/styles.css) bytes)"
echo
echo "Deploy với: cd .. && npx wrangler deploy --dir cf-pos-demo"