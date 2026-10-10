#!/bin/bash
set -e
BASE="http://localhost:3005"
JAR="/tmp/pawtner-step1-cookies.txt"
rm -f "$JAR"

echo "=== 1. login owner (existing) ==="
CSRF=$(curl -s -c "$JAR" "$BASE/api/auth/csrf" | python3 -c "import sys,json;print(json.load(sys.stdin)['csrfToken'])")
curl -s -b "$JAR" -c "$JAR" -X POST "$BASE/api/auth/callback/credentials" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "csrfToken=$CSRF" \
  --data-urlencode "email=owner@test.pawtner" \
  --data-urlencode "password=password123" \
  -o /dev/null -w 'login [HTTP %{http_code}]\n'

echo
echo "=== 2. ambil produk yang ada ==="
PROD_ID=$(curl -s -b "$JAR" "$BASE/api/products" | python3 -c "import sys,json;d=json.load(sys.stdin)['data'];print(d[0]['id'] if d else '')")
echo "productId: $PROD_ID"

echo
echo "=== 3. batch A: 10 pcs, kadaluarsa 10 hari lagi (expiring soon) ==="
EXP_SOON=$(date -d '+10 days' +%F)
curl -s -b "$JAR" -X POST "$BASE/api/batches" \
  -H 'Content-Type: application/json' \
  -d "{\"productId\":\"$PROD_ID\",\"quantity\":10,\"expiryDate\":\"$EXP_SOON\"}" \
  -w '\n[HTTP %{http_code}]\n'

echo
echo "=== 4. batch B: 3 pcs, sudah kadaluarsa kemarin (expired) ==="
EXP_PAST=$(date -d '-1 day' +%F)
curl -s -b "$JAR" -X POST "$BASE/api/batches" \
  -H 'Content-Type: application/json' \
  -d "{\"productId\":\"$PROD_ID\",\"quantity\":3,\"expiryDate\":\"$EXP_PAST\"}" \
  -w '\n[HTTP %{http_code}]\n'

echo
echo "=== 5. batch C: 4 pcs, tanpa tanggal (non-expiring) ==="
curl -s -b "$JAR" -X POST "$BASE/api/batches" \
  -H 'Content-Type: application/json' \
  -d "{\"productId\":\"$PROD_ID\",\"quantity\":4}" \
  -w '\n[HTTP %{http_code}]\n'

echo
echo "=== 6. list batches ==="
curl -s -b "$JAR" "$BASE/api/batches" | python3 -m json.tool

echo
echo "=== 7. produk: stock summary (total/sellable/expired/expiringSoon/status) ==="
curl -s -b "$JAR" "$BASE/api/products" | python3 -c "import sys,json;d=json.load(sys.stdin)['data'][0];print({k:d[k] for k in ['name','unit','total','sellable','expired','expiringSoon','status']})"

echo
echo "=== 8. halaman /stock (harus 200) ==="
curl -s -o /dev/null -w 'GET /stock [HTTP %{http_code}]\n' "$BASE/stock"
