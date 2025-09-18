ratio=$(curl -s "http://prometheus:9090/api/v1/query?query=rate(discord_bot_requests_errors_total%5B5m%5D)%20/%20clamp_min(rate(discord_bot_requests_total%5B5m%5D),1)" \
 | jq -r '.data.result[0].value[1] // 0')
awk "BEGIN {exit !($ratio > 0.15)}" && docker compose -f ops/onebox/docker-compose.yml restart discord-bot || true