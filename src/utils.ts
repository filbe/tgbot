import { Telegraf } from "telegraf";
import { env } from "../.env";

export interface Chat {
  id: number;
  username: string;
}
export const bot = new Telegraf(env.TG_BOT_API_KEY || '');
