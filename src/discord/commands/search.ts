import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, CacheType, ChatInputCommandInteraction, ComponentType, Message, SlashCommandBuilder, blockQuote, italic } from "discord.js";
import { Command } from "../app.js";
import { QdrantClient } from "@qdrant/js-client-rest";
import axios from "axios";
import { stripIndents } from "common-tags";
import { ComponentTimeout } from "../utils/component_timeout.js";

type TensorType = {
    dims: number[];
    type: string;
    data: {
        [key: string]: number;
    }
    size: number;
}

type Result = {
    id: string;
    vector: number[];
    payload?: {
      content: string;
      metadata: {
        title?: string;
        date?: Date;
        source?: string;
        course?: string;
        book?: { isbn: string; title: string };
        author?: string;
      };
      location: {
        previous_chunk: string;
        next_chunk: string;
      };
      loc: {
        lines: {
            from: number;
            to: number;
        }
      }
    };
}

export type SearchString = {
    content: string;
    url?: string;
}

export class SearchCommand implements Command {

    private readonly qdrant : QdrantClient;

    private readonly timeout : ComponentTimeout = new ComponentTimeout();

    readonly cooldown = 5;

    //15min
    private static readonly TIMEOUT_N = 15 * 60 * 1000;

    readonly data = new SlashCommandBuilder()
        .setName("search")
        .setDescription("Searches a given term")
        .addStringOption(option => option.setName("term").setDescription("The term to search for (only use English)").setMinLength(1).setMaxLength(512).setRequired(true))
        .addIntegerOption(option => option.setName("count").setDescription("The number of results to return").setMinValue(2).setMaxValue(15).setRequired(false));


    private readonly previousButtonId = 'search_button_previous_result';

    private readonly nextButtonId = 'search_button_next_result';

    private readonly currentButtonId = 'search_button_current';

    constructor(qdrant: QdrantClient) {
        this.qdrant = qdrant;
    }

    /**
     * Executes the search command.
     * @param interaction - The interaction object.
     * @returns Promise<void>
     */
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
        const term = interaction.options.getString("term");

        const response = await axios.get(`http://localhost:${port}/?search=${encodeURIComponent(term as string)}`);
        const tensor: TensorType = await response.data;
        const count = interaction.options.getInteger("count") ?? 5;

        const data = Object.values(tensor.data).map(Number);

        const result = await this.searchQdrant(this.qdrant, data, count);
        const message = await this.createMessage(result);

        let currentMessage = 0;

        const row = this.createButtons(message, currentMessage, count);

        const reply = await interaction.editReply({
            content: message[currentMessage].content,
            components: [row],
        });



        const collector = reply.createMessageComponentCollector({ 
            filter: (i: { user: { id: string; }; }) => i.user.id === interaction.user.id,
            componentType: ComponentType.Button,
            time: SearchCommand.TIMEOUT_N });
        

        const previous = new ButtonBuilder()
			.setCustomId(this.previousButtonId)
			.setLabel('Prev')
			.setStyle(ButtonStyle.Primary);

		const next = new ButtonBuilder()
			.setCustomId(this.nextButtonId)
			.setLabel('Next')
			.setStyle(ButtonStyle.Primary);

        collector.on("collect", async (interaction) => {  
            interaction.deferUpdate(); 
            if(interaction.customId == this.nextButtonId && currentMessage < count) {
                ({ currentMessage } = await this.nextMenuItem(currentMessage, previous, next, count, message, row, interaction));
    
            } else if(interaction.customId == this.previousButtonId && currentMessage > 0) {
                ({ currentMessage } = await this.previousMenuItem(currentMessage, previous, next, count, message, row, interaction));
            }
            collector.resetTimer();
        });

