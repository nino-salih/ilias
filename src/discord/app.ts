import * as dotenv from "dotenv";
import { Client, Events, GatewayIntentBits, Collection, SlashCommandBuilder, ChatInputCommandInteraction, REST, Message, Snowflake } from "discord.js";
import * as fs from "fs";
import * as path from "path";
import { QdrantClient } from "@qdrant/js-client-rest";
import { SearchCommand } from "./commands/search.js";
export interface MyClient extends Client {
    commands: Collection<string, Command>;
    events: Collection<string, CustomDiscordEvent>;
    functionValues : Collection<string, any[]>;
}  

export interface Command {
    cooldown: number;
    data: Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
};


export interface CustomDiscordEvent {
    prefix: string;
    once: boolean;
    execute: (...args: any[]) => Promise<void>;
}


async function deploy(commands : string[], token: string, clientId: string, guildId: string) {
    // Construct and prepare an instance of the REST module
    const rest = new REST({ version: '9' }).setToken(token);

// and deploy your commands!
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // The put method is used to fully refresh all commands in the guild with the current set
        const data = await rest.put(
            `/applications/${clientId}/guilds/${guildId}/commands`,
            { body: commands },
        );

        console.log(`Successfully reloaded ${JSON.stringify(data)} application (/) commands.`);
    } catch (error) {
        // And of course, make sure you catch and log any errors!
        console.error(error);
    };
}

const currentWorkingDir = process.cwd();

dotenv.config();

const client = new Client({ presence: { status: "dnd" }, intents: [GatewayIntentBits.Guilds] }) as MyClient;

const qdrant = new QdrantClient({
    url: "http://localhost",
    port: 6333,
  });

// make sure the collection exists
qdrant.getCollections().then((array) => { 
    if(!array.collections.some((collection) => collection.name === process.env.QDRANT_COLLECTION)) {
        throw new Error("Collection does not exist");
    };
});

client.once(Events.ClientReady, c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);
});

const commandsPath = path.join(new URL('.', import.meta.url).pathname, 'commands');

const eventPath = path.join(new URL('.', import.meta.url).pathname, 'event');

const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'));
const eventFiles = fs.readdirSync(eventPath).filter(file => file.endsWith('.ts'));

client.commands = new Collection();
client.events = new Collection();
client.functionValues = new Collection();

const register : string[] = [];

for (const file of commandFiles) {
    const module = await import(path.join(commandsPath, file));
    const classType = module[Object.keys(module)[0]];
    const instance = new classType();

    if(instance instanceof SearchCommand) {
        const searchCommand = new classType(qdrant);
        register.push(searchCommand.data.toJSON());
        client.commands.set(searchCommand.data.name, searchCommand);
        continue;
    }
    
    register.push(instance.data.toJSON());
    client.commands.set(instance.data.name, instance);
}


for (const file of eventFiles) {
    const module = await import(path.join(eventPath, file));
    const classType = module[Object.keys(module)[0]];
    const instance = new classType();

    if(instance?.prefix == undefined || instance?.execute === undefined) {
        throw new Error(`Event ${file} does not have a prefix or execute method`);
    }
    client.events.set(instance.prefix, instance);
}

const token = process.env.DISCORD_TOKEN ?? "";

client.on(Events.InteractionCreate, async interaction => {
	if (interaction.isChatInputCommand()) { 
    
	const command = client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
}


    if (interaction.isButton()) {
        const event = client.events.find(name  => interaction.customId.startsWith(name.prefix));

        if(!event) {
            //console.error(`No command matching ${interaction.customId} was found.`);
            return;
        }

        	try {

                const args = client.functionValues.get(interaction.message.id) ?? [];

                await event.execute(interaction, ...args);

		
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
}
});

//await deploy(register, token, process.env.DISCORD_CLIENT_ID ?? "", process.env.DISCORD_DEV_GUILD ?? "")

client.login(token);