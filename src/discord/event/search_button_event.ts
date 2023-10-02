import { ActionRowBuilder, ButtonBuilder, ButtonComponent, ButtonInteraction, ButtonStyle, CacheType, ComponentType, Interaction, Message } from "discord.js";
import { CustomDiscordEvent, MyClient } from "../app.js";
import { SearchCommand, SearchString } from "../commands/search.js";
import { ComponentTimeout } from "../utils/component_timeout.js";

export class SearchButtonEvent implements CustomDiscordEvent {
    prefix: string = "search_button";
    once: boolean = false;
    
    async execute(interaction : ButtonInteraction<CacheType>, message : SearchString[], currentMessage : number, count : number, timeout : ComponentTimeout) : Promise<void>  {
        await interaction.deferUpdate();

        if(!interaction.message.editable) {
            return;
        }

        const myClient = interaction.client as MyClient;

        if(!myClient.functionValues.has(interaction.message.id)) {
            await SearchButtonEvent.keepLinkButtonOnlyOrDeleteAll(interaction.message);
            return;
        }

        timeout.clearComponentTimeout(interaction.message);

        //const collectorFilter = (i: { user: { id: string; }; }) => i.user.id === interaction.user.id;

        const previous = new ButtonBuilder()
			.setCustomId('search_button_previous_result')
			.setLabel('Previous')
			.setStyle(ButtonStyle.Primary);

		const next = new ButtonBuilder()
			.setCustomId('search_button_next_result')
			.setLabel('Next')
			.setStyle(ButtonStyle.Primary);

        let row : ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>();

        if(interaction.customId == "search_button_next_result" && currentMessage < count) {
            ({ currentMessage } = await this.nextMenuItem(currentMessage, previous, next, count, message, row, interaction));

        } else if(interaction.customId == "search_button_previous_result" && currentMessage > 0) {
            ({ currentMessage } = await this.previousMenuItem(currentMessage, next, previous, message, row, interaction));
            
        }

        timeout.scheduleComponentTimeout(interaction.message, 15 * 60 * 1000, SearchButtonEvent.keepLinkButtonOnlyOrDeleteAll);
        myClient.functionValues.set(interaction.message.id, [message, currentMessage, count, timeout]);
    }

    private async previousMenuItem(currentMessage: number, next: ButtonBuilder, previous: ButtonBuilder, message: SearchString[], row: ActionRowBuilder<ButtonBuilder>, interaction: ButtonInteraction<CacheType>) {
        currentMessage--;
        next.setDisabled(false);
        previous.setDisabled(false);

        if (currentMessage == 0) {
            previous.setDisabled(true);

        }

        if (message[currentMessage].url) {
            const source = new ButtonBuilder()
                .setLabel('Source')
                .setStyle(ButtonStyle.Link)
                .setURL(message[currentMessage].url ?? '');

            row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(previous, next, source);

        } else {
            row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(previous, next);
        }

        await interaction.message.edit({ content: message[currentMessage].content, components: [row] });
        return { currentMessage };
    }

    private async nextMenuItem(currentMessage: number, previous: ButtonBuilder, next: ButtonBuilder, count: number, message: SearchString[], row: ActionRowBuilder<ButtonBuilder>, interaction: ButtonInteraction<CacheType>) {
        currentMessage++;
        previous.setDisabled(false);
        next.setDisabled(false);

        if (currentMessage == count - 1) {
            next.setDisabled(true);
        }



        if (message[currentMessage].url) {
            const source = new ButtonBuilder()
                .setLabel('Source')
                .setStyle(ButtonStyle.Link)
                .setURL(message[currentMessage].url ?? '');

            row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(previous, next, source);

        } else {
            row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(previous, next);
        }

        await interaction.message.edit({ content: message[currentMessage].content, components: [row] });
        return { currentMessage };
    }

    public static async keepLinkButtonOnlyOrDeleteAll(message : Message) {
                //Get the Link Button (source) and only add it aka remove the other buttons
                const buttons = message.components[0]

                for (const button of buttons.components) {
                    if(button.type == ComponentType.Button) {
                        if(button.url) {
                            await message.edit({ components: [new ActionRowBuilder<ButtonBuilder>().addComponents(ButtonBuilder.from(button))] });
                            return;
                        }
                    }
                }

                await message.edit({ components: [] });
    }

}