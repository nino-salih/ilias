import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, CacheType, ChatInputCommandInteraction, ComponentType, Message, SlashCommandBuilder, blockQuote, italic } from "discord.js";
import { Command, MyClient } from "../app.js";
import { QdrantClient } from "@qdrant/js-client-rest";
import axios from "axios";
import { source, stripIndents } from "common-tags";
import { ComponentTimeout } from "../utils/component_timeout.js";
import { SearchButtonEvent } from "../event/search_button_event.js";

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

export class RefactorSearchCommand implements Command {

    private readonly qdrant : QdrantClient;

    private readonly timeout : ComponentTimeout = new ComponentTimeout();

    readonly cooldown = 5;

    //15min
    private static readonly TIMEOUT_N = 15 * 60 * 1000;

    readonly data = new SlashCommandBuilder()
        .setName("search2")
        .setDescription("Searches for a given term")
        .addStringOption(option => option.setName("term").setDescription("The term to search for").setMinLength(1).setMaxLength(100).setRequired(true))
        .addIntegerOption(option => option.setName("count").setDescription("The number of results to return").setMinValue(2).setMaxValue(15).setRequired(false));


    private readonly previousButtonId = 'refactor_search_button_previous_result';

    private readonly nextButtonId = 'refactor_search_button_next_result';

    constructor(qdrant: QdrantClient) {
        this.qdrant = qdrant;
    }

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

        const row = this.createButtons(message, currentMessage);

        const reply = await interaction.editReply({
            content: message[currentMessage].content,
            components: [row],
        });



        const collector = reply.createMessageComponentCollector({ 
            filter: (i: { user: { id: string; }; }) => i.user.id === interaction.user.id,
            componentType: ComponentType.Button,
            time: RefactorSearchCommand.TIMEOUT_N });
        

        const previous = new ButtonBuilder()
			.setCustomId(this.previousButtonId)
			.setLabel('Previous')
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
                ({ currentMessage } = await this.previousMenuItem(currentMessage, next, previous, message, row, interaction));
            }
            collector.resetTimer();
        });

        collector.on("end", async () => {
            await RefactorSearchCommand.keepLinkButtonOnlyOrDeleteAll(reply);
        });



        //Set return values
        //this.timeout.scheduleComponentTimeout(reply, SearchCommand.TIMEOUT_N, SearchButtonEvent.keepLinkButtonOnlyOrDeleteAll)
        //myClient.functionValues.set(reply.id, [message, currentMessage, count, this.timeout]);

    }

    private async searchQdrant(qdrant: QdrantClient, data: number[], count: number): Promise<Result[]> {
        const result = await qdrant.search("test", {vector: data, limit: count});

        const promises = result.map((point) => {
            return point as Result;
        });


        return Promise.all(promises);
        
    }

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

            //#:~:text=

            const construction = stripIndents`
            ${title}\n
            ${content}\n
            ${author}\n
            `;
            message.push({content: construction, url: item.payload?.metadata.source});
        }

        return message;
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

     createButtons(message: SearchString[], currentMessage: number) {
        const previous = new ButtonBuilder()
          .setCustomId(this.previousButtonId)
          .setLabel('Previous')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true);
    
        const next = new ButtonBuilder()
          .setCustomId(this.nextButtonId)
          .setLabel('Next')
          .setStyle(ButtonStyle.Primary);
    
        let row: ActionRowBuilder<ButtonBuilder>;
    
        if (message[currentMessage].url) {
          const source = new ButtonBuilder()
            .setLabel('Source')
            .setStyle(ButtonStyle.Link)
            .setURL(message[currentMessage].url ?? '');
    
          row = new ActionRowBuilder<ButtonBuilder>().addComponents(previous, next, source);
        } else {
          row = new ActionRowBuilder<ButtonBuilder>().addComponents(previous, next);
        }
    
        return row;
      }

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


