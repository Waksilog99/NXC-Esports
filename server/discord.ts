
import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import fs from 'fs';

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

let isReady = false;

client.once('ready', () => {
    console.log(`[DISCORD] Logged in as ${client.user?.tag}`);
    isReady = true;
});

// Initialize the bot
export const initDiscord = () => {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
        console.warn('[DISCORD] No bot token found (DISCORD_BOT_TOKEN). Notifications will be skipped.');
        return;
    }
    client.login(token).catch(err => {
        console.error('[DISCORD] Failed to login:', err);
    });
};

// Send message to configured channel
export const sendToDiscord = async (message: string, imagePath?: string | null, targetChannelId?: string) => {
    if (!isReady) {
        console.warn('[DISCORD] Bot not ready yet.');
        return;
    }

    const channelId = targetChannelId || process.env.DISCORD_SCRIM_CHANNEL_ID;
    if (!channelId) {
        console.warn('[DISCORD] No channel ID configured.');
        return;
    }

    try {
        const channel = await client.channels.fetch(channelId);
        if (channel && channel.isTextBased()) {
            // Role mention resolution
            let finalMessage = message;
            const guild = (channel as any).guild;

            if (guild) {
                // Find all potential @Role mentions in the message
                // Use a character set that excludes newlines to preserve formatting
                const mentionMatches = message.match(/@([a-zA-Z0-9 :_-]+)/g);
                if (mentionMatches) {
                    const roles = await guild.roles.fetch();
                    for (const match of mentionMatches) {
                        const roleName = match.substring(1).trim();
                        const foundRole = roles.find((r: any) => r.name.toLowerCase() === roleName.toLowerCase());
                        if (foundRole) {
                            finalMessage = finalMessage.replace(match, `<@&${foundRole.id}>`);
                        }
                    }
                }
            }

            const payload: any = { content: finalMessage };
            if (imagePath && fs.existsSync(imagePath)) {
                payload.files = [imagePath];
            }

            await (channel as TextChannel).send(payload);
            console.log(`[DISCORD] Notification sent to channel ${channelId} ${imagePath ? 'with image' : ''}`);
        } else {
            console.error(`[DISCORD ERROR] Channel ${channelId} not found or is not a text channel.`);
        }
    } catch (error: any) {
        console.error(`[DISCORD ERROR] Error sending message to ${channelId}: ${error.message}`);
    }
};
