#!/bin/bash
# Notion API helper for Claude Code remote sessions
# Usage:
#   ./scripts/notion.sh search "검색어"
#   ./scripts/notion.sh db-list
#   ./scripts/notion.sh page-get <page_id>
#   ./scripts/notion.sh db-query <database_id>

TOKEN="${NOTION_TOKEN:-$(cat ~/.config/dasida/notion-token 2>/dev/null)}"
if [ -z "$TOKEN" ]; then
  echo "Error: NOTION_TOKEN 환경변수 또는 ~/.config/dasida/notion-token 파일이 필요합니다." >&2
  exit 1
fi
DASIDA_DB_ID="5d997b1c-3dae-44e5-bee8-713e35685697"

notion_api() {
  local method="$1"
  local path="$2"
  local data="${3:-}"

  if [ -n "$data" ]; then
    curl -s -X "$method" "https://api.notion.com/v1$path" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Notion-Version: 2022-06-28" \
      -H "Content-Type: application/json" \
      -d "$data"
  else
    curl -s -X "$method" "https://api.notion.com/v1$path" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Notion-Version: 2022-06-28"
  fi
}

case "$1" in
  search)
    notion_api POST "/search" "{\"query\": \"${2:-}\", \"page_size\": 10}" | python3 -m json.tool
    ;;
  db-list)
    notion_api POST "/search" '{"filter": {"value": "database", "property": "object"}, "page_size": 20}' \
      | python3 -c "import json,sys; d=json.load(sys.stdin); [print(f\"{r['id']}  {r['title'][0]['plain_text'] if r.get('title') else '(no title)'}\") for r in d.get('results', [])]"
    ;;
  db-query)
    DB_ID="${2:-$DASIDA_DB_ID}"
    notion_api POST "/databases/$DB_ID/query" '{"page_size": 20}' | python3 -m json.tool
    ;;
  page-get)
    notion_api GET "/pages/$2" | python3 -m json.tool
    ;;
  dasida-list)
    notion_api POST "/databases/$DASIDA_DB_ID/query" '{"page_size": 20}' \
      | python3 -c "
import json, sys
d = json.load(sys.stdin)
for r in d.get('results', []):
    props = r.get('properties', {})
    title_prop = props.get('이름') or props.get('Name') or props.get('제목') or {}
    title_list = title_prop.get('title', [])
    title = title_list[0]['plain_text'] if title_list else '(no title)'
    status_prop = props.get('상태', {}).get('status') or {}
    status = status_prop.get('name', '-')
    print(f\"{r['id']}  [{status}]  {title}\")
"
    ;;
  *)
    echo "Usage: $0 {search|db-list|db-query|page-get|dasida-list} [args]"
    exit 1
    ;;
esac
