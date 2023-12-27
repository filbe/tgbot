import { Telegraf } from "telegraf";
import * as sqlite3 from "sqlite3";
import { mandatoryCommands } from "./mandatoryCommands";
import { BotCommandHelp, botCommand } from "./util";


export const TG_CONF = { parse_mode: "HTML" as const };

export interface Command {
  commandName: string;
  noParams: boolean;
  help: BotCommandHelp;
}

export const initTelegramCommands = (db: sqlite3.Database, bot: Telegraf) => {
  const commands: Command[] = [
    ...mandatoryCommands(db, bot),
  ];

  botCommand({
    db,
    bot,
    commandName: "help",
    argsMinLength: 0,
    help: {
      info: "Show this command",
      usage: "/help",
    },
    callback: async ({ ctx }) => {
      const allCommands = commands
        .map((command) => {
          return commandHelp(command, true);
        })
        .join(`\n`);

      await ctx.reply(`*Help*\n${allCommands}`, {
        parse_mode: "Markdown",
      });
    },
  });
};

export const commandHelp = (command: Command, onlyInfo?: boolean) => {
  const { help } = command;
  const { info, usage, example } = help;
  return `*/${command.commandName}* - _${info}_${
    !onlyInfo
      ? `Usage: \`\`\`${usage}\`\`\` ${
          example
            ? `
          Example: \`\`\`${example}\`\`\``
            : ``
        }`
      : ``
  }`;
};
