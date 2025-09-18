FROM node:20-slim

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY src ./src
COPY .env.example ./

# Optional: install PowerShell if you want USE_POWERSHELL=1
# RUN apt-get update && apt-get install -y wget apt-transport-https software-properties-common \
#     && wget -q https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb \
#     && dpkg -i packages-microsoft-prod.deb \
#     && apt-get update && apt-get install -y powershell \
#     && pwsh --version

CMD ["node", "src/bot.js"]