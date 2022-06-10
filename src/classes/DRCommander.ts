import type {commandFile, DRCommanderOptions, Logger, Testing} from "../types";
import type {DRClient} from "@discord-rahmen/discord.js-layer";
import {lstatSync, readdirSync} from "fs";
import { join } from "path";

export class DRCommander {
    directory: string;
    baseDirectory: string;
    logger: Logger;
    testing: Testing;
    privilegedUsers: string[];
    options: DRCommanderOptions;
    commands: Map<string, any> = new Map();
    layer: DRClient;

    constructor(options: DRCommanderOptions) {
        this.options = options;
    }

    public get commandsMap() {
        return this.commands;
    }

    public get wrapperClient() {
        return this.layer.wrapperClient;
    }

    public init(layer: DRClient) {

    }

    private async loadCommands() {
        const commands = [];
        await this.getFiles(join(this.baseDirectory, this.directory));

        for (const [name, command] of this.commands) {
            let status = "Unloaded";
            const options = [];
            for (let commandOption of command.options) {
                commandOption.type = this.layer.convertOptionType(commandOption.type);
                options.push(commandOption);
            }
            if (command.name) {
                // @ts-ignore
                if (command.development && this.testing.bot === this.wrapperClient.id) continue;

                commands.push({
                    name: command.name,
                    description: command.description,
                    options: options,
                });
                status = "Loaded";
            }

            console.log(`${name} - ${status}`);
            // @ts-ignore
            if (this.testing.bot === this.wrapperClient?.id) {
                // @ts-ignore
                this.wrapperClient?.setCommand(command.name, this.testing.guild.id);
            } else {
                // @ts-ignore
                this.wrapperClient?.setCommand(command.name);
            }
        }
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
}