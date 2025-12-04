#!/bin/bash
# Fix Next.js dev server 404 errors by clearing cache

echo "Clearing Next.js build cache..."
rm -rf .next
echo "Cache cleared!"

echo "Restarting dev server..."
npm run dev

