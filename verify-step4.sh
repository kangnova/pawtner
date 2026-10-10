#!/bin/bash
set -e
BASE="http://localhost:3005"
JAR="/tmp/pawtner-step4-cookies.txt"
rm -f "$JAR"

echo "=== 1. login owner ==="
CSRF=$(curl -s -c "$JAR" "$BASE/api/auth/csrf" | python3 -c "import sys,json;print(json.load(sys.stdin)['csrfToken'])")
curl -s -b "$JAR" -c "$JAR" -X POST "$BASE/api/auth/callback/credentials" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "csrfToken=$CSRF" \
  --data-urlencode "email=owner@test.pawtner" \
  --data-urlencode "password=password123" \
  -o /dev/null -w 'login [HTTP %{http_code}]\n'

echo
echo "=== 2. siapkan customer + produk + batch 10 ==="
C=$(curl -s -b "$JAR" -X POST "$BASE/api/customers" -H 'Content-Type: application/json' \
  -d '{"name":"Subscriber Test","phone":"0811111111"}')
CID=$(echo "$C" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['id'])")
P=$(curl -s -b "$JAR" -X POST "$BASE/api/products" -H 'Content-Type: application/json' \
  -d '{"name":"Whiskas 1kg (sub)","unit":"PCS","price":50000}')
PID=$(echo "$P" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['id'])")
curl -s -b "$JAR" -X POST "$BASE/api/batches" -H 'Content-Type: application/json' \
  -d "{\"productId\":\"$PID\",\"quantity\":10}" -o /dev/null
echo "customerId: $CID | productId: $PID"

echo
echo "=== 3. buat langganan: tiap 7 hari, qty 2, diskon 10% ==="
SUB=$(curl -s -b "$JAR" -X POST "$BASE/api/subscriptions" -H 'Content-Type: application/json' \
  -d "{\"customerId\":\"$CID\",\"productId\":\"$PID\",\"frequencyDays\":7,\"quantity\":2,\"discountPct\":10}" -w '\n[HTTP %{http_code}]')
echo "$SUB"
SUB_ID=$(echo "$SUB" | head -1 | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['id'])")
echo "subscriptionId: $SUB_ID"

echo
echo "=== 4. list langganan (due harus true, total 90.000) ==="
curl -s -b "$JAR" "$BASE/api/subscriptions" | python3 -c "
import sys,json
for s in json.load(sys.stdin)['data']:
    print(s['customer']['name'], '|', s['quantity'], 'x', s['product']['name'], '| diskon', s['discountPct'], '| total', s['total'], '| due', s['due'])
"

echo
echo "=== 5. fulfill (harus 201, buat sale + majukan jadwal) ==="
FUL=$(curl -s -b "$JAR" -X POST "$BASE/api/subscriptions/$SUB_ID/fulfill" -w '\n[HTTP %{http_code}]')
echo "$FUL"

echo
echo "=== 6. cek stok (10 - 2 = 8) & jadwal (due harus false) ==="
curl -s -b "$JAR" "$BASE/api/products" | python3 -c "
import sys,json
for p in json.load(sys.stdin)['data']:
    if p['name']=='Whiskas 1kg (sub)': print('sellable:', p['sellable'])
"
curl -s -b "$JAR" "$BASE/api/subscriptions" | python3 -c "
import sys,json
for s in json.load(sys.stdin)['data']:
    print('nextRunAt:', s['nextRunAt'], '| due:', s['due'], '| lastRunAt:', s['lastRunAt'])
"

echo
echo "=== 7. pause (harus 200, status PAUSED) ==="
curl -s -b "$JAR" -X PATCH "$BASE/api/subscriptions/$SUB_ID" \
  -H 'Content-Type: application/json' -d '{"status":"PAUSED"}' \
  -o /dev/null -w 'pause [HTTP %{http_code}]\n'

echo
echo "=== 8. cancel (harus 200, status CANCELLED) ==="
curl -s -b "$JAR" -X PATCH "$BASE/api/subscriptions/$SUB_ID" \
  -H 'Content-Type: application/json' -d '{"status":"CANCELLED"}' \
  -o /dev/null -w 'cancel [HTTP %{http_code}]\n'

echo
echo "=== 9. halaman /subscriptions (harus 200) ==="
curl -s -b "$JAR" -o /dev/null -w 'GET /subscriptions [HTTP %{http_code}]\n' "$BASE/subscriptions"

echo
echo "=== 10. akses tanpa login (harus 401) ==="
curl -s -o /dev/null -w 'GET /api/subscriptions tanpa login [HTTP %{http_code}]\n' "$BASE/api/subscriptions"
