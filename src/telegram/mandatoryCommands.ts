import { Telegraf } from "telegraf";
import { TG_CONF } from "./commands";
import * as sqlite3 from "sqlite3";
import { botCommand, messageEveryone } from "./util";
import { cellFromDb, rowFromDb, saveToDb } from "./sqlite3Utils";

export const mandatoryCommands = (db: sqlite3.Database, bot: Telegraf) => [
  botCommand({
    db,
    bot,
    commandName: "start",
    help: {
      info: "Start using Telegram bot.",
      usage: "/start",
    },
    callback: async ({ ctx }) => {
      const {id, is_bot, first_name, username} = ctx.from;
      const foundUser = await rowFromDb(db, "User", {userID: id});
      if (foundUser) {
        await ctx.reply(
          `Welcome back! ${JSON.stringify(foundUser)}`,
          TG_CONF
        );
      } else {
        await messageEveryone(db, bot, `${username} (${first_name}) started using TGBOT`, id);
        await ctx.reply(
          `TGBot activated!`,
          TG_CONF
        );
        await saveToDb(db, "User", {userID: id, isBot: is_bot, firstname: first_name, username: username || '', chatID: (await ctx.getChat()).id});
      }
      
    },
  }),
];
