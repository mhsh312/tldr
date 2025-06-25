import dotenv from "dotenv";
dotenv.config();
import { GoogleGenAI } from "@google/genai";

import { Client, GatewayIntentBits } from "discord.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function gemini(text) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You're a discord chat summary bot named "TLDR bot" with command !tldr, summarise this in less than 300 words while mentioning who said what and use gender neutral pronouns. Discord doesn't allow more than 2,000 characters in a message so make sure to not exceed that. No additional text only summary: ${text}`,
    });
    return response;
  } catch (error) {
    console.error(error);
    const errorObject = JSON.parse(error.message);
    if (errorObject?.error?.code === 503) {
      const lite_response = await gemini_lite(text); // if flash is down, use lite
      return (
        "The flash model is overloaded, using lite model instead. " +
          lite_response?.text || lite_response
      );
    }
    return (
      errorObject?.error?.message ||
      "An error occurred while processing your request."
    );
  }
}

async function gemini_lite(text) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite-preview-06-17",
      contents: `You're a discord chat summary bot named "TLDR bot" with command !tldr, summarise this in less than 300 words while mentioning who said what and use gender neutral pronouns. Discord doesn't allow more than 2,000 characters in a message so make sure to not exceed that. No additional text only summary: ${text}`,
    });
    return response;
  } catch (error) {
    console.error(error);
    const errorObject = JSON.parse(error.message);
    return (
      errorObject?.error?.message ||
      "An error occurred while processing your request."
    );
  }
}

client
  .login(process.env.DISCORD_TOKEN)
  .then(() => {
    console.log("Bot is online!");
  })
  .catch((error) => {
    console.error(error);
  });

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.content.startsWith("!tldr")) {
    console.log(
      "Bot called by " +
        message.author.username +
        " " +
        message.author.displayName +
        " in " +
        message.channel.name
    );
    const args = message.content.split(" ");
    const x = parseInt(args[1], 10);

    if (isNaN(x)) {
      message.reply("wtf is this? give me a number!");
      return;
    } else if (x < 1) {
      message.reply("give a number greater than 0!");
      return;
    } else if (x > 99) {
      message.reply(
        "discord API doesn't allow more than a 99 at a time bestie!"
      );
      return;
    }

    const channel = message.channel;
    try {
      const messages = await channel.messages.fetch({ limit: x + 1 });
      const messagesArray = Array.from(messages.values()); // Convert the Collection to an array
      const reversedMessages = messagesArray.reverse();
      const filteredMessages = reversedMessages.filter(
        (msg) => !msg.author.bot && msg.id !== message.id
      );
      const oneGiantText = filteredMessages
        .map((msg) => `${msg.author.displayName}: ${msg.content}`)
        .join("\n");
      const response = await gemini(oneGiantText);
      message.reply(response?.text || response);
    } catch (error) {
      console.error("Error fetching messages: ", error);
      message.reply("Something went wrong sowee UWU");
    }
  }
});
