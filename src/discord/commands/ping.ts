import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../app.js";

export class PingCommand implements Command {

    readonly cooldown = 5;

    readonly data = new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Replies with pong");

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();
        await interaction.editReply("Pong");
    };
}

