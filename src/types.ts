import type {
    Channel,
    ColorResolvable,
    MessageEmbed,
    Guild,
    Client,
    GuildMember,
    Interaction,
    Permissions,
    User
} from "discord.js";
import type {DRCommandOptionType} from "@discord-rahmen/discord.js-layer";

export interface DRCommanderOptions {
    directory: string;
    logger: LoggerOptions;
    testing: TestingOptions;
    privilegedUsers: string[];
}

export interface Logger {
    channel: Channel;
    embed: MessageEmbed;
}

export interface Testing {
    guild: Guild;
    bot: string;
}

export interface TestingOptions {
    guild: string;
    bot: string;
}

export interface LoggerOptions {
    channel: string;
    color: ColorResolvable;
}

export interface commandFile {
    name: string;
    description: string;
    options: commandOptions;
    privilegedUser: boolean;
    excludeInProduction: boolean;
    cooldown: number;
    // botPermissions: Permissions[];
    // userPermissions: Permissions[];
    run: (parameter: commandRunner) => Promise<any>;
}

export interface commandOptions {
    type: DRCommandOptionType;
    name: string;
    nameLocalizations: object;
    nameLocalized: string;
    description: string;
    descriptionLocalizations: object;
    descriptionLocalized: string;
    required: boolean;
    autocomplete: boolean;
}

export interface commandRunner {
    interaction: Interaction;
    wrapperClient: Client;
    pluginsMap: Map<string, any>;
    user: User;
    member: GuildMember;
}