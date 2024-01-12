import { initTelegramCommands } from './commands';

import { initDb } from './sqlite3Utils';
import { bot } from './telegramUtils';

(async () => {
  const db = await initDb();
  initTelegramCommands(db, bot);
  bot.launch();
})();
