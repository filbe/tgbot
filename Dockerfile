FROM ghcr.io/filbe/diploi-tgbot-template

# Install application code
WORKDIR /app
COPY . .

RUN npm install
RUN npm run build
