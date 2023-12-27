FROM ghcr.io/filbe/diploi-tgbot-template:main

# Install application code
WORKDIR /app
COPY . .

RUN npm install
RUN npm run build

RUN touch tgbot.db