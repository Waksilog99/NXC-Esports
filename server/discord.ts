import { REST, Routes } from 'discord.js';
import fs from 'fs';

// Initialize REST client
const rest = new REST({ version: '10' });

// Initialize the bot (stateless REST only)
export const initDiscord = () => {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
        console.warn('[DISCORD] No bot token found (DISCORD_BOT_TOKEN).');
        return;
    }
    rest.setToken(token);
};

/**
 * Maps team names (as stored in DB) to Discord Role IDs.
 * USER: Populate this object with unique team names as keys and 
 * their corresponding Discord Role IDs as values to enable pings.
 */
export const ROLE_MAPPINGS: Record<string, string> = {
    // Example: 'Alpha Squad': 'ID_HERE',
};

/**
 * Returns a Discord role mention string <@&ID> if a mapping exists,
 * otherwise returns a plain string prefixed with @.
 */
export const getRoleMention = (teamName: string): string => {
    const roleId = ROLE_MAPPINGS[teamName];
    if (roleId) {
        return `<@&${roleId}>`;
    }
    // Fallback if no specific ID is found
    return `@${teamName}`;
};

// Send message to configured channel using REST (stateless)
export const sendToDiscord = async (message: string, imagePath?: string | null, targetChannelId?: string) => {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) return;

    const channelId = targetChannelId || process.env.DISCORD_SCRIM_CHANNEL_ID;
    if (!channelId) return;

    rest.setToken(token);
    console.log(`[DISCORD REST] Sending notification to channel: ${channelId}`);

    try {
        const body: any = { content: message };
        const files: { name: string, data: Buffer | string }[] = [];

        if (imagePath && fs.existsSync(imagePath)) {
            const data = fs.readFileSync(imagePath);
            const name = imagePath.split(/[\\/]/).pop() || 'attachment.png';
            files.push({ name, data });
        }

        // Use standard POST request via REST - fully stateless
        await rest.post(Routes.channelMessages(channelId), {
            body,
            files: files.length > 0 ? files : undefined
        });

        console.log(`[DISCORD REST] Message dispatched successfully to ${channelId}`);
    } catch (error: any) {
        console.error(`[DISCORD REST ERROR] Dispatch failed:`, error.message);
    }
};
