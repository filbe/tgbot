import { bot } from "./utils";
import { initTelegramCommands } from "./telegram/commands";
import * as sqlite3 from "sqlite3";
import { dbWrapper } from "./telegram/sqlite3Utils";

let db: sqlite3.Database | undefined = new sqlite3.Database(
  "./tgbot.db",
  sqlite3.OPEN_READWRITE,
  (err) => {
    if (err) {
      console.error(err.message);
    }
  }
);

(async () => {
  // init db

  const sqlStatements = `
        /* tg bot user tables */
        CREATE TABLE IF NOT EXISTS User (
            userID INTEGER PRIMARY KEY,
            chatID INTEGER,
            username TEXT,
            firstname TEXT,
            isBot BOOLEAN,
            createdDate TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`;

  await dbWrapper(db, sqlStatements);

  initTelegramCommands(db, bot);
  bot.launch();
})();
