import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import * as sqlite3 from 'sqlite3';
import { BotCommandHelp, botCommand, messageEveryone } from './telegramUtils';
import { rowFromDb, saveToDb } from './sqlite3Utils';
import OpenAI from 'openai';
import fs from 'fs';
import https from 'https';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export const TG_CONF = { parse_mode: 'HTML' as const };

export interface Command {
  commandName: string;
  noParams: boolean;
  help: BotCommandHelp;
}

export const initTelegramCommands = (db: sqlite3.Database, bot: Telegraf) => {
  // let's define some commands

  // getting the value of botCommand is optional; here it is used to capture the command metadata
  // that is used with /help command, but this could be simplified
  const startCommand = botCommand({
    db,
    bot,
    commandName: 'start', // definition of a command (don't include slash to commandName)
    help: {
      // information for /help command
      info: 'Start using Telegram bot.',
      usage: '/start',
    },
    callback: async ({ ctx }) => {
      // this callback is triggered, when bot receives the command message from the user

      // let's read the user information
      const { id, is_bot, first_name, username } = ctx.from;
      // get the user data from our sqlite3 database in case it exists
      const foundUser = await rowFromDb(db, 'User', { userID: id });
      if (foundUser) {
        // yippee, found one! Let's welcome the user back
        await ctx.reply(`Welcome back, ${first_name}!`, TG_CONF);
      } else {
        // This is a new user, so let's inform the other users we have a new guy in
        await messageEveryone(
          db,
          bot,
          `${first_name} (${username}) started using TGBOT`,
          id
        );
        // ...and let's greet the new guy
        await ctx.reply(`TGBot activated!`, TG_CONF);
        // finally, let's save the user data in the database so it could be recognized afterwards
        await saveToDb(db, 'User', {
          userID: id,
          isBot: is_bot,
          firstname: first_name,
          username: username || '',
          chatID: (await ctx.getChat()).id,
        });
      }
    },
  });

  const commands: Command[] = [startCommand];

  botCommand({
    db,
    bot,
    commandName: 'help',
    argsMinLength: 0,
    help: {
      info: 'Show this command',
      usage: '/help',
    },
    callback: async ({ ctx }) => {
      const allCommands = commands
        .map((command) => {
          return commandHelp(command, true);
        })
        .join(`\n`);

      await ctx.reply(`*Help*\n${allCommands}`, {
        parse_mode: 'Markdown',
      });
    },
  });

  // example how to integrate Telegram both with OpenAI API

  // let's create a basic chatbot that uses gpt 3.5
  const hasOpenAIAPIKey = !!process.env.OPENAI_API_KEY;

  const openai = hasOpenAIAPIKey
    ? new OpenAI({
        apiKey: process.env.OPENAI_API_KEY, // put this to your Diploi Deployment -> Options -> Environment variables
      })
    : null;

  if (openai) {
    const chatHistory: { [key: number]: ChatCompletionMessageParam[] } = {};

    bot.on(message('text'), async (ctx) => {
      const { id } = ctx.from;
      if (!chatHistory[id]) {
        chatHistory[id] = [];
      }
      chatHistory[id].push({
        role: 'user' as const,
        content: ctx.message.text,
      });
      try {
        const completion = await openai.chat.completions.create({
          messages: [
            {
              role: 'system' as const,
              content:
                'I am a super intelligent AI assistant that runs inside Telegram bot',
            },
            ...chatHistory[id],
          ],
          model: 'gpt-3.5-turbo-1106',
          response_format: { type: 'text' },
          n: 1,
          presence_penalty: 0.2,
          stream: false,
        });
        const gptAnswer = completion.choices[0].message.content;

        // Reply to the user with the answer
        ctx.reply(`${gptAnswer}`);

        // save the conversation history
        chatHistory[id].push({
          role: 'assistant' as const,
          content: gptAnswer,
        });
      } catch (error) {
        console.error(error);
        ctx.reply('An error occurred while processing your request.');
      }
    });

    bot.on(message('photo'), async (ctx) => {
      const { id } = ctx.from;
      try {
        let imageDescriptions = [];
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const file_id = photo.file_id;
        const fileLink = await ctx.telegram.getFileLink(file_id);

        const responseStream = await openai.beta.chat.completions.stream({
          model: 'gpt-4-vision-preview',
          frequency_penalty: 2.0,
          n: 1,
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Tell me what do you see in this picture.',
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: fileLink.href,
                  },
                },
              ],
            },
          ],
        });

        const imageDescriptionCompletion =
          await responseStream.finalChatCompletion();
        const imageDescription =
          imageDescriptionCompletion.choices[0].message.content;

        // Reply to the user with the analysis
        if (!chatHistory[id]) {
          chatHistory[id] = [];
        }
        chatHistory[id].push({
          role: 'system' as const,
          content:
            'User has provided a photo, and the photo contents description is here: ' +
            imageDescription,
        });
        imageDescriptions.push(imageDescription);

        ctx.reply(`${imageDescriptions.join('\n\n')}`);
      } catch (error) {
        console.error(error);
        ctx.reply('An error occurred while processing your request.');
      }
    });
  } else {
    bot.on(message('text'), async (ctx) => {
      ctx.reply(
        `I'm unable to answer as I'm a dummy bot. Do you have your OpenAI credentials configured in DIploi?`
      );
    });
  }
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
