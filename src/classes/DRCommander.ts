import type {commandFile, DRCommanderOptions, Logger, Testing} from "../types";
import type {DRClient} from "@discord-rahmen/discord.js-layer";
import {lstatSync, readdirSync} from "fs";
import { join } from "path";
import type {CommandInteraction} from "discord.js";

export class DRCommander {
    directory: string;
    baseDirectory: string;
    logger: Logger;
    testing: Testing;
    privilegedUsers: string[];
    options: DRCommanderOptions;
    commands: Map<string, any> = new Map();
    layer: DRClient;
    cooldown: Map<string, Map<string, number>>;

    constructor(options: DRCommanderOptions) {
        this.options = options;
    }

    public get commandsMap() {
        return this.commands;
    }

    public get wrapperClient() {
        return this.layer.wrapperClient;
    }

    public async init(layer: DRClient) {
        this.layer = layer;

        console.log("Loading all Slashcommands...");
        const commands = await this.loadCommands()

        console.log("\nDeploying all Slashcommands...")
        const commandsStatus = await this.deployCommands(commands);
        console.log(`Deployed ${commandsStatus}\n`);

        // Starting Interactionevent
        this.layer.newInteractionListener(false, this.handleInteraction);
    }

    private async deployCommands(commands: any) {
        if (this.testing.bot === this.wrapperClient?.user.id) {
            await this.layer.setCommand(commands, this.testing.guild.id);
            return "all Slashcommands in the Testguild! 🥳";
        }

        if (this.testing.bot !== this.wrapperClient?.user.id) {
            await this.layer.setCommand(commands);
            return "all Slashcommands globally! 🥳";
        }

        return "any Slashcommands because nothing matched with the ClientID! 🙁";
    }

    private async loadCommands() {
        const commands = [];
        await this.getFiles(join(this.baseDirectory, this.directory));

        for (const [name, command] of this.commands) {
            let status = "Unloaded";
            const options = [];
            if (command.options) {
                for (let commandOption of command.options) {
                    commandOption.type = this.layer.convertOptionType(commandOption.type);
                    options.push(commandOption);
                }
            }

            if (command.name) {
                if (command.excludeInProduction && this.testing.bot === this.wrapperClient?.user.id) continue;

                commands.push({
                    name: command.name,
                    description: command.description,
                    options: options,
                });

                this.commands.set(command.name, command);
                status = "Loaded";
            }

            console.log(`${name} - ${status}`);
        }

        return commands;
    }

    private async getFiles(directory: string) {
        const folder = readdirSync(directory);
        for (const file of folder) {
            const stats = lstatSync(join(directory, file));
            if (file.endsWith(".js") || file.endsWith(".ts")) {
                const filePath = `${directory}/${file}`;
                const command = import(filePath) as unknown as commandFile;
                this.commands.set(command.name, command);
                continue;
            }

            if (stats.isDirectory()) {
                await this.getFiles(join(directory, file));
            }
        }
    }

    public async handleInteraction(interaction: CommandInteraction) {
        if (!interaction.isCommand()) return;

        // validating command and getting its data
        const command = this.commands.get(interaction.commandName);
        if (!command) return;

        if (command.privilegedUsers && (!this.privilegedUsers.includes(interaction.user.id))) {
            await interaction.reply({
                content: "You aren't allowed to use this command",
                ephemeral: true
            });
        }

        // TODO: permissionscheck for bot and user

        // Adding Cooldown-map to the command if it doesn't exist yet
        if (!this.cooldown.has(command.name)) {
            this.cooldown.set(command.name, new Map());
        }

        const now = Date.now();
        const timestamps = this.cooldown.get(command.name);
        // Converting the cooldownamount into seconds-format
        const cooldownAmount = (command.cooldown || 1) * 1000;

        // Checking if command is cooldowned
        if (timestamps.has(interaction.user.id)) {
            const experationTime = timestamps.get(interaction.user.id) + cooldownAmount;

            if (now < experationTime) {
                const timeLeft = (experationTime - now) / 1000;
                await interaction.reply({
                    content: `Wait another \`${timeLeft.toFixed(1)}\`seconds before you run **${command.name}** again!`,
                    ephemeral: true
                });

                return;
            }
        }

        try {
            await command.run({
                interaction: interaction,
                client: this.layer.wrapperClient,
                // TODO: make pluginsmap aviable to the user
                // pluginsMap: this.plugins,
                user: interaction.user,
                member: interaction.member
            });
        } catch (error) {
            console.error(error);
            return;
        }

        timestamps.set(interaction.user.id, now);

        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
        return;
    }
}