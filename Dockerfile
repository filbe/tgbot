FROM ghcr.io/filbe/diploi-tgbot-template:main

# Install application code
WORKDIR /app
COPY . .

RUN npm install
RUN npm run build

COPY runonce.sh /usr/local/bin/runonce.sh

# Ensure that telegram bot will have its sqlite3 file available during the start
RUN touch tgbot.db

# This is the project level supervisor config that includes only in-project configs
# All Diploi-level dependent configs are in template level, so you could just rely on it
# Feel free to add your own supervisor processes in this file!
COPY supervisord-tgbot.conf /etc/supervisord-tgbot.conf
# we still need to reload supervisor to make it work
CMD /usr/bin/supervisord -c /etc/supervisord.conf; tail -f /dev/null
