#!/bin/bash
set -e
BASE="http://localhost:3005"
JAR="/tmp/pawtner-step3-cookies.txt"
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
echo "=== 2. buat produk uji + batch 10 pcs (Rp 25.000) ==="
P=$(curl -s -b "$JAR" -X POST "$BASE/api/products" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Royal Canin 400g","unit":"PCS","price":25000,"minStockThreshold":2}')
PID=$(echo "$P" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['id'])")
echo "productId: $PID"
curl -s -b "$JAR" -X POST "$BASE/api/batches" \
  -H 'Content-Type: application/json' \
  -d "{\"productId\":\"$PID\",\"quantity\":10}" -o /dev/null -w 'batch masuk [HTTP %{http_code}]\n'

echo
echo "=== 3. jual 3 pcs tunai ==="
SALE=$(curl -s -b "$JAR" -X POST "$BASE/api/sales" \
  -H 'Content-Type: application/json' \
  -d "{\"paymentMethod\":\"CASH\",\"items\":[{\"productId\":\"$PID\",\"quantity\":3}]}" \
  -w '\n[HTTP %{http_code}]')
echo "$SALE"
SALE_ID=$(echo "$SALE" | head -1 | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['id'])")
echo "saleId: $SALE_ID"

echo
echo "=== 4. cek stok (harus 7 sellable) ==="
curl -s -b "$JAR" "$BASE/api/products" | python3 -c "
import sys,json
for p in json.load(sys.stdin)['data']:
    if p['name']=='Royal Canin 400g':
        print('sellable:', p['sellable'], '| total:', p['total'])
"

echo
echo "=== 5. jual melebihi stok (harus 409) ==="
curl -s -b "$JAR" -X POST "$BASE/api/sales" \
  -H 'Content-Type: application/json' \
  -d "{\"items\":[{\"productId\":\"$PID\",\"quantity\":999}]}" -w '[HTTP %{http_code}]\n'

echo
echo "=== 6. riwayat penjualan ==="
curl -s -b "$JAR" "$BASE/api/sales" | python3 -c "
import sys,json
for s in json.load(sys.stdin)['data']:
    print(s['invoiceNumber'], '|', s['paymentMethod'], '| total', s['total'], '| items', [(i['quantity'], i['product']['name']) for i in s['items']])
"

echo
echo "=== 7. struk /api/sales/[id] ==="
curl -s -b "$JAR" "$BASE/api/sales/$SALE_ID" -o /dev/null -w 'GET struk [HTTP %{http_code}]\n'

echo
echo "=== 8. halaman /sales (harus 200) ==="
curl -s -b "$JAR" -o /dev/null -w 'GET /sales [HTTP %{http_code}]\n' "$BASE/sales"

echo
echo "=== 9. akses tanpa login (harus 401) ==="
curl -s -o /dev/null -w 'GET /api/sales tanpa login [HTTP %{http_code}]\n' "$BASE/api/sales"
