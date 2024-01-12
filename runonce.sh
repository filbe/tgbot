#!/bin/sh

progress() {
  current_date=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  local action="$1"
  echo "🟩 $current_date $action"
}

# Perform tasks at controller pod startup
progress "Runonce started";

# Now that everything is initialized, start all services
supervisorctl start tgbot

progress "Runonce done";

exit 0;
