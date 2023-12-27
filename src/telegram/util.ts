import { Context, NarrowedContext, Telegraf } from "telegraf";
import { TG_CONF, commandHelp } from "./commands";
import * as sqlite3 from "sqlite3";
import { Message, Update } from "telegraf/typings/core/types/typegram";
import { rowsFromDb } from "./sqlite3Utils";

type BotCommandContext = NarrowedContext<
  Context<Update>,
  {
    message: Update.New & Update.NonChannel & Message.TextMessage;
    update_id: number;
  }
>;

interface CallbackParams {
  db: sqlite3.Database;
  ctx: BotCommandContext;
  commandName: string;
  args: string[];
}

export interface BotCommandHelp {
  info: string;
  usage: string;
  example?: string;
}
interface BotCommandParams {
  db: sqlite3.Database;
  bot: Telegraf;
  commandName: string;
  argsMinLength?: number;
  help: BotCommandHelp;
  callback: (params: CallbackParams) => void;
}
export const botCommand = (params: BotCommandParams) => {
  const { db, bot, commandName, argsMinLength, help, callback } =
    params;
  bot.command(commandName, async (ctx: BotCommandContext) => {
    try {
      const args = ctx.message.text
        .replace(`/${commandName}`, "")
        .split(" ");
      if ((args.length - 1) < (argsMinLength || 0)) {
        ctx.reply(
          `${commandHelp({
            commandName,
            noParams: !argsMinLength,
            help,
          })}`,
          {
            ...TG_CONF,
            parse_mode: "Markdown",
          }
        );
        return;
      }
      callback({ db, ctx, commandName, args });
    } catch (e) {
      console.log(e);
    }
  });
  return { commandName, noParams: !argsMinLength, help }; // return reference (name for now)
};

export const messageEveryone = async(db: sqlite3.Database, bot: Telegraf, msg: string, excludeUserID?: number) => {
  const users: {userID: number, isBot: boolean, firstname: string, username: string, chatID: number}[] = (await rowsFromDb(db, "User", null)) as any || [];
  for (const user of users) {
    if (user.userID == excludeUserID) continue;
    bot.telegram.sendMessage(user.chatID, msg);
  }
}