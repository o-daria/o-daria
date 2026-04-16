#!/bin/bash
# Hook B: Injection pattern guard
# Fires after any Edit/Write to inputSanitizer.js.
# Counts INJECTION_PATTERNS entries and blocks (exit 2) if the count dropped below 15.

BASELINE=15

input=$(cat)
file=$(echo "$input" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d.get('tool_input', {}).get('file_path', ''))
" 2>/dev/null)

if echo "$file" | grep -qE 'inputSanitizer\.js$'; then
  count=$(grep -cE '^\s+/.*/(g?i?,?)$' "$file" 2>/dev/null || echo 0)
  if [ "$count" -lt "$BASELINE" ]; then
    echo "SAFETY VIOLATION: INJECTION_PATTERNS shrank to $count entries (baseline: $BASELINE)."
    echo "Never remove injection patterns — only add new ones."
    echo "Revert the removal or this edit will be blocked."
    exit 2
  fi
fi

exit 0