        collector.on("end", async () => {
            await SearchCommand.keepLinkButtonOnlyOrDeleteAll(reply);
        });

    }

    private async searchQdrant(qdrant: QdrantClient, data: number[], count: number): Promise<Result[]> {
        const result = await qdrant.search("test", {vector: data, limit: count});

        const promises = result.map((point) => {
            return point as Result;
        });


        return Promise.all(promises);
        
    }

    /**
     * Creates a message to be sent in response to a search query.
     * @param result An array of Result objects containing information about the search results.
     * @returns An array of SearchString objects containing the constructed message and the URL of the source.
     */
    private async createMessage(result: Result[]) : Promise<SearchString[]> {
        const message : SearchString[] = [];
        const max_content_length = 2000;

        for(const item of result) {

            const title = item.payload?.metadata.title ? `# ${item.payload?.metadata.title}` : "";
            let content = item.payload?.content ? blockQuote(item.payload?.content) : "";
            const author = item.payload?.metadata.author ? "by " + italic(item.payload?.metadata.author) : "by " + italic("Unknown");

            const construct_lenght = title.length + content.length + author.length + 4;

            if(construct_lenght  > max_content_length) {
                const to_cut = construct_lenght - max_content_length + 4;
                content = content.slice(0, -to_cut) + " ...";
            }

            const construction = stripIndents`
            ${title}\n
            ${content}\n
            ${author}\n
            `;
            message.push({content: construction, url: item.payload?.metadata.source});
        }

        return message;
    }

    /**
     * Displays the previous menu item in a list of search results.
     * @param currentMessage The current message index.
     * @param next The ButtonBuilder for the "Next" button.
     * @param previous The ButtonBuilder for the "Previous" button.
     * @param message An array of SearchString objects representing the search results.
     * @param row An ActionRowBuilder for the row of buttons.
     * @param interaction The ButtonInteraction that triggered the method.
     * @returns An object containing the updated current message index.
     */
    private async previousMenuItem(currentMessage: number, previous: ButtonBuilder, next: ButtonBuilder, count: number, message: SearchString[], row: ActionRowBuilder<ButtonBuilder>, interaction: ButtonInteraction<CacheType>) {
        currentMessage--;
        next.setDisabled(false);
        previous.setDisabled(false);

        if (currentMessage == 0) {
            previous.setDisabled(true);

        }
        const currentPage = new ButtonBuilder()
            .setCustomId(this.currentButtonId)
            .setLabel(`${currentMessage + 1}/${count}`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true);

        if (message[currentMessage].url) {
            const source = new ButtonBuilder()
                .setLabel('Source')
                .setStyle(ButtonStyle.Link)
                .setURL(message[currentMessage].url ?? '');

            row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(previous, currentPage, next, source);

        } else {
            row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(previous, currentPage, next);
        }

        await interaction.message.edit({ content: message[currentMessage].content, components: [row] });
        return { currentMessage };
    }

        /**
     * Displays the next menu item in a list of search results.
     * @param currentMessage The current message index.
     * @param next The ButtonBuilder for the "Next" button.
     * @param previous The ButtonBuilder for the "Previous" button.
     * @param message An array of SearchString objects representing the search results.
     * @param row An ActionRowBuilder for the row of buttons.
     * @param interaction The ButtonInteraction that triggered the method.
     * @returns An object containing the updated current message index.
     */
    private async nextMenuItem(currentMessage: number, previous: ButtonBuilder, next: ButtonBuilder, count: number, message: SearchString[], row: ActionRowBuilder<ButtonBuilder>, interaction: ButtonInteraction<CacheType>) {
        currentMessage++;
        previous.setDisabled(false);
        next.setDisabled(false);

        if (currentMessage == count - 1) {
            next.setDisabled(true);
        }

        const currentPage = new ButtonBuilder()
            .setCustomId(this.currentButtonId)
            .setLabel(`${currentMessage + 1}/${count}`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true);


        if (message[currentMessage].url) {
            const source = new ButtonBuilder()
                .setLabel('Source')
                .setStyle(ButtonStyle.Link)
                .setURL(message[currentMessage].url ?? '');

            row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(previous, currentPage, next, source);

        } else {
            row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(previous, currentPage, next);
        }

        await interaction.message.edit({ content: message[currentMessage].content, components: [row] });
        return { currentMessage };
    }

    /**
     * Creates the button row for the search results.
     * @param message An array of SearchString objects representing the search results.
     * @param currentMessage The index of the current search result.
     * @returns An ActionRowBuilder containing the "Previous", "Next", and "Source" buttons (if applicable).
     */
     createButtons(message: SearchString[], currentMessage: number, count : number ) {
        const previous = new ButtonBuilder()
          .setCustomId(this.previousButtonId)
          .setLabel('Previous')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true);
    
        const next = new ButtonBuilder()
          .setCustomId(this.nextButtonId)
          .setLabel('Next')
          .setStyle(ButtonStyle.Primary);

        const currentPage = new ButtonBuilder()
          .setCustomId(this.currentButtonId)
          .setLabel(`${currentMessage + 1}/${count}`)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true);
    
        let row: ActionRowBuilder<ButtonBuilder>;
    
        if (message[currentMessage].url) {
          const source = new ButtonBuilder()
            .setLabel('Source')
            .setStyle(ButtonStyle.Link)
            .setURL(message[currentMessage].url ?? '');
    
          row = new ActionRowBuilder<ButtonBuilder>().addComponents(previous, currentPage, next, source);
        } else {
          row = new ActionRowBuilder<ButtonBuilder>().addComponents(previous, currentPage, next);
        }
    
        return row;
      }

    /**
     * Removes all buttons from a message except for the "Source" button (if it exists).
     * @param message The message to modify.
     */
      private static async keepLinkButtonOnlyOrDeleteAll(message : Message) {
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


