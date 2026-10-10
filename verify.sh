#!/bin/bash
set -e
BASE="http://localhost:3005"
JAR="/tmp/pawtner-cookies.txt"
rm -f "$JAR"

echo "=== 1. tunggu server siap ==="
for i in $(seq 1 25); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/" 2>/dev/null)
  [ "$code" = "200" ] && { echo "server up (HTTP 200)"; break; }
  sleep 2
done

echo
echo "=== 2. register owner ==="
curl -s -X POST "$BASE/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test Owner","email":"owner@test.pawtner","password":"password123","storeName":"Test Petshop"}' \
  -w '\n[HTTP %{http_code}]\n'

echo
echo "=== 3. CSRF + login ==="
CSRF=$(curl -s -c "$JAR" "$BASE/api/auth/csrf" | python3 -c "import sys,json;print(json.load(sys.stdin)['csrfToken'])")
echo "csrfToken: ${CSRF:0:20}..."
curl -s -b "$JAR" -c "$JAR" -X POST "$BASE/api/auth/callback/credentials" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "csrfToken=$CSRF" \
  --data-urlencode "email=owner@test.pawtner" \
  --data-urlencode "password=password123" \
  -o /dev/null -w 'login [HTTP %{http_code}]\n'

echo
echo "=== 4. session (harus ada storeId) ==="
curl -s -b "$JAR" "$BASE/api/auth/session" | python3 -c "import sys,json;d=json.load(sys.stdin);u=d.get('user',{});print('email:',u.get('email'));print('role:',u.get('role'));print('storeId:',u.get('storeId'))"

echo
echo "=== 5. buat produk (harus 201) ==="
curl -s -b "$JAR" -X POST "$BASE/api/products" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Whiskas Dry 1kg","unit":"KG","price":55000,"costPrice":45000,"minStockThreshold":5}' \
  -w '\n[HTTP %{http_code}]\n'

echo
echo "=== 6. list produk (harus ada 1, stock 0) ==="
curl -s -b "$JAR" "$BASE/api/products" -w '\n[HTTP %{http_code}]\n'

echo
echo "=== 7. akses tanpa login (harus 401) ==="
curl -s "$BASE/api/products" -w '\n[HTTP %{http_code}]\n'
