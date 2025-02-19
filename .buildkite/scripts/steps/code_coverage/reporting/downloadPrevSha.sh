#!/usr/bin/env bash

set -euo pipefail

# TODO: Safe to remove this after 2024-03-01 (https://github.com/elastic/kibana/issues/175904)
gsutil -m cp -r gs://elastic-bekitzur-kibana-coverage-live/previous_pointer/previous.txt . || echo "### Previous Pointer NOT FOUND?"

# TODO: Activate after the above is removed
#gsutil -m cp -r gs://elastic-kibana-coverage-live/previous_pointer/previous.txt . || echo "### Previous Pointer NOT FOUND?"

if [ -e ./previous.txt ]; then
    mv previous.txt downloaded_previous.txt
    echo "### downloaded_previous.txt"
    cat downloaded_previous.txt
fi
