#!/bin/bash
set -e
BASE="http://localhost:3005"
JAR="/tmp/pawtner-step2-cookies.txt"
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
echo "=== 2. buat customer ==="
CUST=$(curl -s -b "$JAR" -X POST "$BASE/api/customers" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Budi Santoso","phone":"081234567890","email":"budi@example.com"}' \
  -w '\n[HTTP %{http_code}]')
echo "$CUST"
CUST_ID=$(echo "$CUST" | head -1 | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['id'])")
echo "customerId: $CUST_ID"

echo
echo "=== 3. buat pet (kucing, 2y) untuk customer itu ==="
BIRTH=$(date -d '-2 years' +%F)
PET=$(curl -s -b "$JAR" -X POST "$BASE/api/pets" \
  -H 'Content-Type: application/json' \
  -d "{\"customerId\":\"$CUST_ID\",\"name\":\"Mochi\",\"species\":\"CAT\",\"breed\":\"Persia\",\"birthDate\":\"$BIRTH\",\"weightKg\":4.2}" \
  -w '\n[HTTP %{http_code}]')
echo "$PET"
PET_ID=$(echo "$PET" | head -1 | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['id'])")
echo "petId: $PET_ID"

echo
echo "=== 4. list customers (harus ada 1 customer + 1 pet) ==="
curl -s -b "$JAR" "$BASE/api/customers" | python3 -c "
import sys,json
d=json.load(sys.stdin)['data']
print('customers:', len(d))
for c in d:
    print(' -', c['name'], '| pets:', [(p['name'], p['species'], p['weightKg']) for p in c['pets']])
"

echo
echo "=== 5. PATCH customer (ganti nama) ==="
curl -s -b "$JAR" -X PATCH "$BASE/api/customers/$CUST_ID" \
  -H 'Content-Type: application/json' -d '{"name":"Budi S. (updated)"}' \
  -w '\n[HTTP %{http_code}]\n'

echo
echo "=== 6. PATCH pet (ganti berat) ==="
curl -s -b "$JAR" -X PATCH "$BASE/api/pets/$PET_ID" \
  -H 'Content-Type: application/json' -d '{"weightKg":5.1}' \
  -w '\n[HTTP %{http_code}]\n'

echo
echo "=== 7. akses tanpa login (harus 401) ==="
curl -s -o /dev/null -w 'GET /api/customers tanpa login [HTTP %{http_code}]\n' "$BASE/api/customers"

echo
echo "=== 8. halaman /customers (harus 200) ==="
curl -s -b "$JAR" -o /dev/null -w 'GET /customers [HTTP %{http_code}]\n' "$BASE/customers"

echo
echo "=== 9. DELETE pet, lalu DELETE customer (cascade) ==="
curl -s -b "$JAR" -X DELETE "$BASE/api/pets/$PET_ID" -w 'DELETE pet [HTTP %{http_code}]\n'
curl -s -b "$JAR" -X DELETE "$BASE/api/customers/$CUST_ID" -w 'DELETE customer [HTTP %{http_code}]\n'

echo
echo "=== 10. list customers (harus kosong lagi) ==="
curl -s -b "$JAR" "$BASE/api/customers" | python3 -c "import sys,json;print('customers:', len(json.load(sys.stdin)['data']))"
