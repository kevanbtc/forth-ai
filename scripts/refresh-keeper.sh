#!/bin/bash
# Refresh Keeper Script for PorManager
# Run via cron: */5 * * * * /path/to/refresh-keeper.sh

RPC_URL=$RPC_URL
PRIVATE_KEY=$PRIVATE_KEY
POR_MANAGER_ADDRESS=$POR_MANAGER_ADDRESS

# Call refresh() on PorManager
cast send $POR_MANAGER_ADDRESS "refresh()" --rpc-url $RPC_URL --private-key $PRIVATE_KEY

# Log success/failure
if [ $? -eq 0 ]; then
  echo "$(date): Refresh successful" >> refresh.log
else
  echo "$(date): Refresh failed" >> refresh.log
fi