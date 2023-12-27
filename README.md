# Telegram Bot on Diploi

Want to develop and host your full Telegram Bot application on the cloud in minutes? This repo is for you!

## Setup

1. Create your free Diploi account here: [https://diploi.com](https://diploi.com)
2. In Diploi, create a new **Project** with a **Telegram Bot** template.
3. Create a new **Deployment** under your project.
4. In the **Telegram app**, find a user named _BotFather_.
5. Send the `/newbot` command to it to create a new bot.
   It will ask for a name for your bot.
   **Note: Users can find your Telegram Bot by its name, so choose wisely!**
6. Under the Diploi Deployment **Options** tab, find your **Environment Variables**.
   Paste your Telegram Bot token given by *BotFather* there, and save.

Now you should be able to use the bot and start developing it right away in Diploi.

**Note: You should create one bot (token) for each Diploi Deployment**
(e.g., separate bots for _development_, _staging_, and _production_ environments, respectively).
