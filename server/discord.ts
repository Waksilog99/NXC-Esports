
import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import fs from 'fs';

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});


client.on('ready', () => {
    console.log(`[DISCORD] Logged in as ${client.user?.tag}`);
});

client.on('error', (err) => {
    console.error('[DISCORD CLIENT ERROR]', err);
});

// Helper to wait for bot to be ready
const ensureDiscordReady = async (timeoutMs = 12000): Promise<boolean> => {
    if (client.isReady()) return true;

    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
        console.error('[DISCORD] BOT_TOKEN missing in environment.');
        return false;
    }

    // Trigger login if not already connected
    try {
        if (!client.isReady()) {
            console.log('[DISCORD] Bot not ready, attempting on-demand login...');
            initDiscord();
        }
    } catch (e) {
        console.error('[DISCORD] Error during on-demand init:', e);
    }

    const start = Date.now();
    while (!client.isReady() && Date.now() - start < timeoutMs) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`[DISCORD] Waiting for readiness... (${Math.round((Date.now() - start) / 1000)}s)`);
    }

    if (!client.isReady()) {
        console.error('[DISCORD] Timeout waiting for bot to be ready after', timeoutMs, 'ms');
    } else {
        console.log('[DISCORD] Bot is now ready for operations.');
    }
    return client.isReady();
};

// Initialize the bot
export const initDiscord = () => {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
        console.warn('[DISCORD] No bot token found (DISCORD_BOT_TOKEN). Notifications will be skipped.');
        return;
    }

    // Check if login is already in progress to avoid multiple parallel attempts
    if (client.ws.status === 0) return; // Already ready
    if (client.ws.status === 1 || client.ws.status === 2) {
        console.log('[DISCORD] Login already in progress, skipping redundant attempt.');
        return;
    }

    console.log('[DISCORD] Initiating login sequence...');
    client.login(token).catch(err => {
        console.error('[DISCORD] Failed to login:', err);
    });
};

// Send message to configured channel
export const sendToDiscord = async (message: string, imagePath?: string | null, targetChannelId?: string) => {
    console.log(`[DISCORD] Preparing notification for channel: ${targetChannelId || 'DEFAULT'}`);

    const ready = await ensureDiscordReady();
    if (!ready) {
        console.warn('[DISCORD] Aborting: Bot never reached ready state.');
        return;
    }

    const channelId = targetChannelId || process.env.DISCORD_SCRIM_CHANNEL_ID;
    if (!channelId) {
        console.warn('[DISCORD] No channel ID found in environment or parameters.');
        return;
    }

    try {
        // Use force: true to bypass cache in serverless cold starts
        const channel = await client.channels.fetch(channelId, { force: true });
        if (channel && channel.isTextBased()) {
            // Role mention resolution
            let finalMessage = message;
            const guild = (channel as any).guild;

            if (guild) {
                // Find all potential @Role mentions in the message
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
            console.log(`[DISCORD] Message dispatched successfully to ${channelId}`);
        } else {
            console.error(`[DISCORD ERROR] Target ${channelId} is invalid or non-textual.`);
        }
    } catch (error: any) {
        console.error(`[DISCORD ERROR] Dispatch failed for ${channelId}:`, error.message);
    }
};
