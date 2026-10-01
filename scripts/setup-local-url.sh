#!/bin/bash
# Map debateresearcher.local → this machine so the site opens at a clean URL.
HOSTS_LINE="127.0.0.1 debateresearcher.local"
HOSTS_FILE="/etc/hosts"

if grep -q "debateresearcher.local" "$HOSTS_FILE" 2>/dev/null; then
  echo "✓ debateresearcher.local is already in $HOSTS_FILE"
else
  echo "Adding debateresearcher.local to $HOSTS_FILE (requires sudo)…"
  echo "$HOSTS_LINE" | sudo tee -a "$HOSTS_FILE" > /dev/null
  echo "✓ Added. Open http://debateresearcher.local:5050"
fi
