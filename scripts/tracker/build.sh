#!/bin/sh
if [ -f "scripts/tracker/index.js" ]; then
    if [ ! -d "public/tracker" ]; then
        mkdir -p public/tracker
    fi
    pnpm uglifyjs scripts/tracker/index.js -o public/tracker/index.js --compress --mangle
fi
