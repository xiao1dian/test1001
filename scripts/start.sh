#!/bin/bash
# Start DebateResearcher — then open in Chrome
cd "$(dirname "$0")/.."
PORT="${PORT:-5050}"
URL="http://debateresearcher.localhost:${PORT}"

echo ""
echo "  Starting DebateResearcher..."
echo "  URL: $URL"
echo ""

python3 app.py &
PID=$!
sleep 2

if curl -s -o /dev/null "http://127.0.0.1:${PORT}/"; then
  echo "  ✓ Server is running"
  echo "  Opening in browser..."
  open "$URL" 2>/dev/null || xdg-open "$URL" 2>/dev/null || echo "  Open this in Chrome: $URL"
else
  echo "  ✗ Server failed to start. Try: python3 app.py"
  kill $PID 2>/dev/null
  exit 1
fi

wait $PID
