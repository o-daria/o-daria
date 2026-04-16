#!/bin/bash
# Hook A: Prompt seed reminder
# Fires after any Edit/Write. If the edited file is under src/prompts/templates/,
# reminds the developer to run seed-prompts and bump the version in registry.js.

input=$(cat)
file=$(echo "$input" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d.get('tool_input', {}).get('file_path', ''))
" 2>/dev/null)

if echo "$file" | grep -q 'src/prompts/templates/'; then
  echo "REMINDER: Prompt template edited."
  echo "  1. Bump the version string in src/prompts/registry.js"
  echo "  2. Run: npm run seed-prompts"
  echo "Skipping this will cause the DB and file to diverge silently."
fi

exit 0
