#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Project 05 — traffic distribution test
#
# Usage: bash test-nlb.sh <YOUR-NLB-DNS> [requests]
#
# Each curl opens a new TCP connection, so the NLB's flow hash can pick a
# different target each time. Prints which instance answered each request
# and a per-instance summary.
# ---------------------------------------------------------------------------
set -euo pipefail

NLB_DNS="${1:-}"
COUNT="${2:-20}"

if [[ -z "$NLB_DNS" || "$NLB_DNS" == \<* ]]; then
  echo "Usage: bash test-nlb.sh <YOUR-NLB-DNS> [requests]" >&2
  exit 1
fi

echo "1) Reachability"
curl -sS -o /dev/null -w "   HTTP %{http_code} in %{time_total}s\n" "http://$NLB_DNS/"

echo "2) Distribution over $COUNT new TCP connections"
declare -A hits=()
for i in $(seq 1 "$COUNT"); do
  body=$(curl -sS --max-time 5 "http://$NLB_DNS/instance.json" || echo '{}')
  id=$(echo "$body" | grep -o '"instance_id": *"[^"]*"' | cut -d'"' -f4)
  az=$(echo "$body" | grep -o '"availability_zone": *"[^"]*"' | cut -d'"' -f4)
  id="${id:-no-response}"
  hits[$id]=$(( ${hits[$id]:-0} + 1 ))
  printf "   #%03d  %-22s %s\n" "$i" "$id" "$az"
done

echo "3) Summary"
for id in "${!hits[@]}"; do
  printf "   %-22s %3d requests\n" "$id" "${hits[$id]}"
done

if (( ${#hits[@]} > 1 )); then
  echo "   ✓ Traffic reached ${#hits[@]} different instances."
else
  echo "   ! Only one instance answered. Check target health and that both instances are InService."
fi
