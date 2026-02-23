import dotenv from 'dotenv';
import { resolve } from 'path';

// Force load .env from CWD (Root)
dotenv.config({ path: resolve(process.cwd(), '.env') });
console.log('[DEBUG] Loading .env from:', resolve(process.cwd(), '.env'));
console.log('[DEBUG] GEMINI_API_KEY loaded:', !!process.env.GEMINI_API_KEY);

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { users, achievements, events, sponsors, teams, players, scrims, scrimPlayerStats, tournaments, tournamentPlayerStats, tournamentNotifications, weeklyReports, rosterQuotas, playerQuotaProgress } from './schema';
import { eq, inArray, and } from 'drizzle-orm';
import Database from 'better-sqlite3';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { initDiscord } from './discord';
import { initScheduler, sendAIEventNotification } from './scheduler';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
import fs from 'fs';
import { finished } from 'stream/promises';

const GAME_CATEGORY = {
    'Valorant': 'FPS',
    'CS2': 'FPS',
    'CS:GO': 'FPS',
    'Apex Legends': 'BR',
    'League of Legends': 'MOBA',
    'Dota 2': 'MOBA',
    'Mobile Legends': 'MOBA'
} as const;

const app = express();
console.log('[DEBUG] server/index.ts is executing...');

const IS_PROD = process.env.NODE_ENV === 'production';

// ── Security: Helmet (security headers) ──────────────────────────────────────
app.use(helmet({
    crossOriginEmbedderPolicy: false, // needed for image loading from external CDNs
    contentSecurityPolicy: false,     // managed by Vite in dev; can tighten in prod later
}));

// ── Security: CORS whitelist ──────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:4173',
    ...(process.env.ALLOWED_ORIGIN ? [process.env.ALLOWED_ORIGIN] : []),
];
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (server-to-server, curl, mobile apps)
        if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
}));

// ── Security: Rate limiters ───────────────────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 60 * 1000,   // 1 minute
    max: 10,               // 10 attempts per minute per IP on auth routes
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests, please try again later.' },
});
const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 150,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);
app.use('/api/auth', authLimiter);

// ── Diagnostic Logger ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
    if (!IS_PROD) console.log(`[${new Date().toISOString()}] REQ: ${req.method} ${req.url}`);
    next();
});

// ── Body limits ───────────────────────────────────────────────────────────────
// Avatar/image uploads get 50 MB; everything else gets 5 MB
app.use('/api/users/:id/avatar', express.json({ limit: '50mb' }));
app.use('/api/users/:id/avatar', express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

const PORT = 3001;

// Test Route for Discord Notification (Moved to top for debugging)
app.post('/api/test/notification', async (req, res) => {
    console.log('[DEBUG] Hit /api/test/notification route (TOP)');
    try {
        const dummyEvent = {
            title: "NOW RECRUITING: NXC Solana (VALORANT PC)",
            description: "NXC is officially expanding our VALORANT PC FEMALE DIVISION with the launch of NXC Solana. We are looking for high potential players ready to build a legacy suitable for elite community leagues.\n\nRequirements:\n- Gender: Female\n- Rank: Diamond - Immortal\n- Team Size: 5 Main + 2 Subs\n- Commitment: Available for scrims/VODs.",
            location: "Discord Ticket #player-applications",
            date: new Date().toISOString()
        };

        await sendAIEventNotification(dummyEvent, 'TEST');
        res.json({ success: true, message: "Test notification sent to Discord." });
    } catch (error) {
        console.error("Test notification failed:", error);
        res.status(500).json({ success: false, error: "Failed to send test notification." });
    }
});

// ── Password helpers ─────────────────────────────────────────────────────────
// Legacy SHA-256 hash (used before bcrypt migration)
const legacyHash = (password: string): string =>
    crypto.createHash('sha256').update(password).digest('hex');

// Hash a password with bcrypt (async)
const hashPassword = async (password: string): Promise<string> =>
    bcrypt.hash(password, 12);

// Verify password — handles both bcrypt and legacy SHA-256 (auto-migrates)
const verifyPassword = async (
    plain: string,
    stored: string,
    userId: number
): Promise<boolean> => {
    // Detect legacy SHA-256 hash: 64-char hex string
    const isLegacy = /^[0-9a-f]{64}$/.test(stored);
    if (isLegacy) {
        if (legacyHash(plain) !== stored) return false;
        // Auto-migrate to bcrypt silently
        const newHash = await bcrypt.hash(plain, 12);
        await db.update(users).set({ password: newHash }).where(eq(users.id, userId));
        console.log(`[AUTH] Migrated password for userId ${userId} from SHA-256 to bcrypt`);
        return true;
    }
    return bcrypt.compare(plain, stored);
};

// Sanitize user-provided strings (trim + strip script tags)
const sanitize = (val: any): string =>
    typeof val === 'string' ? val.trim().replace(/<script[^>]*>.*?<\/script>/gi, '') : String(val ?? '');

// Calculate role-based level
const determineLevel = (role: string | null, xpLevel: number | null): number => {
    const roles = (role || 'member').split(',').map(r => r.trim().toLowerCase());
    if (roles.includes('admin')) return 1000000000000;
    if (roles.includes('ceo')) return 1000000000;
    if (roles.includes('manager')) return 1000000;
    return xpLevel || 1;
};


const runMigrations = () => {
    try {
        const sqlite = new Database('local.db');
        console.log("Database maintenance...");

        // Users Table
        sqlite.prepare(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                fullname TEXT NOT NULL,
                google_id TEXT UNIQUE,
                avatar TEXT,
                role TEXT DEFAULT 'member',
                bio TEXT,
                games_played TEXT,
                achievements TEXT,
                birthday TEXT,
                created_at INTEGER DEFAULT (unixepoch()),
                ign TEXT
            )
        `).run();

        // Safe Alter for IGN if table exists but column doesn't
        try { sqlite.prepare("ALTER TABLE users ADD COLUMN ign TEXT").run(); } catch (e) { }

        // Achievements Table
        sqlite.prepare(`
            CREATE TABLE IF NOT EXISTS achievements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                date TEXT NOT NULL,
                description TEXT NOT NULL,
                image TEXT,
                placement TEXT,
                game TEXT
            )
        `).run();

        // Safe Alter for Game in Achievements if not exists
        try { sqlite.prepare("ALTER TABLE achievements ADD COLUMN game TEXT").run(); } catch (e) { }

        // Events Table
        sqlite.prepare(`
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                date TEXT NOT NULL,
                location TEXT,
                description TEXT,
                status TEXT DEFAULT 'upcoming',
                image TEXT
            )
        `).run();

        // Sponsors Table
        sqlite.prepare(`
            CREATE TABLE IF NOT EXISTS sponsors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                tier TEXT NOT NULL,
                logo TEXT NOT NULL,
                description TEXT,
                website TEXT
            )
        `).run();

        // Teams Table
        sqlite.prepare(`
            CREATE TABLE IF NOT EXISTS teams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                manager_id INTEGER REFERENCES users(id),
                game TEXT NOT NULL,
                logo TEXT,
                description TEXT
            )
        `).run();

        // Safe Alter for manager_id in teams
        try { sqlite.prepare("ALTER TABLE teams ADD COLUMN manager_id INTEGER").run(); } catch (e) { }

        // Players Table
        sqlite.prepare(`
            CREATE TABLE IF NOT EXISTS players (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                team_id INTEGER REFERENCES teams(id),
                user_id INTEGER REFERENCES users(id),
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                kda TEXT,
                win_rate TEXT,
                acs TEXT,
                image TEXT,
                is_active INTEGER DEFAULT 1
            )
        `).run();

        // Safe Alter for user_id and acs in players
        try { sqlite.prepare("ALTER TABLE players ADD COLUMN user_id INTEGER").run(); } catch (e) { }
        try { sqlite.prepare("ALTER TABLE players ADD COLUMN acs TEXT").run(); } catch (e) { }
        try { sqlite.prepare("ALTER TABLE players ADD COLUMN level INTEGER DEFAULT 1").run(); } catch (e) { }
        try { sqlite.prepare("ALTER TABLE players ADD COLUMN xp INTEGER DEFAULT 0").run(); } catch (e) { }

        // Schema Updates for Achievements (Legacy support)
        try { sqlite.prepare("ALTER TABLE achievements ADD COLUMN placement TEXT").run(); } catch (e) { }
        try { sqlite.prepare("ALTER TABLE achievements ADD COLUMN image TEXT").run(); } catch (e) { }

        // Schema Updates for Events
        try { sqlite.prepare("ALTER TABLE events ADD COLUMN location TEXT").run(); } catch (e) { }
        try { sqlite.prepare("ALTER TABLE events ADD COLUMN image TEXT").run(); } catch (e) { }
        try { sqlite.prepare("ALTER TABLE events ADD COLUMN status TEXT DEFAULT 'upcoming'").run(); } catch (e) { }

        // Schema Updates for Sponsors
        try { sqlite.prepare("ALTER TABLE sponsors ADD COLUMN description TEXT").run(); } catch (e) { }
        try { sqlite.prepare("ALTER TABLE sponsors ADD COLUMN website TEXT").run(); } catch (e) { }

        // Scrims Table
        sqlite.prepare(`
            CREATE TABLE IF NOT EXISTS scrims (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                team_id INTEGER REFERENCES teams(id),
                date TEXT NOT NULL,
                opponent TEXT NOT NULL,
                format TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                results TEXT
            )
        `).run();

        // Scrim Player Stats Table
        sqlite.prepare(`
            CREATE TABLE IF NOT EXISTS scrim_player_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scrim_id INTEGER REFERENCES scrims(id),
                player_id INTEGER REFERENCES players(id),
                kills INTEGER DEFAULT 0,
                deaths INTEGER DEFAULT 0,
                assists INTEGER DEFAULT 0,
                acs INTEGER DEFAULT 0,
                is_win INTEGER DEFAULT 0
            )
        `).run();

        // Scrim Notifications Table
        sqlite.prepare(`
            CREATE TABLE IF NOT EXISTS scrim_notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scrim_id INTEGER REFERENCES scrims(id),
                type TEXT NOT NULL,
                sent_at INTEGER DEFAULT (unixepoch())
            )
        `).run();

        // Safe Alter for acs in scrim_player_stats
        try { sqlite.prepare("ALTER TABLE scrim_player_stats ADD COLUMN acs INTEGER DEFAULT 0").run(); } catch (e) { }

        // Weekly Reports Table (for consolidated history)
        sqlite.prepare(`
            CREATE TABLE IF NOT EXISTS weekly_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                week_start TEXT NOT NULL,
                week_end TEXT NOT NULL,
                generated_at TEXT NOT NULL,
                report_data TEXT NOT NULL,
                pdf_path TEXT
            )
        `).run();

        // Tournaments Table
        sqlite.prepare(`
            CREATE TABLE IF NOT EXISTS tournaments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                team_id INTEGER REFERENCES teams(id),
                date TEXT NOT NULL,
                name TEXT NOT NULL,
                opponent TEXT,
                format TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                results TEXT,
                maps TEXT
            )
        `).run();

        // Tournament Player Stats Table
        sqlite.prepare(`
            CREATE TABLE IF NOT EXISTS tournament_player_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tournament_id INTEGER REFERENCES tournaments(id),
                player_id INTEGER REFERENCES players(id),
                kills INTEGER DEFAULT 0,
                deaths INTEGER DEFAULT 0,
                assists INTEGER DEFAULT 0,
                acs INTEGER DEFAULT 0,
                is_win INTEGER DEFAULT 0
            )
        `).run();

        // Roster Quotas Table
        sqlite.prepare(`
            CREATE TABLE IF NOT EXISTS roster_quotas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                team_id INTEGER UNIQUE REFERENCES teams(id),
                base_aim_kills INTEGER DEFAULT 0,
                base_grind_rg INTEGER DEFAULT 0,
                reduced_aim_kills INTEGER DEFAULT 0,
                reduced_grind_rg INTEGER DEFAULT 0,
                updated_at INTEGER
            )
        `).run();

        // Player Quota Progress Table
        sqlite.prepare(`
            CREATE TABLE IF NOT EXISTS player_quota_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id INTEGER REFERENCES players(id),
                week_start TEXT NOT NULL,
                aim_status TEXT DEFAULT 'pending',
                grind_status TEXT DEFAULT 'pending',
                total_aim_kills INTEGER DEFAULT 0,
                total_grind_rg INTEGER DEFAULT 0,
                aim_proof TEXT,
                grind_proof TEXT,
                punishment_kills INTEGER DEFAULT 0,
                punishment_rg INTEGER DEFAULT 0,
                carry_over_kills INTEGER DEFAULT 0,
                carry_over_rg INTEGER DEFAULT 0,
                updated_at INTEGER
            )
        `).run();

        // Safe Alter for grind_proof in player_quota_progress
        try { sqlite.prepare("ALTER TABLE player_quota_progress ADD COLUMN grind_proof TEXT").run(); } catch (e) { }
        try { sqlite.prepare("ALTER TABLE player_quota_progress ADD COLUMN assigned_base_aim INTEGER DEFAULT 0").run(); } catch (e) { }
        try { sqlite.prepare("ALTER TABLE player_quota_progress ADD COLUMN assigned_base_grind INTEGER DEFAULT 0").run(); } catch (e) { }
        try { sqlite.prepare("ALTER TABLE roster_quotas ADD COLUMN reduced_aim_kills INTEGER DEFAULT 0").run(); } catch (e) { }
        try { sqlite.prepare("ALTER TABLE roster_quotas ADD COLUMN reduced_grind_rg INTEGER DEFAULT 0").run(); } catch (e) { }

        sqlite.close();
    } catch (e) {
        console.error("Migration/Check failed:", e);
    }
};

const seedData = async () => {
    // Seeding handled by external script mainly, but basic admin ensure here
    try {
        runMigrations();
        const adminUsername = 'admin';
        const existingAdmin = await db.select().from(users).where(eq(users.username, adminUsername)).get();
        if (!existingAdmin) {
            console.log('Seeding super admin account...');
            const hashedPassword = await hashPassword('admin');
            await db.insert(users).values({
                username: adminUsername,
                password: hashedPassword,
                email: 'admin@novanexus.io',
                fullname: 'Super Commander',
                avatar: 'https://ui-avatars.com/api/?name=Super+Commander&background=fbbf24&color=000',
                role: 'admin',
                ign: 'Commander01'
            });
        }
    } catch (error) {
        console.error('Error seeding data:', error);
    }
};

// --- ROUTES ---

app.get('/ping', (req, res) => {
    res.json({ status: 'ok', server: 'Identity Service' });
});

// Users
app.get('/api/users', async (req, res) => {
    try {
        const allUsers = await db.select({
            id: users.id,
            username: users.username,
            email: users.email,
            fullname: users.fullname,
            googleId: users.googleId,
            avatar: users.avatar,
            role: users.role,
            bio: users.bio,
            gamesPlayed: users.gamesPlayed,
            achievements: users.achievements,
            birthday: users.birthday,
            createdAt: users.createdAt,
            ign: users.ign,
            level: players.level,
            xp: players.xp
        })
            .from(users)
            .leftJoin(players, eq(users.id, players.userId))
            .all();

        const dataWithRoleLevels = allUsers.map(u => ({
            ...u,
            level: determineLevel(u.role, u.level)
        }));
        res.json(dataWithRoleLevels);
    } catch (error: any) {
        console.error("Error in GET /api/users:", error);
        res.status(500).json({ success: false, error: 'Failed to fetch users', details: IS_PROD ? undefined : error.message });
    }
});

app.post('/api/auth/signup', async (req, res) => {
    const { fullname, username, email, password } = req.body;
    if (!fullname || !username || !email || !password) return res.status(400).json({ success: false, error: 'Missing required signup fields' });

    const sFullname = sanitize(fullname);
    const sUsername = sanitize(username);
    const sEmail = sanitize(email).toLowerCase();

    try {
        const hashedPassword = await hashPassword(password);
        const newUser = await db.insert(users).values({
            fullname: sFullname,
            username: sUsername,
            email: sEmail,
            password: hashedPassword,
            role: 'member'
        }).returning().get();
        res.json({ success: true, message: 'Signup success', data: newUser });
    } catch (error: any) {
        console.error("Error in POST /api/auth/signup:", error);
        // Surface human-readable duplicate key errors
        let userFacingError = 'Signup failed';
        if (error.message?.includes('UNIQUE') || error.message?.includes('unique')) {
            if (error.message?.includes('username')) userFacingError = 'Username is already taken.';
            else if (error.message?.includes('email')) userFacingError = 'Email is already registered.';
            else userFacingError = 'Username or email already exists.';
        }
        res.status(500).json({ success: false, error: userFacingError, details: IS_PROD ? undefined : error.message });
    }
});


app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const sUsername = sanitize(username);
    try {
        // Step 1: fetch user row including password for verification
        const userRow = await db.select().from(users).where(eq(users.username, sUsername)).get();

        if (!userRow || !(await verifyPassword(password, userRow.password, userRow.id))) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // Step 2: fetch full safe profile (with player data, no password)
        const safeUser = await db.select({
            id: users.id,
            username: users.username,
            email: users.email,
            fullname: users.fullname,
            googleId: users.googleId,
            avatar: users.avatar,
            role: users.role,
            bio: users.bio,
            gamesPlayed: users.gamesPlayed,
            achievements: users.achievements,
            birthday: users.birthday,
            createdAt: users.createdAt,
            ign: users.ign,
            level: players.level,
            xp: players.xp
        })
            .from(users)
            .leftJoin(players, eq(users.id, players.userId))
            .where(eq(users.id, userRow.id))
            .get();

        if (safeUser) {
            (safeUser as any).level = determineLevel(safeUser.role, safeUser.level);
        }

        res.json({ success: true, message: 'Login success', data: safeUser });
    } catch (error: any) {
        console.error("Error in POST /api/auth/login:", error);
        res.status(500).json({ success: false, error: 'Login failure', details: IS_PROD ? undefined : error.message });
    }
});

app.post('/api/users/sync', async (req, res) => {
    let { googleId, email, name, avatar, birthday, role: requestedRole } = req.body;
    email = email?.toLowerCase();
    if (!email) return res.status(400).json({ error: 'Missing email' });
    try {
        let existingUser = googleId
            ? await db.select().from(users).where(eq(users.googleId, googleId)).get()
            : await db.select().from(users).where(eq(users.email, email)).get();

        if (existingUser) {
            const updateSet: any = { avatar, googleId };
            if (name) updateSet.fullname = name;
            if (birthday) updateSet.birthday = birthday;
            if (requestedRole) updateSet.role = requestedRole;
            await db.update(users).set(updateSet).where(eq(users.id, existingUser.id)).run();

            // Re-fetch with player data
            const updatedUser = await db.select({
                id: users.id,
                username: users.username,
                password: users.password,
                email: users.email,
                fullname: users.fullname,
                googleId: users.googleId,
                avatar: users.avatar,
                role: users.role,
                bio: users.bio,
                gamesPlayed: users.gamesPlayed,
                achievements: users.achievements,
                birthday: users.birthday,
                createdAt: users.createdAt,
                ign: users.ign,
                level: players.level,
                xp: players.xp
            })
                .from(users)
                .leftJoin(players, eq(users.id, players.userId))
                .where(eq(users.id, existingUser.id))
                .get();

            if (updatedUser) {
                (updatedUser as any).level = determineLevel(updatedUser.role, updatedUser.level);
            }

            return res.json({ message: 'User synced', user: updatedUser });
        } else {
            if (!googleId) return res.status(404).json({ error: 'Sign up first' });
            const sUsername = sanitize(email.split('@')[0] + '_' + Math.floor(Math.random() * 1000));
            const hashedPassword = await hashPassword('google_authenticated');
            const newUser = await db.insert(users).values({
                username: sUsername,
                password: hashedPassword,
                googleId, email, fullname: sanitize(name) || 'Nexus Agent',
                avatar, birthday, role: email === 'admin@novanexus.io' ? 'admin' : 'member'
            }).returning().get();

            // For new users, they won't have player data yet, but let's be consistent
            const enrichedNewUser = await db.select({
                id: users.id,
                username: users.username,
                password: users.password,
                email: users.email,
                fullname: users.fullname,
                googleId: users.googleId,
                avatar: users.avatar,
                role: users.role,
                bio: users.bio,
                gamesPlayed: users.gamesPlayed,
                achievements: users.achievements,
                birthday: users.birthday,
                createdAt: users.createdAt,
                ign: users.ign,
                level: players.level,
                xp: players.xp
            })
                .from(users)
                .leftJoin(players, eq(users.id, players.userId))
                .where(eq(users.id, newUser.id))
                .get();

            if (enrichedNewUser) {
                (enrichedNewUser as any).level = determineLevel(enrichedNewUser.role, enrichedNewUser.level);
            }

            return res.json({ success: true, message: 'User created', data: enrichedNewUser });
        }
    } catch (error: any) {
        console.error("Error in POST /api/users/sync:", error);
        res.status(500).json({ success: false, error: 'Sync failed', details: IS_PROD ? undefined : error.message });
    }
});

app.put('/api/users/:id/role', async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    try {
        const updatedUser = await db.update(users).set({ role }).where(eq(users.id, Number(id))).returning().get();
        if (!updatedUser) return res.status(404).json({ success: false, error: 'User not found' });
        res.json({ success: true, data: updatedUser });
    } catch (error: any) {
        console.error("Error in PUT /api/users/:id/role:", error);
        res.status(500).json({ success: false, error: 'Role update failure', details: error.message });
    }
});

app.put('/api/users/:id/profile', async (req, res) => {
    const { id } = req.params;
    const { fullname, username, email, bio, birthday, gamesPlayed, achievements: userAchievements, avatar, ign } = req.body;

    try {
        const updateSet: any = {
            bio,
            birthday,
            avatar,
            ign,
            gamesPlayed: gamesPlayed ? JSON.stringify(gamesPlayed) : undefined,
            achievements: userAchievements ? JSON.stringify(userAchievements) : undefined
        };

        if (fullname) updateSet.fullname = fullname;
        if (username) updateSet.username = username;
        if (email) updateSet.email = email.toLowerCase();

        const updatedUser = await db.update(users)
            .set(updateSet)
            .where(eq(users.id, Number(id)))
            .returning()
            .get();

        if (!updatedUser) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        res.json({ success: true, data: updatedUser });
    } catch (error: any) {
        console.error("Error in PUT /api/users/:id/profile:", error);
        res.status(500).json({ success: false, error: 'Internal Server Error', details: error.message });
    }
});

app.post('/api/auth/change-password', async (req, res) => {
    const { userId, oldPassword, newPassword } = req.body;
    if (!userId || !oldPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' });

    try {
        const uId = Number(userId);
        const user = await db.select().from(users).where(eq(users.id, uId)).get();
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        const isMatch = await verifyPassword(oldPassword, user.password, uId);
        if (!isMatch) return res.status(401).json({ success: false, error: 'Incorrect old password' });

        const hashedPassword = await hashPassword(newPassword);
        await db.update(users).set({ password: hashedPassword }).where(eq(users.id, uId)).run();
        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error: any) {
        console.error("Error in POST /api/auth/change-password:", error);
        res.status(500).json({ success: false, error: 'Failed to change password', details: IS_PROD ? undefined : error.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const userId = Number(id);
    try {
        // Step 1: find their player record (if any)
        const playerRow = await db.select().from(players).where(eq(players.userId, userId)).get();

        if (playerRow) {
            // Step 2: delete quota progress for this player
            await db.delete(playerQuotaProgress).where(eq(playerQuotaProgress.playerId, playerRow.id)).run();
            // Step 3: delete scrim player stats
            await db.delete(scrimPlayerStats).where(eq(scrimPlayerStats.playerId, playerRow.id)).run();
            // Step 4: delete tournament player stats
            await db.delete(tournamentPlayerStats).where(eq(tournamentPlayerStats.playerId, playerRow.id)).run();
            // Step 5: delete the player record itself
            await db.delete(players).where(eq(players.id, playerRow.id)).run();
        }

        // Step 6: delete the user
        const result = await db.delete(users).where(eq(users.id, userId)).run();
        if (result.changes === 0) return res.status(404).json({ success: false, error: 'User not found' });
        res.json({ success: true, message: 'Account deleted successfully' });
    } catch (error: any) {
        console.error("Error in DELETE /api/users/:id:", error);
        res.status(500).json({ success: false, error: 'Failed to delete account', details: IS_PROD ? undefined : error.message });
    }
});

// --- DYNAMIC CONTENT ROUTES ---

// achievements
app.get('/api/achievements', async (req, res) => {
    try {
        const data = await db.select().from(achievements).all();
        res.json({ success: true, data });
    } catch (error: any) {
        console.error("Error in GET /api/achievements:", error);
        res.status(500).json({ success: false, error: 'Failed to fetch achievements', details: IS_PROD ? undefined : error.message });
    }
});

app.post('/api/achievements', async (req, res) => {
    const { title, date, description, placement, image, game } = req.body;
    if (!title || !date || !description) return res.status(400).json({ success: false, error: 'Missing required fields' });
    try {
        const newAchievement = await db.insert(achievements).values({
            title, date, description, placement: placement || 'Finalist', image, game
        }).returning().get();
        res.json({ success: true, data: newAchievement });
    } catch (e: any) {
        console.error("Error creating achievement:", e);
        res.status(500).json({ success: false, error: 'Failed to add achievement', details: IS_PROD ? undefined : e.message });
    }
});

// events
app.get('/api/events', async (req, res) => {
    try {
        const data = await db.select().from(events).all();
        res.json({ success: true, data });
    } catch (error: any) {
        console.error("Error in GET /api/events:", error);
        res.status(500).json({ success: false, error: 'Failed to fetch events', details: IS_PROD ? undefined : error.message });
    }
});

app.post('/api/events', async (req, res) => {
    const { title, date, location, description, image } = req.body;
    if (!title || !date || !description) return res.status(400).json({ success: false, error: 'Missing required fields' });
    try {
        const newEvent = await db.insert(events).values({
            title, date, location, description, status: 'upcoming', image
        }).returning().get();
        res.json({ success: true, data: newEvent });
    } catch (e: any) {
        console.error("Error creating event:", e);
        res.status(500).json({ success: false, error: 'Failed to create event', details: IS_PROD ? undefined : e.message });
    }
});

// scrims — list all (optionally filtered by teamId)
app.get('/api/scrims', async (req, res) => {
    try {
        const { teamId } = req.query;
        const data = teamId
            ? await db.select().from(scrims).where(eq(scrims.teamId, Number(teamId))).all()
            : await db.select().from(scrims).all();
        res.json({ success: true, data });
    } catch (error: any) {
        console.error("Error in GET /api/scrims:", error);
        res.status(500).json({ success: false, error: 'Failed to fetch scrims', details: error.message });
    }
});

app.get('/api/scrims/:id/stats', async (req, res) => {
    const scrimId = Number(req.params.id);
    try {
        const stats = await db.select({
            ...scrimPlayerStats,
            playerName: players.name,
            playerImage: players.image
        })
            .from(scrimPlayerStats)
            .leftJoin(players, eq(scrimPlayerStats.playerId, players.id))
            .where(eq(scrimPlayerStats.scrimId, scrimId))
            .all();

        const scrimData = await db.select().from(scrims).where(eq(scrims.id, scrimId)).get();

        res.json({ success: true, data: { scrim: scrimData, stats } });
    } catch (error: any) {
        console.error("Error fetching scrim stats:", error);
        res.status(500).json({ success: false, error: 'Failed to fetch stats', details: error.message });
    }
});

app.get('/api/teams/:id/stats', async (req, res) => {
    const teamId = Number(req.params.id);
    try {
        // --- 1. SCRIM STATS ---
        const teamScrims = await db.select().from(scrims).where(eq(scrims.teamId, teamId)).all();
        const completedScrims = teamScrims.filter(s => s.status === 'completed');
        const scrimIds = completedScrims.map(s => s.id);

        let scrimWins = 0;
        let scrimLosses = 0;
        const scrimRecentForm: string[] = [];
        const scrimMapStats: Record<string, { played: number, wins: number, losses: number }> = {};
        let scrimTopPlayers: any[] = [];

        if (scrimIds.length > 0) {
            completedScrims.forEach(s => {
                if (s.results) {
                    try {
                        const results = JSON.parse(s.results);
                        let matchWins = 0;
                        let matchLosses = 0;
                        results.forEach((r: any) => {
                            const mapName = r.mapName || `Map ${r.map}`;
                            if (!scrimMapStats[mapName]) scrimMapStats[mapName] = { played: 0, wins: 0, losses: 0 };
                            scrimMapStats[mapName].played++;
                            if (r.score === 'WIN') { matchWins++; scrimMapStats[mapName].wins++; }
                            else { matchLosses++; scrimMapStats[mapName].losses++; }
                        });
                        if (matchWins > matchLosses) { scrimWins++; scrimRecentForm.push('W'); }
                        else { scrimLosses++; scrimRecentForm.push('L'); }
                    } catch (e) { }
                }
            });

            const scrimAllStats = await db.select({
                ...scrimPlayerStats,
                playerName: players.name
            })
                .from(scrimPlayerStats)
                .leftJoin(players, eq(scrimPlayerStats.playerId, players.id))
                .where(inArray(scrimPlayerStats.scrimId, scrimIds))
                .all();

            const scrimPlayerAgg: Record<number, any> = {};
            scrimAllStats.forEach(stat => {
                if (!stat.playerId) return;
                if (!scrimPlayerAgg[stat.playerId]) {
                    scrimPlayerAgg[stat.playerId] = { name: stat.playerName || 'Unknown', kills: 0, deaths: 0, assists: 0, acs: 0, games: 0 };
                }
                scrimPlayerAgg[stat.playerId].kills += stat.kills || 0;
                scrimPlayerAgg[stat.playerId].deaths += stat.deaths || 0;
                scrimPlayerAgg[stat.playerId].assists += stat.assists || 0;
                scrimPlayerAgg[stat.playerId].acs += stat.acs || 0;
                scrimPlayerAgg[stat.playerId].games++;
            });

            scrimTopPlayers = Object.values(scrimPlayerAgg).map(p => ({
                name: p.name,
                kd: p.deaths > 0 ? (p.kills / p.deaths).toFixed(2) : p.kills,
                avgAcs: Math.round(p.acs / p.games),
                games: p.games
            })).sort((a, b) => Number(b.kd) - Number(a.kd));
        }

        // --- 2. TOURNAMENT STATS ---
        const teamTourneys = await db.select().from(tournaments).where(eq(tournaments.teamId, teamId)).all();
        const completedTourneys = teamTourneys.filter(t => t.status === 'completed');
        const tourneyIds = completedTourneys.map(t => t.id);

        let tourneyWins = 0;
        let tourneyLosses = 0;
        const tourneyRecentForm: string[] = [];
        let tourneyTopPlayers: any[] = [];

        if (tourneyIds.length > 0) {
            completedTourneys.forEach(t => {
                if (t.results) {
                    try {
                        const results = JSON.parse(t.results);
                        let matchWins = 0, matchLosses = 0;
                        results.forEach((r: any) => {
                            if (r.score === 'WIN') matchWins++; else matchLosses++;
                        });
                        if (matchWins > matchLosses) { tourneyWins++; tourneyRecentForm.push('W'); }
                        else { tourneyLosses++; tourneyRecentForm.push('L'); }
                    } catch (e) { }
                }
            });

            const tourneyAllStats = await db.select({
                ...tournamentPlayerStats,
                playerName: players.name
            })
                .from(tournamentPlayerStats)
                .leftJoin(players, eq(tournamentPlayerStats.playerId, players.id))
                .where(inArray(tournamentPlayerStats.tournamentId, tourneyIds))
                .all();

            const tourneyPlayerAgg: Record<number, any> = {};
            tourneyAllStats.forEach(stat => {
                if (!stat.playerId) return;
                if (!tourneyPlayerAgg[stat.playerId]) {
                    tourneyPlayerAgg[stat.playerId] = { name: stat.playerName || 'Unknown', kills: 0, deaths: 0, assists: 0, acs: 0, games: 0 };
                }
                tourneyPlayerAgg[stat.playerId].kills += stat.kills || 0;
                tourneyPlayerAgg[stat.playerId].deaths += stat.deaths || 0;
                tourneyPlayerAgg[stat.playerId].assists += stat.assists || 0;
                tourneyPlayerAgg[stat.playerId].acs += stat.acs || 0;
                tourneyPlayerAgg[stat.playerId].games++;
            });

            tourneyTopPlayers = Object.values(tourneyPlayerAgg).map(p => ({
                name: p.name,
                kd: p.deaths > 0 ? (p.kills / p.deaths).toFixed(2) : p.kills,
                avgAcs: Math.round(p.acs / p.games),
                games: p.games
            })).sort((a, b) => Number(b.kd) - Number(a.kd));
        }

        res.json({
            success: true,
            data: {
                scrim: {
                    gamesPlayed: scrimWins + scrimLosses,
                    winRate: (scrimWins + scrimLosses) > 0 ? Math.round((scrimWins / (scrimWins + scrimLosses)) * 100) : 0,
                    wins: scrimWins,
                    losses: scrimLosses,
                    recentForm: scrimRecentForm.slice(-5),
                    mapStats: scrimMapStats,
                    topPlayers: scrimTopPlayers
                },
                tournament: {
                    gamesPlayed: tourneyWins + tourneyLosses,
                    winRate: (tourneyWins + tourneyLosses) > 0 ? Math.round((tourneyWins / (tourneyWins + tourneyLosses)) * 100) : 0,
                    wins: tourneyWins,
                    losses: tourneyLosses,
                    recentForm: tourneyRecentForm.slice(-5),
                    topPlayers: tourneyTopPlayers
                },
                topPlayers: scrimTopPlayers.slice(0, 5)
            }
        });

    } catch (error: any) {
        console.error("Error fetching team stats:", error);
        res.status(500).json({ success: false, error: 'Failed to fetch team stats', details: IS_PROD ? undefined : error.message });
    }
});

// sponsors
app.get('/api/sponsors', async (req, res) => {
    try {
        const data = await db.select().from(sponsors).all();
        res.json({ success: true, data });
    } catch (error: any) {
        console.error("Error in GET /api/sponsors:", error);
        res.status(500).json({ success: false, error: 'Failed to fetch sponsors', details: IS_PROD ? undefined : error.message });
    }
});

app.post('/api/sponsors', async (req, res) => {
    const { name, tier, logo, description, website } = req.body;
    if (!name || !tier || !logo) return res.status(400).json({ success: false, error: 'Missing required fields' });
    try {
        const newSponsor = await db.insert(sponsors).values({
            name, tier, logo, description, website
        }).returning().get();
        res.json({ success: true, data: newSponsor });
    } catch (error: any) {
        console.error("Error in POST /api/sponsors:", error);
        res.status(500).json({ success: false, error: 'Failed to add sponsor', details: IS_PROD ? undefined : error.message });
    }
});

app.put('/api/sponsors/:id', async (req, res) => {
    const { id } = req.params;
    const { tier } = req.body;
    console.log(`[DEBUG] PUT /api/sponsors/${id} - Tier: ${tier}`);

    if (!tier) {
        console.error('[DEBUG] Missing tier in request body');
        return res.status(400).json({ success: false, error: 'Missing tier' });
    }

    try {
        console.log('[DEBUG] Executing DB update...');
        const updatedSponsor = await db.update(sponsors)
            .set({ tier })
            .where(eq(sponsors.id, Number(id)))
            .returning()
            .get();

        console.log('[DEBUG] Update result:', updatedSponsor);

        if (!updatedSponsor) {
            console.error(`[DEBUG] Sponsor with ID ${id} not found.`);
            return res.status(404).json({ success: false, error: 'Sponsor not found' });
        }
        res.json({ success: true, data: updatedSponsor });
        console.log('[DEBUG] Response sent successfully.');
    } catch (e: any) {
        console.error("[DEBUG] Error updating sponsor:", e);
        res.status(500).json({ success: false, error: 'Failed to update sponsor', details: IS_PROD ? undefined : e.message });
    }
});

app.delete('/api/sponsors/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.delete(sponsors).where(eq(sponsors.id, Number(id))).run();
        if (result.changes === 0) return res.status(404).json({ success: false, error: 'Sponsor not found' });
        res.json({ success: true, message: 'Sponsor deleted successfully' });
    } catch (e: any) {
        console.error("Error deleting sponsor:", e);
        res.status(500).json({ success: false, error: 'Failed to delete sponsor', details: IS_PROD ? undefined : e.message });
    }
});

// Massive Seeding
app.post('/api/seed/massive', async (req, res) => {
    try {
        const games = ['Valorant', 'CS2', 'League of Legends', 'Dota 2', 'Overwatch 2'];
        const rolesPerGame: Record<string, string[]> = {
            'Valorant': ['Duelist', 'Sentinel', 'Initiator', 'Controller', 'IGL'],
            'CS2': ['Entry', 'AWP', 'Support', 'Lurker', 'IGL'],
            'League of Legends': ['Top', 'Jungle', 'Mid', 'ADC', 'Support'],
            'Dota 2': ['Carry', 'Mid', 'Offlane', 'Soft Support', 'Hard Support'],
            'Overwatch 2': ['Tank', 'Damage', 'Damage', 'Support', 'Support']
        };
        const mapsPerGame: Record<string, string[]> = {
            'Valorant': ['Ascent', 'Bind', 'Haven', 'Split'],
            'CS2': ['Mirage', 'Inferno', 'Dust2', 'Nuke'],
            'League of Legends': ['Summoners Rift'],
            'Dota 2': ['Dota Map'],
            'Overwatch 2': ['Eichenwalde', 'Hanamura', 'Kings Row']
        };

        const existingManagers = await db.select().from(users).where(eq(users.role, 'manager')).all();
        if (existingManagers.length === 0) return res.status(400).json({ success: false, error: 'Seed accounts first' });

        for (let i = 1; i <= 20; i++) {
            const game = games[i % games.length];
            const teamName = `NXC ${game} Squad ${Math.floor(i / 5) + 1}-${i % 5}`;

            // 1. Create Team
            let team = await db.select().from(teams).where(eq(teams.name, teamName)).get();
            if (!team) {
                team = await db.insert(teams).values({
                    name: teamName,
                    game: game,
                    managerId: existingManagers[i % existingManagers.length].id,
                    description: `Professional ${game} Division`
                }).returning().get();
            }

            // 2. Create Players (5 per team)
            const roles = rolesPerGame[game!];
            for (let j = 0; j < 5; j++) {
                const playerName = `${game}_Pro_${i}_${j}`;
                const username = playerName.toLowerCase();

                // Ensure User exists for this player
                let user = await db.select().from(users).where(eq(users.username, username)).get();
                if (!user) {
                    user = await db.insert(users).values({
                        username,
                        password: hashPassword('password123'),
                        email: `${username}@nxc-pro.com`,
                        fullname: playerName.replace(/_/g, ' '),
                        role: 'member',
                        ign: playerName
                    }).returning().get();
                }

                const existingPlayer = await db.select().from(players).where(eq(players.name, playerName)).get();
                if (!existingPlayer) {
                    await db.insert(players).values({
                        teamId: team.id,
                        userId: user.id,
                        name: playerName,
                        role: roles[j],
                        kda: (0.8 + Math.random() * 0.7).toFixed(2),
                        winRate: '50%',
                        acs: '200',
                        image: `https://ui-avatars.com/api/?name=${playerName}&background=random`
                    }).run();
                } else if (!existingPlayer.userId) {
                    await db.update(players).set({ userId: user.id }).where(eq(players.id, existingPlayer.id)).run();
                }
            }

            // 3. Create Scrim History (3 scrims per team)
            const teamPlayers = await db.select().from(players).where(eq(players.teamId, team.id)).all();
            const maps = mapsPerGame[game!];
            for (let k = 1; k <= 3; k++) {
                const date = new Date();
                date.setDate(date.getDate() - k);
                const scrim = await db.insert(scrims).values({
                    teamId: team.id,
                    date: date.toISOString(),
                    opponent: `Rival ${game} Team ${k}`,
                    format: 'BO1',
                    status: 'completed',
                    maps: JSON.stringify([maps[0]]),
                    results: JSON.stringify([{ map: 1, mapName: maps[0], score: k % 2 === 0 ? 'WIN' : 'LOSS' }])
                }).returning().get();

                // Add Player Stats
                for (const p of teamPlayers) {
                    await db.insert(scrimPlayerStats).values({
                        scrimId: scrim.id,
                        playerId: p.id,
                        kills: 15 + Math.floor(Math.random() * 15),
                        deaths: 10 + Math.floor(Math.random() * 15),
                        assists: 5 + Math.floor(Math.random() * 10),
                        acs: 150 + Math.floor(Math.random() * 200),
                        isWin: k % 2 === 0 ? 1 : 0
                    }).run();
                }
            }
        }
        res.json({ success: true, message: 'Massive dataset seeded successfully' });
    } catch (e: any) {
        console.error("Error in massive seed:", e);
        res.status(500).json({ success: false, error: 'Massive seed failed', details: IS_PROD ? undefined : e.message });
    }
});

// teams & players
app.get('/api/teams', async (req, res) => {
    const managerId = req.query.managerId ? Number(req.query.managerId) : undefined;
    const teamId = req.query.id ? Number(req.query.id) : undefined;
    try {
        let query = db.select().from(teams);
        if (managerId) {
            query = query.where(eq(teams.managerId, managerId)) as any;
        }
        if (teamId) {
            query = query.where(eq(teams.id, teamId)) as any;
        }
        const teamData = await query.all();

        // Fetch players and enrich with User data (IGN, Avatar) and live Stats
        const result = await Promise.all(teamData.map(async (team) => {
            const teamPlayers = await db.select({
                id: players.id,
                teamId: players.teamId,
                userId: players.userId,
                name: players.name,
                role: players.role,
                kda: players.kda,
                winRate: players.winRate,
                acs: players.acs,
                image: players.image,
                level: players.level,
                xp: players.xp,
                isActive: players.isActive
            }).from(players).where(eq(players.teamId, team.id)).all();

            // PSTATS: Get all completed scrim IDs for this team
            const teamScrims = await db.select().from(scrims)
                .where(eq(scrims.teamId, team.id)).all();
            const completedScrimIds = teamScrims
                .filter(s => s.status === 'completed')
                .map(s => s.id);

            const enrichedPlayers = await Promise.all(teamPlayers.map(async (p) => {
                // 1. Fetch User details for IGN/Avatar
                let enriched = { ...p };
                if (p.userId) {
                    const u = await db.select().from(users).where(eq(users.id, p.userId)).get();
                    if (u) {
                        enriched.name = u.ign || u.username;
                        enriched.image = u.avatar || p.image;
                    }
                }

                // 2. Compute Live Stats from Scrimmage Results (Scoped to Team)
                let kdaValue = 0;
                let avgAcs = 0;
                let winRateVal = 0;

                if (completedScrimIds.length > 0) {
                    const pStats = await db.select().from(scrimPlayerStats)
                        .where(inArray(scrimPlayerStats.scrimId, completedScrimIds))
                        .all();

                    const myStats = pStats.filter(s => s.playerId === p.id);

                    if (myStats.length > 0) {
                        const totalAcs = myStats.reduce((acc, s) => acc + (s.acs || 0), 0);
                        const sumKda = myStats.reduce((acc, s) => {
                            const matchKda = (s.kills + s.assists) / (s.deaths || 1);
                            return acc + matchKda;
                        }, 0);
                        kdaValue = sumKda / myStats.length;
                        avgAcs = Math.round(totalAcs / myStats.length);

                        const wins = myStats.filter(s => s.isWin === 1).length;
                        winRateVal = (wins / myStats.length) * 100;
                    }
                }

                return {
                    ...enriched,
                    kda: kdaValue.toFixed(2),
                    acs: avgAcs.toString(),
                    winRate: `${winRateVal.toFixed(1)}%`
                };
            }));

            return { ...team, players: enrichedPlayers };
        }));

        res.json({ success: true, data: result });
    } catch (error: any) {
        console.error("Error in GET /api/teams:", error);
        res.status(500).json({ success: false, error: 'Failed to fetch teams', details: IS_PROD ? undefined : error.message });
    }
});

app.get('/api/players', async (req, res) => {
    const { userId } = req.query;
    try {
        let data;
        if (userId) {
            data = await db.select({
                id: players.id,
                teamId: players.teamId,
                userId: players.userId,
                name: players.name,
                role: players.role,
                kda: players.kda,
                winRate: players.winRate,
                acs: players.acs,
                image: players.image,
                level: players.level,
                xp: players.xp,
                isActive: players.isActive,
                teamGame: teams.game
            })
                .from(players)
                .leftJoin(teams, eq(players.teamId, teams.id))
                .where(eq(players.userId, Number(userId)))
                .all();
        } else {
            data = await db.select({
                id: players.id,
                teamId: players.teamId,
                userId: players.userId,
                name: players.name,
                role: players.role,
                kda: players.kda,
                winRate: players.winRate,
                acs: players.acs,
                image: players.image,
                level: players.level,
                xp: players.xp,
                isActive: players.isActive,
                teamGame: teams.game
            })
                .from(players)
                .leftJoin(teams, eq(players.teamId, teams.id))
                .all();
        }
        res.json({ success: true, data });
    } catch (error: any) {
        console.error("Error in GET /api/players:", error);
        res.status(500).json({ success: false, error: 'Failed to fetch players', details: IS_PROD ? undefined : error.message });
    }
});

// Manager Routes (POST)
app.post('/api/teams', async (req, res) => {
    const { name, game, description, managerId } = req.body;
    if (!name || !game) return res.status(400).json({ success: false, error: 'Missing team name or game' });
    try {
        const newTeam = await db.insert(teams).values({
            name,
            game,
            description,
            managerId: managerId ? Number(managerId) : null
        }).returning().get();
        res.json({ success: true, data: newTeam });
    } catch (error: any) {
        console.error("Error in POST /api/teams:", error);
        res.status(500).json({ success: false, error: 'Failed to create team', details: error.message });
    }
});

app.put('/api/teams/:id/manager', async (req, res) => {
    const { id } = req.params;
    const { managerId } = req.body;
    try {
        await db.update(teams).set({ managerId: managerId ? Number(managerId) : null }).where(eq(teams.id, Number(id))).run();
        res.json({ success: true });
    } catch (error: any) {
        console.error("Error in PUT /api/teams/:id/manager:", error);
        res.status(500).json({ success: false, error: 'Failed to update team manager', details: error.message });
    }
});

// Advanced Analytics
app.get('/api/analytics/performers', async (req, res) => {
    try {
        const teamId = req.query.teamId;
        let pList;
        const analyticsResult: any = { players: [] };

        if (teamId && teamId !== 'all') {
            const tid = Number(teamId);
            pList = await db.select().from(players).where(eq(players.teamId, tid)).all();

            // Map Stats for specified team
            const teamScrims = await db.select().from(scrims).where(eq(scrims.teamId, tid)).all();
            const mapData: Record<string, { played: number, wins: number }> = {};

            for (const s of teamScrims) {
                const scrimMaps = JSON.parse(s.maps || '[]');
                const scrimResults = JSON.parse(s.results || '[]'); // maps results

                scrimMaps.forEach((mapName: string, idx: number) => {
                    if (!mapData[mapName]) mapData[mapName] = { played: 0, wins: 0 };
                    mapData[mapName].played++;
                    const result = scrimResults.find((r: any) => r.mapName === mapName || r.map === (idx + 1));
                    if (result && result.score === 'WIN') mapData[mapName].wins++;
                });
            }
            analyticsResult.mapStats = Object.entries(mapData).map(([name, stats]) => ({
                name,
                winRate: Math.round((stats.wins / stats.played) * 100)
            }));
        } else {
            pList = await db.select().from(players).all();
        }

        for (const p of pList) {
            const playerStats = await db.select().from(scrimPlayerStats).where(eq(scrimPlayerStats.playerId, p.id)).all();
            if (playerStats.length > 0) {
                const avgKda = playerStats.reduce((acc, s) => acc + (s.kills + s.assists) / (s.deaths || 1), 0) / playerStats.length;
                const avgAcs = playerStats.reduce((acc, s) => acc + (s.acs || 0), 0) / playerStats.length;
                analyticsResult.players.push({
                    name: p.name,
                    teamId: p.teamId,
                    kda: avgKda.toFixed(2),
                    acs: Math.round(avgAcs)
                });
            }
        }
        res.json({ success: true, data: analyticsResult });
    } catch (error: any) {
        console.error("Error in GET /api/analytics/performers:", error);
        res.status(500).json({ success: false, error: 'Failed to aggregate analytics', details: IS_PROD ? undefined : error.message });
    }
});

// ── Weekly Reports History ───────────────────────────────────────────────────────
// GET /api/reports/history  → list all stored weekly snapshots (newest first)
app.get('/api/reports/history', async (req, res) => {
    try {
        const all = await db.select({
            id: weeklyReports.id,
            weekStart: weeklyReports.weekStart,
            weekEnd: weeklyReports.weekEnd,
            generatedAt: weeklyReports.generatedAt,
        }).from(weeklyReports).all();
        // Sort newest first
        all.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
        res.json({ success: true, data: all });
    } catch (error: any) {
        console.error('[HISTORY] list failed:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch report history', details: error.message });
    }
});

// GET /api/reports/history/:id  → full data for one past report
app.get('/api/reports/history/:id', async (req, res) => {
    try {
        const report = await db.select().from(weeklyReports).where(eq(weeklyReports.id, Number(req.params.id))).get();
        if (!report) return res.status(404).json({ success: false, error: 'Report not found' });
        const data = JSON.parse(report.reportData);

        // Normalize legacy or inconsistent snapshot data for the Unified Hub
        if (data.summary) {
            if (data.summary.wins === undefined) {
                data.summary.wins = (data.summary.scrimWins || 0) + (data.summary.tourWins || 0);
            }
            if (data.summary.losses === undefined) {
                data.summary.losses = (data.summary.scrimLosses || 0) + (data.summary.tourLosses || 0);
            }
            if (data.summary.pendingScrims === undefined) {
                data.summary.pendingScrims = (data.summary.pending || data.summary.pendingScrims || 0);
            }
        }
        res.json({ success: true, data });
    } catch (error: any) {
        console.error("History fetch failed:", error);
        res.status(500).json({ success: false, error: 'Failed to fetch historical report', details: error.message });
    }
});

app.get('/api/reports/weekly', async (req, res) => {
    try {
        const today = new Date();
        const { start: startOfWeek, end: endOfWeek } = getSundaySaturdayRange(today);
        const filterTeamId = req.query.teamId ? Number(req.query.teamId) : undefined;

        let allScrims = await db.select().from(scrims).all();
        let allTournaments = await db.select().from(tournaments).all();

        // Optional team filter
        if (filterTeamId) {
            allScrims = allScrims.filter(s => s.teamId === filterTeamId);
            allTournaments = allTournaments.filter(t => (t as any).teamId === filterTeamId);
        }

        // Filter to current week (only for weekly mode, but keep all records for deckStats)
        const filteredScrims = allScrims.filter(s => {
            const d = new Date(s.date);
            return d >= startOfWeek && d <= endOfWeek;
        });

        const filteredTours = allTournaments.filter(t => {
            const d = new Date(t.date);
            return d >= startOfWeek && d <= endOfWeek;
        });

        // All-time totals (for Citadel Deck overall stats)
        const allTimeScrims = allScrims.filter(s => s.status === 'completed');
        let allTimeWins = 0, allTimeLosses = 0;
        for (const s of allTimeScrims) {
            const results = JSON.parse(s.results || '[]');
            const wins = results.filter((r: any) => r.score === 'WIN').length;
            const losses = results.filter((r: any) => r.score === 'LOSS').length;
            if (wins > losses) allTimeWins++; else allTimeLosses++;
        }

        const summary: any = {
            totalScrims: filteredScrims.length,
            totalTournaments: filteredTours.length,
            wins: 0,
            losses: 0,
            pending: 0,
            teamSummaries: {},
            allTime: {
                total: allTimeScrims.length,
                wins: allTimeWins,
                losses: allTimeLosses,
                winRate: allTimeScrims.length > 0 ? Math.round((allTimeWins / allTimeScrims.length) * 100) : 0
            }
        };

        const teamsData = await db.select().from(teams).all();
        const teamMap: Record<number, string> = {};
        teamsData.forEach(t => { teamMap[t.id] = t.name; });

        for (const s of filteredScrims) {
            if (!summary.teamSummaries[s.teamId!]) {
                summary.teamSummaries[s.teamId!] = {
                    name: teamMap[s.teamId!] || 'Unknown Team',
                    wins: 0,
                    losses: 0,
                    pending: 0,
                    total: 0
                };
            }
            summary.teamSummaries[s.teamId!].total++;
            if (s.status === 'pending') {
                summary.pending++;
                summary.teamSummaries[s.teamId!].pending++;
            } else {
                const results = JSON.parse(s.results || '[]');
                const wins = results.filter((r: any) => r.score === 'WIN').length;
                const losses = results.filter((r: any) => r.score === 'LOSS').length;
                const isWin = wins > losses;
                if (isWin) {
                    summary.wins++;
                    summary.teamSummaries[s.teamId!].wins++;
                } else {
                    summary.losses++;
                    summary.teamSummaries[s.teamId!].losses++;
                }
            }
        }

        // Add Tournaments to global summary
        for (const t of filteredTours) {
            if (t.status === 'pending') {
                summary.pending++;
            } else {
                const results = JSON.parse(t.results || '[]');
                const wins = results.filter((r: any) => r.score === 'WIN').length;
                const losses = results.filter((r: any) => r.score === 'LOSS').length;
                const isWin = wins > losses;
                if (isWin) summary.wins++;
                else summary.losses++;
            }
        }

        res.json({
            success: true,
            data: {
                summary: {
                    totalScrims: summary.totalScrims,
                    totalTournaments: summary.totalTournaments,
                    wins: summary.wins,
                    losses: summary.losses,
                    pendingScrims: summary.pending,
                    scrimWinRate: summary.totalScrims > summary.pending ? Math.round((summary.wins / (summary.totalScrims - summary.pending)) * 100) : 0,
                    orgVelocity: summary.totalScrims + summary.totalTournaments
                },
                allTime: summary.allTime,
                teamSummaries: summary.teamSummaries
            }
        });
    } catch (error: any) {
        console.error("Error in GET /api/reports/weekly:", error);
        res.status(500).json({ success: false, error: 'Failed to generate report', details: IS_PROD ? undefined : error.message });
    }
});


// --- PLAYER QUOTA SYSTEM ---

/**
 * Returns the ISO date string (YYYY-MM-DD) for the Monday of the week containing the given date.
 */
function getMondayISO(d: Date) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
}

// Get Team Quotas & Player Progress for a given week
app.get('/api/teams/:id/quotas', async (req, res) => {
    try {
        const teamId = Number(req.params.id);
        const weekStart = req.query.week as string || getMondayISO(new Date());

        // 1. Fetch Roster Quota Settings
        const team = await db.select().from(teams).where(eq(teams.id, teamId)).get();
        if (!team) return res.status(404).json({ success: false, error: 'Team not found' });

        const isShooting = team?.game && (GAME_CATEGORY[team.game as keyof typeof GAME_CATEGORY] === 'FPS' || GAME_CATEGORY[team.game as keyof typeof GAME_CATEGORY] === 'BR');

        let baseQuota = await db.select().from(rosterQuotas).where(eq(rosterQuotas.teamId, teamId)).get();
        if (!baseQuota) {
            baseQuota = { teamId, baseAimKills: 0, baseGrindRG: 0, id: 0, reducedAimKills: 0, reducedGrindRG: 0, updatedAt: 0 };
        }

        // 2. Fetch Team Players
        const teamPlayers = await db.select().from(players).where(eq(players.teamId, teamId)).all();

        // 3. Aggregate Progress
        const playersWithQuotas = await Promise.all(teamPlayers.map(async (player) => {
            let progress = await db.select().from(playerQuotaProgress)
                .where(and(eq(playerQuotaProgress.playerId, player.id), eq(playerQuotaProgress.weekStart, weekStart)))
                .get();

            // Auto-initialize progress if missing for the requested week
            if (!progress) {
                const prevDate = new Date(weekStart);
                prevDate.setDate(prevDate.getDate() - 7);
                const prevWeekStart = prevDate.toISOString().split('T')[0];

                const prevProgress = await db.select().from(playerQuotaProgress)
                    .where(and(eq(playerQuotaProgress.playerId, player.id), eq(playerQuotaProgress.weekStart, prevWeekStart)))
                    .get();

                let pKills = 0, pRG = 0, cKills = 0, cRG = 0;

                if (prevProgress) {
                    const bK = baseQuota.baseAimKills || 0;
                    const bR = baseQuota.baseGrindRG || 0;

                    const aimGoal = bK + (prevProgress.punishmentKills || 0) + (prevProgress.carryOverKills || 0);
                    const grindGoal = bR + (prevProgress.punishmentRG || 0) + (prevProgress.carryOverRG || 0);

                    if (prevProgress.totalAimKills < aimGoal) {
                        pKills = 250;
                        cKills = Math.max(0, aimGoal - prevProgress.totalAimKills);
                    }
                    if (prevProgress.totalGrindRG < grindGoal) {
                        pRG = 10;
                        cRG = Math.max(0, grindGoal - prevProgress.totalGrindRG);
                    }
                }

                progress = await db.insert(playerQuotaProgress).values({
                    playerId: player.id,
                    weekStart: weekStart,
                    aimStatus: 'pending',
                    grindStatus: 'pending',
                    totalAimKills: 0,
                    totalGrindRG: 0,
                    aimProof: '[]',
                    assignedBaseAim: baseQuota.baseAimKills || 0,
                    assignedBaseGrind: baseQuota.baseGrindRG || 0,
                    punishmentKills: pKills,
                    punishmentRG: pRG,
                    carryOverKills: cKills,
                    carryOverRG: cRG
                }).returning().get();
            } else if ((progress.assignedBaseAim === 0 || progress.assignedBaseAim === null) && (progress.assignedBaseGrind === 0 || progress.assignedBaseGrind === null)) {
                // Feature transition: lock in current base quotas for existing records that haven't been snapshotted yet
                await db.update(playerQuotaProgress)
                    .set({
                        assignedBaseAim: baseQuota.baseAimKills || 0,
                        assignedBaseGrind: baseQuota.baseGrindRG || 0
                    })
                    .where(eq(playerQuotaProgress.id, progress.id))
                    .run();
                progress.assignedBaseAim = baseQuota.baseAimKills || 0;
                progress.assignedBaseGrind = baseQuota.baseGrindRG || 0;
            }

            return {
                ...player,
                progress
            };
        }));

        res.json({
            success: true,
            data: {
                baseQuota,
                players: playersWithQuotas
            }
        });
    } catch (error: any) {
        console.error("Quota Fetch Error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch quotas", details: IS_PROD ? undefined : error.message });
    }
});

// Update Roster Base Quota
app.post('/api/teams/:id/settings/quota', async (req, res) => {
    try {
        const teamId = Number(req.params.id);
        const { baseAimKills, baseGrindRG, reducedAimKills, reducedGrindRG } = req.body;

        const existing = await db.select().from(rosterQuotas).where(eq(rosterQuotas.teamId, teamId)).get();
        if (existing) {
            await db.update(rosterQuotas)
                .set({ baseAimKills, baseGrindRG, reducedAimKills, reducedGrindRG, updatedAt: new Date() })
                .where(eq(rosterQuotas.teamId, teamId))
                .run();
        } else {
            await db.insert(rosterQuotas).values({ teamId, baseAimKills, baseGrindRG, reducedAimKills, reducedGrindRG }).run();
        }
        res.json({ success: true, message: 'Settings updated' });
    } catch (error: any) {
        console.error("Quota Update Error:", error);
        res.status(500).json({ success: false, error: "Failed to update team settings", details: IS_PROD ? undefined : error.message });
    }
});

// Update Player Progress
app.post('/api/players/:id/quota/update', async (req, res) => {
    try {
        const playerId = Number(req.params.id);
        const { weekStart, aimProof, grindProof, aimStatus, grindStatus } = req.body;

        const aimKillsTotal = JSON.parse(aimProof || '[]').reduce((sum: number, item: any) => sum + (Number(item.kills) || 0), 0);
        const grindRGTotal = JSON.parse(grindProof || '[]').reduce((sum: number, item: any) => sum + (Number(item.games) || 0), 0);

        const progress = await db.select().from(playerQuotaProgress)
            .where(and(eq(playerQuotaProgress.playerId, playerId), eq(playerQuotaProgress.weekStart, weekStart)))
            .get();

        if (!progress) return res.status(404).json({ success: false, error: "Quota record not found for this week" });

        await db.update(playerQuotaProgress)
            .set({
                aimProof,
                grindProof,
                totalAimKills: aimKillsTotal,
                totalGrindRG: grindRGTotal,
                aimStatus: aimStatus || progress.aimStatus,
                grindStatus: grindStatus || progress.grindStatus,
                updatedAt: new Date()
            })
            .where(eq(playerQuotaProgress.id, progress.id))
            .run();

        res.json({ success: true, data: { totalAimKills: aimKillsTotal, totalGrindRG: grindRGTotal } });
    } catch (error: any) {
        console.error("Progress Update Error:", error);
        res.status(500).json({ success: false, error: "Failed to update progress", details: IS_PROD ? undefined : error.message });
    }
});

// Review Player Quota Progress (Approve/Reject)
app.post('/api/players/:id/quota/review', async (req, res) => {
    try {
        const playerId = Number(req.params.id);
        const { weekStart, aimStatus, grindStatus } = req.body;

        const progress = await db.select().from(playerQuotaProgress)
            .where(and(eq(playerQuotaProgress.playerId, playerId), eq(playerQuotaProgress.weekStart, weekStart)))
            .get();

        if (!progress) return res.status(404).json({ success: false, error: "Quota record not found" });

        await db.update(playerQuotaProgress)
            .set({
                aimStatus: aimStatus || progress.aimStatus,
                grindStatus: grindStatus || progress.grindStatus,
                updatedAt: new Date()
            })
            .where(eq(playerQuotaProgress.id, progress.id))
            .run();

        res.json({ success: true, message: 'Quota reviewed' });
    } catch (error: any) {
        console.error("Quota Review Error:", error);
        res.status(500).json({ success: false, error: "Failed to review quota", details: IS_PROD ? undefined : error.message });
    }
});

// Set Individual Weekly Quota Overwrite
app.post('/api/players/:id/quota/custom', async (req, res) => {
    try {
        const playerId = Number(req.params.id);
        const { weekStart, assignedBaseAim, assignedBaseGrind } = req.body;

        const progress = await db.select().from(playerQuotaProgress)
            .where(and(eq(playerQuotaProgress.playerId, playerId), eq(playerQuotaProgress.weekStart, weekStart)))
            .get();

        if (!progress) return res.status(404).json({ success: false, error: "Quota record not found for this week" });

        await db.update(playerQuotaProgress)
            .set({
                assignedBaseAim: Number(assignedBaseAim),
                assignedBaseGrind: Number(assignedBaseGrind),
                updatedAt: new Date()
            })
            .where(eq(playerQuotaProgress.id, progress.id))
            .run();

        res.json({ success: true, message: 'Custom quota set' });
    } catch (error: any) {
        console.error("Custom Quota Error:", error);
        res.status(500).json({ success: false, error: "Failed to set custom quota", details: IS_PROD ? undefined : error.message });
    }
});

// --- Reporting & Telemetry Logic ---

/**
 * Calculates the Sunday-Saturday range for the current week.
 * Sunday is the start, Saturday is the end.
 */
function getSundaySaturdayRange(referenceDate: Date = new Date()) {
    const start = new Date(referenceDate);
    const day = referenceDate.getDay(); // 0 (Sun) to 6 (Sat)
    start.setDate(referenceDate.getDate() - day);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
}

export async function generateAndSendWeeklyReport() {
    try {
        const today = new Date();
        const { start: startOfWeek, end: endOfWeek } = getSundaySaturdayRange(today);

        // Use startOfWeek for filtering data
        const filterDate = startOfWeek;

        // 1. Fetch all data
        const allScrims = await db.select().from(scrims).all();
        const allTournaments = await db.select().from(tournaments).all();
        const allTeams = await db.select().from(teams).all();
        const allPlayers = await db.select().from(players).all();
        const allAchievements = await db.select().from(achievements).all();
        const allEvents = await db.select().from(events).all();
        const allSponsors = await db.select().from(sponsors).all();

        const recentScrims = allScrims.filter(s => {
            const d = new Date(s.date);
            return d >= startOfWeek && d <= endOfWeek;
        });
        const recentTournaments = allTournaments.filter(t => {
            const d = new Date(t.date);
            return d >= startOfWeek && d <= endOfWeek;
        });
        const recentAchievements = allAchievements.filter(a => new Date(a.date) >= filterDate);
        const upcomingEvents = allEvents.filter(e => new Date(e.date) >= new Date()).slice(0, 5);

        const teamMap: Record<number, string> = {};
        allTeams.forEach(t => { teamMap[t.id] = t.name; });


        // 2. Per-team scrim stats (Weekly Filtered)
        const scrimTeamStats: Record<number, { name: string; wins: number; losses: number; pending: number; total: number; maps: Record<string, { w: number; t: number }> }> = {};
        recentScrims.forEach(s => {
            const tid = s.teamId!;
            if (!scrimTeamStats[tid]) scrimTeamStats[tid] = { name: teamMap[tid] || 'Unknown', wins: 0, losses: 0, pending: 0, total: 0, maps: {} };

            scrimTeamStats[tid].total++;
            if (s.status === 'pending') {
                scrimTeamStats[tid].pending++;
            } else {
                let results: any[] = []; try { results = JSON.parse(s.results || '[]'); } catch { }
                let mapsArr: string[] = []; try { mapsArr = JSON.parse(s.maps || '[]'); } catch { }
                const isWin = results.filter((r: any) => r.score === 'WIN').length > results.filter((r: any) => r.score === 'LOSS').length;

                if (isWin) scrimTeamStats[tid].wins++; else scrimTeamStats[tid].losses++;
                mapsArr.forEach((m: string, i: number) => {
                    if (!scrimTeamStats[tid].maps[m]) scrimTeamStats[tid].maps[m] = { w: 0, t: 0 };
                    scrimTeamStats[tid].maps[m].t++;
                    if (results[i]?.score === 'WIN') scrimTeamStats[tid].maps[m].w++;
                });
            }
        });

        // 3. Per-team tournament stats (Weekly Filtered)
        const tourTeamStats: Record<number, { name: string; wins: number; losses: number; pending: number; total: number; formats: Record<string, number> }> = {};
        recentTournaments.forEach(t => {
            const tid = t.teamId!;
            if (!tourTeamStats[tid]) tourTeamStats[tid] = { name: teamMap[tid] || 'Unknown', wins: 0, losses: 0, pending: 0, total: 0, formats: {} };

            tourTeamStats[tid].total++;
            if (t.status === 'pending') {
                tourTeamStats[tid].pending++;
            } else {
                let results: any[] = []; try { results = JSON.parse(t.results || '[]'); } catch { }
                const isWin = results.filter((r: any) => r.score === 'WIN').length > results.filter((r: any) => r.score === 'LOSS').length;
                if (isWin) tourTeamStats[tid].wins++; else tourTeamStats[tid].losses++;
            }
            const fmt = t.format || 'Unknown';
            tourTeamStats[tid].formats[fmt] = (tourTeamStats[tid].formats[fmt] || 0) + 1;
        });

        // Top rosters by weekly win rate (Completed matches only)
        const topScrimRosters = Object.values(scrimTeamStats)
            .filter(t => (t.total - t.pending) > 0)
            .map(t => ({ ...t, winRate: (t.wins / (t.total - t.pending)) * 100 }))
            .sort((a, b) => b.winRate - a.winRate).slice(0, 5);

        // Top rosters by weekly tournament win rate
        const topTourRosters = Object.values(tourTeamStats)
            .filter(t => (t.total - t.pending) > 0)
            .map(t => ({ ...t, winRate: (t.wins / (t.total - t.pending)) * 100 }))
            .sort((a, b) => b.winRate - a.winRate).slice(0, 5);

        // Top players
        const topByACS = [...allPlayers].sort((a, b) => Number(b.acs || 0) - Number(a.acs || 0)).slice(0, 5);
        const topByKDA = [...allPlayers].sort((a, b) => Number(b.kda || 0) - Number(a.kda || 0)).slice(0, 5);

        // Global map win rates
        const globalMapWins: Record<string, { w: number; t: number }> = {};
        Object.values(scrimTeamStats).forEach(ts => {
            Object.entries(ts.maps).forEach(([map, v]) => {
                if (!globalMapWins[map]) globalMapWins[map] = { w: 0, t: 0 };
                globalMapWins[map].w += v.w;
                globalMapWins[map].t += v.t;
            });
        });
        const topMaps = Object.entries(globalMapWins)
            .map(([name, v]) => ({ name, winRate: v.t > 0 ? Math.round((v.w / v.t) * 100) : 0 }))
            .sort((a, b) => b.winRate - a.winRate).slice(0, 6);

        // ── PDF ──────────────────────────────────────────────────────────────
        const GOLD = '#D4AF37';
        const PURPLE = '#2D0B5A';
        const PARCHMENT = '#FDF5E6';
        const TEXT_COLOR = '#1a1a1a';
        const L_MARGIN = 60;
        const CHART_WIDTH = 420;

        const pdfFileName = `NXC_Royal_Edict_${Date.now()}.pdf`;
        const pdfPath = resolve(process.cwd(), pdfFileName);
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const writeStream = fs.createWriteStream(pdfPath);
        doc.pipe(writeStream);

        const addPageBg = () => {
            doc.rect(0, 0, 595, 842).fill(PARCHMENT);
            doc.lineWidth(3).strokeColor(GOLD).rect(18, 18, 559, 806).stroke();
            doc.lineWidth(1).rect(23, 23, 549, 796).stroke();
        };

        const addSectionHeader = (title: string) => {
            if (doc.y > 720) { doc.addPage(); addPageBg(); doc.moveDown(2); }
            doc.fillColor(PURPLE).fontSize(14).font('Times-Bold').text(title, L_MARGIN);
            doc.lineWidth(1.5).strokeColor(GOLD).moveTo(L_MARGIN, doc.y + 2).lineTo(535, doc.y + 2).stroke();
            doc.moveDown(1.2);
        };

        const addBar = (label: string, value: number, maxVal: number, suffix = '') => {
            const y = doc.y;
            const bw = maxVal > 0 ? Math.max((value / maxVal) * CHART_WIDTH, 2) : 2;
            doc.fillColor('#e8e0c8').rect(L_MARGIN, y, CHART_WIDTH, 16).fill();
            doc.fillColor(GOLD).rect(L_MARGIN, y, bw, 16).fill();
            doc.fillColor(PURPLE).fontSize(9).font('Times-Bold').text(label.toUpperCase(), L_MARGIN + 4, y + 4);
            doc.fillColor(PURPLE).text(`${value}${suffix}`, L_MARGIN + CHART_WIDTH + 8, y + 4);
            doc.y = y + 20;
        };

        // ── PAGE 1: COVER ──────────────────────────────────────────────────
        addPageBg();
        doc.rect(18, 18, 559, 120).fill(PURPLE);
        doc.fillColor(GOLD).fontSize(26).font('Times-Bold').text('ROYAL PERFORMANCE EDICT', 18, 38, { align: 'center', width: 559 });
        doc.fontSize(11).font('Times-Roman').text('NXC ESPORTS — COMPREHENSIVE COMMAND INTELLIGENCE', 18, 72, { align: 'center', width: 559 });
        doc.fontSize(9).text(`DECREED: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} | STATUS: SOVEREIGN & CONFIDENTIAL`, 18, 92, { align: 'center', width: 559 });

        doc.y = 160;

        // ── SECTION 1: EXECUTIVE SUMMARY ──────────────────────────────────
        addSectionHeader('I. EXECUTIVE SUMMARY');

        const totalScrimWins = Object.values(scrimTeamStats).reduce((a, t) => a + t.wins, 0);
        const totalScrimLosses = Object.values(scrimTeamStats).reduce((a, t) => a + t.losses, 0);
        const totalScrimPending = Object.values(scrimTeamStats).reduce((a, t) => a + t.pending, 0);
        const totalScrimTotal = totalScrimWins + totalScrimLosses;

        const totalTourWins = Object.values(tourTeamStats).reduce((a, t) => a + t.wins, 0);
        const totalTourLosses = Object.values(tourTeamStats).reduce((a, t) => a + t.losses, 0);
        const totalTourPending = Object.values(tourTeamStats).reduce((a, t) => a + t.pending, 0);
        const totalTourTotal = totalTourWins + totalTourLosses;

        const summaryData = [
            ['METRIC', 'VALUE'],
            ['Total Teams Registered', `${allTeams.length}`],
            ['Total Players Registered', `${allPlayers.length}`],
            ['Total Scrims (All Time)', `${allScrims.length}`],
            ['Scrims This Week', `${recentScrims.length}`],
            ['Pending Scrims (Systemic)', `${totalScrimPending}`],
            ['Scrim Win Rate (Completed)', totalScrimTotal > 0 ? `${Math.round((totalScrimWins / totalScrimTotal) * 100)}%` : 'N/A'],
            ['Total Tournaments (All Time)', `${allTournaments.length}`],
            ['Tournaments This Week', `${recentTournaments.length}`],
            ['Pending Tournies (Systemic)', `${totalTourPending}`],
            ['Tournament Win Rate (Completed)', totalTourTotal > 0 ? `${Math.round((totalTourWins / totalTourTotal) * 100)}%` : 'N/A'],
            ['Active Sponsors/Partners', `${allSponsors.length}`],
        ];

        summaryData.forEach(([k, v], i) => {
            if (i === 0) {
                doc.fillColor(PURPLE).fontSize(10).font('Times-Bold').text(k, L_MARGIN, doc.y, { continued: true, width: 300 });
                doc.text(v, { align: 'right', width: 220 });
            } else {
                const rowY = doc.y;
                if (i % 2 === 0) doc.fillColor('#f0e8d0').rect(L_MARGIN, rowY - 2, 460, 16).fill();
                doc.fillColor(TEXT_COLOR).fontSize(10).font('Times-Roman').text(k, L_MARGIN + 4, rowY, { continued: true, width: 296 });
                doc.fillColor(PURPLE).font('Times-Bold').text(v, { align: 'right', width: 160 });
            }
        });

        doc.moveDown(1.5);

        // ── SECTION 2: SCRIM ANALYTICS ────────────────────────────────────
        addSectionHeader('II. SCRIM NETWORK ANALYTICS');

        // Weekly combine status bars
        doc.fillColor(TEXT_COLOR).fontSize(10).font('Times-Bold').text('Weekly Combined Engagement Status (Scrims & Tournies):', L_MARGIN);
        doc.moveDown(0.5);

        const totalOps = recentScrims.length + recentTournaments.length;
        const maxOps = Math.max(totalOps, 1);

        const combinedWins = totalScrimWins + totalTourWins;
        const combinedPending = totalScrimPending + totalTourPending;
        const combinedLosses = totalOps - combinedWins - combinedPending;

        addBar('Total Victories', combinedWins, maxOps);
        addBar('Operational Losses', combinedLosses, maxOps);
        addBar('Pending Engagements', combinedPending, maxOps);
        doc.moveDown(0.8);

        // Top scrim rosters
        doc.fillColor(TEXT_COLOR).fontSize(10).font('Times-Bold').text('Top Performing Squads (Scrim Win Rate):', L_MARGIN);
        doc.moveDown(0.5);
        if (topScrimRosters.length === 0) {
            doc.fillColor(TEXT_COLOR).fontSize(10).font('Times-Roman').text('No completed scrims on record.', L_MARGIN + 10);
        } else {
            topScrimRosters.forEach(r => addBar(`${r.name}  (${r.wins}W-${r.losses}L)`, Math.round(r.winRate), 100, '%'));
        }
        doc.moveDown(0.8);

        // Per-team detailed breakdown
        if (Object.values(scrimTeamStats).length > 0) {
            doc.fillColor(TEXT_COLOR).fontSize(10).font('Times-Bold').text('Full Team Scrim Breakdown:', L_MARGIN);
            doc.moveDown(0.4);
            const headers = ['Team', 'W', 'L', 'P', 'WR%'];
            const colX = [L_MARGIN + 4, L_MARGIN + 240, L_MARGIN + 280, L_MARGIN + 320, L_MARGIN + 380];
            doc.fillColor(PURPLE).fontSize(9).font('Times-Bold');
            headers.forEach((h, i) => doc.text(h, colX[i], doc.y, { continued: i < headers.length - 1 }));
            doc.lineWidth(0.5).strokeColor(GOLD).moveTo(L_MARGIN, doc.y + 2).lineTo(535, doc.y + 2).stroke();
            doc.moveDown(0.5);
            Object.values(scrimTeamStats).sort((a, b) => (b.wins / (b.total || 1)) - (a.wins / (a.total || 1))).forEach((t, idx) => {
                const wr = t.total > t.pending ? Math.round((t.wins / (t.total - t.pending)) * 100) : 0;
                if (idx % 2 === 0) doc.fillColor('#f0e8d0').rect(L_MARGIN, doc.y - 1, 460, 14).fill();
                doc.fillColor(TEXT_COLOR).fontSize(9).font('Times-Roman');
                doc.text(t.name, colX[0], doc.y, { continued: true, width: 230 });
                doc.text(`${t.wins}`, colX[1], doc.y, { continued: true, width: 30 });
                doc.text(`${t.losses}`, colX[2], doc.y, { continued: true, width: 30 });
                doc.text(`${t.pending}`, colX[3], doc.y, { continued: true, width: 40 });
                doc.fillColor(wr >= 60 ? '#2d6a4f' : wr >= 40 ? '#7d5a00' : PURPLE).font('Times-Bold').text(`${wr}%`, colX[4], doc.y);
            });
        }
        doc.moveDown(1.5);

        // ── SECTION 3: MAP INTELLIGENCE ─────────────────────────────────
        if (topMaps.length > 0) {
            addSectionHeader('III. THEATER MAP INTELLIGENCE');
            doc.fillColor(TEXT_COLOR).fontSize(10).font('Times-Bold').text('Global Map Win Rate (All Scrims Combined):', L_MARGIN);
            doc.moveDown(0.5);
            topMaps.forEach(m => addBar(m.name, m.winRate, 100, '%'));
            doc.moveDown(1.5);
        }

        // ── SECTION 4: TOURNAMENT ANALYTICS ──────────────────────────────
        addSectionHeader('IV. TOURNAMENT NETWORK ANALYTICS');

        // Top tournament rosters
        doc.fillColor(TEXT_COLOR).fontSize(10).font('Times-Bold').text('Top Performing Squads (Tournament Win Rate):', L_MARGIN);
        doc.moveDown(0.5);
        if (topTourRosters.length === 0) {
            doc.fillColor(TEXT_COLOR).fontSize(10).font('Times-Roman').text('No completed tournaments on record.', L_MARGIN + 10);
        } else {
            topTourRosters.forEach(r => addBar(`${r.name}  (${r.wins}W-${r.losses}L)`, Math.round(r.winRate), 100, '%'));
        }
        doc.moveDown(0.8);

        // Per-team tournament breakdown
        if (Object.values(tourTeamStats).length > 0) {
            doc.fillColor(TEXT_COLOR).fontSize(10).font('Times-Bold').text('Full Team Tournament Breakdown:', L_MARGIN);
            doc.moveDown(0.4);
            const colX2 = [L_MARGIN + 4, L_MARGIN + 240, L_MARGIN + 280, L_MARGIN + 320, L_MARGIN + 380];
            doc.fillColor(PURPLE).fontSize(9).font('Times-Bold');
            ['Team', 'W', 'L', 'P', 'WR%'].forEach((h, i, arr) => doc.text(h, colX2[i], doc.y, { continued: i < arr.length - 1 }));
            doc.lineWidth(0.5).strokeColor(GOLD).moveTo(L_MARGIN, doc.y + 2).lineTo(535, doc.y + 2).stroke();
            doc.moveDown(0.5);
            Object.values(tourTeamStats).sort((a, b) => (b.wins / (b.total || 1)) - (a.wins / (a.total || 1))).forEach((t, idx) => {
                const wr = t.total > t.pending ? Math.round((t.wins / (t.total - t.pending)) * 100) : 0;
                if (idx % 2 === 0) doc.fillColor('#f0e8d0').rect(L_MARGIN, doc.y - 1, 460, 14).fill();
                doc.fillColor(TEXT_COLOR).fontSize(9).font('Times-Roman');
                doc.text(t.name, colX2[0], doc.y, { continued: true, width: 230 });
                doc.text(`${t.wins}`, colX2[1], doc.y, { continued: true, width: 30 });
                doc.text(`${t.losses}`, colX2[2], doc.y, { continued: true, width: 30 });
                doc.text(`${t.pending}`, colX2[3], doc.y, { continued: true, width: 40 });
                doc.fillColor(wr >= 60 ? '#2d6a4f' : wr >= 40 ? '#7d5a00' : PURPLE).font('Times-Bold').text(`${wr}%`, colX2[4], doc.y);
            });
        }
        doc.moveDown(1.5);

        // ── SECTION 5: PLAYER LEADERBOARD ─────────────────────────────────
        addSectionHeader('V. CHAMPIONS OF THE REALM (Player Leaderboard)');

        doc.fillColor(TEXT_COLOR).fontSize(10).font('Times-Bold').text('Top 5 by Average Combat Score (ACS):', L_MARGIN);
        doc.moveDown(0.5);
        const maxAcs = Math.max(...topByACS.map(p => Number(p.acs || 0)), 1);
        topByACS.forEach(p => addBar(p.name, Number(p.acs || 0), maxAcs));
        doc.moveDown(0.8);

        doc.fillColor(TEXT_COLOR).fontSize(10).font('Times-Bold').text('Top 5 by Kill/Death/Assist Ratio (KDA):', L_MARGIN);
        doc.moveDown(0.4);
        const maxKda = Math.max(...topByKDA.map(p => Number(p.kda || 0)), 1);
        topByKDA.forEach(p => addBar(p.name, Number(p.kda || 0), maxKda));
        doc.moveDown(1.5);

        // ── SECTION 6: RECENT TRIUMPHS ────────────────────────────────────
        if (recentAchievements.length > 0) {
            addSectionHeader('VI. RECENT TRIUMPHS');
            recentAchievements.slice(0, 5).forEach(a => {
                doc.fillColor(TEXT_COLOR).fontSize(10).font('Times-Bold').text(`• ${a.title}  [${a.placement || 'Finalist'}]`, L_MARGIN + 10);
                doc.fontSize(9).font('Times-Roman').fillColor('#444').text(a.description || '', L_MARGIN + 20, doc.y, { width: 460 });
                doc.moveDown(0.4);
            });
            doc.moveDown(1);
        }

        // ── SECTION 7: UPCOMING EVENTS ────────────────────────────────────
        if (upcomingEvents.length > 0) {
            addSectionHeader('VII. FUTURE DECREES (Upcoming Events)');
            upcomingEvents.forEach(e => {
                const d = new Date(e.date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });
                doc.fillColor(TEXT_COLOR).fontSize(10).font('Times-Bold').text(`• ${e.title}`, L_MARGIN + 10, doc.y, { continued: true });
                doc.fillColor(PURPLE).font('Times-Roman').text(`  ${d}`, { align: 'right', width: 300 });
                if (e.location) doc.fillColor('#666').fontSize(9).text(`  ${e.location}`, L_MARGIN + 20);
                doc.moveDown(0.3);
            });
            doc.moveDown(1);
        }

        // ── SECTION 8: PARTNERS & SPONSORS ───────────────────────────────
        if (allSponsors.length > 0) {
            addSectionHeader('VIII. IMPERIAL PATRONS (Sponsors & Partners)');
            const tiers = ['Platinum', 'Gold', 'Silver', 'Bronze'];
            tiers.forEach(tier => {
                const inTier = allSponsors.filter(s => s.tier === tier);
                if (inTier.length === 0) return;
                doc.fillColor(PURPLE).fontSize(10).font('Times-Bold').text(`${tier.toUpperCase()} TIER`, L_MARGIN + 4);
                doc.fillColor(TEXT_COLOR).fontSize(9).font('Times-Roman').text(inTier.map(s => s.name).join('  •  '), L_MARGIN + 16, doc.y, { width: 460 });
                doc.moveDown(0.5);
            });
            doc.moveDown(1);
        }

        // Footer on last page
        doc.fillColor(PURPLE).fontSize(8).font('Times-Italic')
            .text('By Royal Decree of the NXC Executive Council. All metrics verified and sovereign. This document is confidential.', 18, 808, { align: 'center', width: 559 });

        doc.end();
        await finished(writeStream);

        // 5. SAVE SNAPSHOT TO VAULT (CONSOLIDATED HISTORY)
        let reportSnapshotData: any = null;
        try {
            const today = new Date();
            reportSnapshotData = {
                summary: {
                    totalScrims: recentScrims.length,
                    totalTournaments: recentTournaments.length,
                    totalTeams: allTeams.length,
                    totalPlayers: allPlayers.length,
                    wins: totalScrimWins + totalTourWins,
                    losses: totalScrimLosses + totalTourLosses,
                    pendingScrims: totalScrimPending + totalTourPending,
                    scrimWins: totalScrimWins,
                    scrimLosses: totalScrimLosses,
                    tourWins: totalTourWins,
                    tourLosses: totalTourLosses,
                    scrimWinRate: totalScrimTotal > 0 ? ((totalScrimWins / totalScrimTotal) * 100).toFixed(1) : '0',
                    tourWinRate: totalTourTotal > 0 ? ((totalTourWins / totalTourTotal) * 100).toFixed(1) : '0',
                    orgVelocity: recentScrims.length + recentTournaments.length,
                    reportScope: 'WEEKLY_OPERATIONS'
                },
                teamSummaries: scrimTeamStats,
                tournamentSummaries: tourTeamStats,
                topScrimRosters,
                topTourRosters,
                topByACS,
                topByKDA,
                topMaps,
                upcomingEvents,
                allSponsors: allSponsors.map(s => ({ name: s.name, tier: s.tier }))
            };

            const weekStartStr = startOfWeek.toLocaleDateString('sv-SE');
            const weekEndStr = endOfWeek.toLocaleDateString('sv-SE');

            // --- UPSERT LOGIC ---
            // Check if a report for this specific week already exists
            const existing = await db.select().from(weeklyReports)
                .where(and(eq(weeklyReports.weekStart, weekStartStr), eq(weeklyReports.weekEnd, weekEndStr)))
                .get();

            if (existing) {
                await db.update(weeklyReports)
                    .set({
                        generatedAt: today.toISOString(),
                        reportData: JSON.stringify(reportSnapshotData),
                        pdfPath: pdfFileName
                    })
                    .where(eq(weeklyReports.id, existing.id))
                    .run();
                console.log(`[VAULT] Performance snapshot UPDATED for period ${weekStartStr} to ${weekEndStr}`);
            } else {
                await db.insert(weeklyReports).values({
                    weekStart: weekStartStr,
                    weekEnd: weekEndStr,
                    generatedAt: today.toISOString(),
                    reportData: JSON.stringify(reportSnapshotData),
                    pdfPath: pdfFileName
                }).run();
                console.log(`[VAULT] Performance snapshot ARCHIVED for period ${weekStartStr} to ${weekEndStr}`);
            }
        } catch (snapshotError) {
            console.error('[VAULT] Snapshot failed:', snapshotError);
        }

        // Standardized summary mapping for non-snapshot usage
        const finalSummary = reportSnapshotData ? {
            ...reportSnapshotData.summary,
            totalOperations: reportSnapshotData.summary.orgVelocity,
            topPlayer: topByACS[0]?.name || 'N/A',
            topRoster: topScrimRosters[0]?.name || 'N/A'
        } : {
            totalScrims: recentScrims.length,
            totalTournaments: recentTournaments.length,
            wins: totalScrimWins + totalTourWins,
            losses: totalScrimLosses + totalTourLosses,
            pendingScrims: totalScrimPending + totalTourPending,
            scrimWinRate: totalScrimTotal > 0 ? ((totalScrimWins / totalScrimTotal) * 100).toFixed(1) : '0',
            orgVelocity: recentScrims.length + recentTournaments.length,
            totalOperations: recentScrims.length + recentTournaments.length,
            topPlayer: topByACS[0]?.name || 'N/A',
            topRoster: topScrimRosters[0]?.name || 'N/A'
        };

        // Ensure PDF results match these calculations
        console.log(`[EDICT] Logic Audit Complete. Weekly Combat: ${finalSummary.wins}W / ${finalSummary.losses}L (Velocity: ${finalSummary.orgVelocity})`);

        // 6. Email Dispatch
        const gmailUser = process.env.GMAIL_USER;
        const gmailPass = process.env.GMAIL_APP_PASS;
        const CEO_EMAIL = 'nexuscollectiveesports@gmail.com';

        if (!gmailUser || !gmailPass) {
            console.warn('[EMAIL] GMAIL_USER or GMAIL_APP_PASS not found. Skipping email.');
            return {
                success: true,
                message: 'Royal Edict generated but email skipped (missing credentials)',
                pdfPath,
                reportSummary: finalSummary
            };
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: gmailUser, pass: gmailPass }
        });

        const emailBody = [
            `By Royal Decree of the NXC Executive Council,`,
            ``,
            `Attached is the comprehensive Royal Performance Edict covering all active divisions.`,
            ``,
            `Period: ${startOfWeek.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} to ${endOfWeek.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
            ``,
            `── EXECUTIVE SUMMARY ──`,
            `Teams: ${allTeams.length}  |  Players: ${allPlayers.length}`,
            `Scrims (All Time): ${allScrims.length}  |  This Week: ${recentScrims.length}`,
            `Scrim Win Rate: ${totalScrimTotal > 0 ? Math.round((totalScrimWins / totalScrimTotal) * 100) : 0}%  (${totalScrimWins}W / ${totalScrimLosses}L)`,
            `Tournaments (All Time): ${allTournaments.length}  |  This Week: ${recentTournaments.length}`,
            `Tournament Win Rate: ${totalTourTotal > 0 ? Math.round((totalTourWins / totalTourTotal) * 100) : 0}%  (${totalTourWins}W / ${totalTourLosses}L)`,
            ``,
            `── TOP COMBATANTS ──`,
            ...topByACS.slice(0, 3).map((p, i) => `${i + 1}. ${p.name}  ACS: ${p.acs}`),
            ``,
            `── TOP SCRIM ROSTERS ──`,
            ...topScrimRosters.slice(0, 3).map((r, i) => `${i + 1}. ${r.name}  ${Math.round(r.winRate)}% WR (${r.wins}W-${r.losses}L)`),
            ``,
            `── TOP TOURNAMENT ROSTERS ──`,
            ...topTourRosters.slice(0, 3).map((r, i) => `${i + 1}. ${r.name}  ${Math.round(r.winRate)}% WR (${r.wins}W-${r.losses}L)`),
            ``,
            `Full breakdown archived in the Citadel.`,
            ``,
            `— NXC Royal Intelligence Division`,
        ].join('\n');

        const mailOptions = {
            from: `"NXC Royal Intelligence" <${gmailUser}>`,
            to: CEO_EMAIL,
            cc: gmailUser,
            subject: `[NXC Royal Edict] Performance Report — ${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
            text: emailBody,
            attachments: [{ filename: pdfFileName, path: pdfPath }]
        };

        await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] Royal Edict dispatched to ${CEO_EMAIL}`);

        return {
            success: true,
            message: `Royal Performance Edict generated and dispatched to ${CEO_EMAIL}`,
            reportSummary: finalSummary
        };

    } catch (e) {
        console.error("Report Generation failed:", e);
        throw e;
    }
}

app.post('/api/reports/telemetry/push', async (req, res) => {
    try {
        const result = await generateAndSendWeeklyReport();
        res.json({ success: true, data: result });
    } catch (e: any) {
        console.error("Telemetry Push Error:", e);
        res.status(500).json({ success: false, error: 'Failed to push telemetry', details: IS_PROD ? undefined : e.message });
    }
});





app.post('/api/seed/managers', async (req, res) => {
    try {
        // Create 3 Managers
        const managerNames = ['Manager Alpha', 'Manager Beta', 'Manager Gamma'];
        const createdManagers = [];

        for (const name of managerNames) {
            const username = name.toLowerCase().replace(' ', '_');
            // Check if exists
            let user = await db.select().from(users).where(eq(users.username, username)).get();
            if (!user) {
                user = await db.insert(users).values({
                    username,
                    password: 'password123',
                    email: `${username}@nxc.com`,
                    fullname: name,
                    role: 'manager'
                }).returning().get();
            } else {
                await db.update(users).set({ role: 'manager' }).where(eq(users.id, user.id)).run();
            }
            createdManagers.push(user);
        }

        // Create 2 Teams for each manager
        for (const manager of createdManagers) {
            for (let i = 1; i <= 2; i++) {
                const teamName = `${manager.fullname} Squad ${i}`;
                const existing = await db.select().from(teams).where(eq(teams.name, teamName)).get();
                if (!existing) {
                    await db.insert(teams).values({
                        name: teamName,
                        game: 'Valorant',
                        managerId: manager.id,
                        description: `Test team for ${manager.fullname}`
                    }).run();
                }
            }
        }

        res.json({ success: true, message: 'Managers and teams seeded successfully' });
    } catch (error: any) {
        console.error("Error in POST /api/seed/managers:", error);
        res.status(500).json({ success: false, error: 'Failed to seed data', details: IS_PROD ? undefined : error.message });
    }
});

app.post('/api/teams/:id/players', async (req, res) => {
    const { id } = req.params;
    const { name, role, kda, winRate, userId } = req.body;

    // If userId provided, verify user exists
    let targetUserId = userId ? Number(userId) : null;
    let playerName = name;

    try {
        if (targetUserId) {
            const u = await db.select().from(users).where(eq(users.id, targetUserId)).get();
            if (!u) return res.status(404).json({ success: false, error: 'User to add not found' });
            playerName = u.ign || u.username;

            // Grant secondary role if member
            if (u.role === 'member') {
                await db.update(users).set({ role: 'member,player' }).where(eq(users.id, targetUserId)).run();
            }
        }

        const newPlayer = await db.insert(players).values({
            teamId: Number(id),
            userId: targetUserId,
            name: playerName, // Store current name as fallback/record
            role, kda, winRate,
            image: `https://ui-avatars.com/api/?name=${playerName}&background=random` // Default image if no user avatar
        }).returning().get();

        // Refresh user role if it was current user or broadcast (simplified: just return new role info if helpful)
        res.json({ success: true, data: { player: newPlayer, newRole: 'member,player' } });
    } catch (error: any) {
        console.error("Error in POST /api/teams/:id/players:", error);
        res.status(500).json({ success: false, error: 'Failed to add player', details: IS_PROD ? undefined : error.message });
    }
});

app.delete('/api/teams/:teamId/players/:playerId', async (req, res) => {
    const { teamId, playerId } = req.params;
    try {
        const p = await db.select().from(players).where(eq(players.id, Number(playerId))).get();
        if (p && p.userId) {
            // Check if they are in any other teams
            const userPlayers = await db.select().from(players).where(eq(players.userId, p.userId)).all();
            const stillInOtherTeams = userPlayers.some(up => up.teamId !== null && up.id !== Number(playerId));

            if (!stillInOtherTeams) {
                const u = await db.select().from(users).where(eq(users.id, p.userId)).get();
                if (u && u.role === 'member,player') {
                    await db.update(users).set({ role: 'member' }).where(eq(users.id, p.userId)).run();
                }
            }
        }

        await db.update(players)
            .set({ teamId: null, isActive: false })
            .where(and(eq(players.teamId, Number(teamId)), eq(players.id, Number(playerId))))
            .run();
        res.json({ success: true });
    } catch (error: any) {
        console.error("Error in DELETE /api/teams/:teamId/players/:playerId:", error);
        res.status(500).json({ success: false, error: 'Failed to remove player', details: IS_PROD ? undefined : error.message });
    }
});

// Scrim Routes
app.get('/api/scrims', async (req, res) => {
    const { teamId } = req.query;
    if (!teamId) return res.status(400).json({ success: false, error: 'Missing teamId' });
    try {
        const teamScrims = await db.select().from(scrims).where(eq(scrims.teamId, Number(teamId))).all();
        // Enrich with stats if needed, or fetch separately
        res.json({ success: true, data: teamScrims });
    } catch (error: any) {
        console.error("Error in GET /api/scrims:", error);
        res.status(500).json({ success: false, error: 'Failed to fetch scrims', details: error.message });
    }
});

app.post('/api/scrims', async (req, res) => {
    const { teamId, date, opponent, format, maps } = req.body;
    if (!teamId || !date || !opponent || !format) return res.status(400).json({ success: false, error: 'Missing fields' });
    try {
        const newScrim = await db.insert(scrims).values({
            teamId: Number(teamId),
            date, opponent, format, status: 'pending',
            maps: maps ? JSON.stringify(maps) : null
        }).returning().get();

        res.json({ success: true, data: newScrim });

        // Discord Notification (fire-and-forget, does not block response)
        (async () => {
            try {
                const team = await db.select().from(teams).where(eq(teams.id, Number(teamId))).get();
                const teamName = team?.name || 'Unknown Squad';
                const formattedMaps = Array.isArray(maps)
                    ? maps.map((m, i) => `> **Theater ${i + 1}:** ${m}`).join('\n')
                    : '> **Theater:** TBD';

                const localDate = new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
                const localTime = new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                const discordMsg = `🚨 **NEW TACTICAL SCRIM SCHEDULED** 🚨\n\n` +
                    `**Squad Mention:** @${teamName}\n` +
                    `**Opponent:** ${opponent}\n` +
                    `**Engagement Protocol:** ${format}\n` +
                    `**Operational Date:** ${localDate}\n` +
                    `**Deployment Time:** ${localTime}\n\n` +
                    `**Active Theaters:**\n${formattedMaps}\n\n` +
                    `*Stand by for engagement updates. All personnel report to stations.*`;

                const { sendToDiscord } = await import('./discord');
                const targetChannelId = process.env.DISCORD_SCRIM_CHANNEL_ID;
                await sendToDiscord(discordMsg, null, targetChannelId);
            } catch (discordErr) {
                console.error('[DISCORD ERROR] Failed to send scrim notification:', discordErr);
            }
        })();
    } catch (error: any) {
        console.error("Error in POST /api/scrims:", error);
        res.status(500).json({ success: false, error: 'Failed to create scrim', details: IS_PROD ? undefined : error.message });
    }
});

app.put('/api/scrims/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // pending, completed, cancelled
    try {
        const updated = await db.update(scrims).set({ status }).where(eq(scrims.id, Number(id))).returning().get();
        res.json({ success: true, data: updated });
    } catch (error: any) {
        console.error("Error in PUT /api/scrims/:id/status:", error);
        res.status(500).json({ success: false, error: 'Failed to update status', details: IS_PROD ? undefined : error.message });
    }
});

// Tournament Routes
app.get('/api/tournaments', async (req, res) => {
    const { teamId } = req.query;
    try {
        const q = db.select().from(tournaments);
        if (teamId) q.where(eq(tournaments.teamId, Number(teamId)));
        const data = await q.all();
        res.json({ success: true, data });
    } catch (error: any) {
        console.error("Error in GET /api/tournaments:", error);
        res.status(500).json({ success: false, error: 'Failed to fetch tournaments', details: IS_PROD ? undefined : error.message });
    }
});

app.get('/api/tournaments/:id/stats', async (req, res) => {
    const { id } = req.params;
    try {
        const stats = await db.select().from(tournamentPlayerStats).where(eq(tournamentPlayerStats.tournamentId, Number(id))).all();
        res.json({ success: true, data: { stats } });
    } catch (error: any) {
        console.error("Error in GET /api/tournaments/:id/stats:", error);
        res.status(500).json({ success: false, error: 'Failed to fetch tournament stats', details: IS_PROD ? undefined : error.message });
    }
});

app.post('/api/tournaments', async (req, res) => {
    const { teamId, date, name, opponent, format, maps } = req.body;
    if (!teamId || !date || !name || !format) return res.status(400).json({ success: false, error: 'Missing fields' });
    try {
        const newTournament = await db.insert(tournaments).values({
            teamId: Number(teamId),
            date, name, opponent, format, status: 'pending',
            maps: maps ? JSON.stringify(maps) : null
        }).returning().get();

        res.json({ success: true, data: newTournament });

        // Discord Notification (fire-and-forget, does not block response)
        (async () => {
            try {
                const team = await db.select().from(teams).where(eq(teams.id, Number(teamId))).get();
                const teamName = team?.name || 'Unknown Squad';
                const formattedMaps = Array.isArray(maps)
                    ? maps.map((m, i) => `> **Theater ${i + 1}:** ${m}`).join('\n')
                    : '> **Theater:** TBD';

                const localDate = new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
                const localTime = new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                const discordMsg = `🏆 **NEW TOURNAMENT OPERATION LOGGED** 🏆\n\n` +
                    `**Unit Mention:** @${teamName}\n` +
                    `**Tournament:** ${name}\n` +
                    `**Engagement Protocol:** ${format}\n` +
                    `**Operational Date:** ${localDate}\n` +
                    `**Deployment Time:** ${localTime}\n\n` +
                    `**Active Theaters:**\n${formattedMaps}\n\n` +
                    `*Stand by for tournament status updates. Good luck operatives.*`;

                const { sendToDiscord } = await import('./discord');
                const targetChannelId = process.env.DISCORD_TOURNAMENT_CHANNEL_ID;
                await sendToDiscord(discordMsg, null, targetChannelId);
            } catch (discordErr) {
                console.error('[DISCORD ERROR] Failed to send tournament notification:', discordErr);
            }
        })();
    } catch (error: any) {
        console.error("Error in POST /api/tournaments:", error);
        res.status(500).json({ success: false, error: 'Failed to create tournament entry', details: IS_PROD ? undefined : error.message });
    }
});

app.put('/api/tournaments/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const updated = await db.update(tournaments).set({ status }).where(eq(tournaments.id, Number(id))).returning().get();
        res.json({ success: true, data: updated });
    } catch (error: any) {
        console.error("Error in PUT /api/tournaments/:id/status:", error);
        res.status(500).json({ success: false, error: 'Failed to update tournament status', details: IS_PROD ? undefined : error.message });
    }
});

app.post('/api/tournaments/:id/results', async (req, res) => {
    const { id } = req.params;
    const { results, playerStats } = req.body;

    try {
        await db.update(tournaments).set({
            status: 'completed',
            results: JSON.stringify(results)
        }).where(eq(tournaments.id, Number(id))).run();

        if (playerStats && Array.isArray(playerStats)) {
            await db.delete(tournamentPlayerStats).where(eq(tournamentPlayerStats.tournamentId, Number(id))).run();

            for (const stat of playerStats) {
                if (stat.playerId) {
                    await db.insert(tournamentPlayerStats).values({
                        tournamentId: Number(id),
                        playerId: stat.playerId,
                        kills: Number(stat.kills),
                        deaths: Number(stat.deaths),
                        assists: Number(stat.assists),
                        acs: Number(stat.acs || 0),
                        isWin: stat.isWin ? 1 : 0
                    }).run();
                }
            }
        }
        res.json({ success: true, message: 'Tournament results saved' });
    } catch (error: any) {
        console.error("Error in POST /api/tournaments/:id/results:", error);
        res.status(500).json({ success: false, error: 'Failed to save tournament results', details: IS_PROD ? undefined : error.message });
    }
});


// AI & Results
// AI & Results
// Groq Service
// Tesseract Service
import { analyzeScoreboardWithOCR } from './services/ocr';

app.post('/api/scrims/analyze', async (req, res) => {
    const { image, teamId } = req.body;
    if (!image || !teamId) return res.status(400).json({ success: false, error: 'Missing image or teamId' });

    try {
        console.log(`[OCR] Request received for Team ${teamId}`);
        // Fetch roster for context
        const roster = await db.select().from(players).where(eq(players.teamId, Number(teamId))).all();

        // Analyze
        const result = await analyzeScoreboardWithOCR(image, roster);

        // Map back to IDs
        const mappedResults = result.results.map((res: any) => {
            const player = roster.find((p: any) => p.name.toLowerCase() === res.name.toLowerCase());
            return {
                ...res,
                playerId: player ? player.id : null
            };
        });

        res.json({ success: true, isVictory: result.isVictory, results: mappedResults });

    } catch (error: any) {
        console.error("Groq Analysis failed:", error);
        res.status(500).json({ success: false, error: 'Groq Analysis failed', details: IS_PROD ? undefined : error.message });
    }
});

app.post('/api/scrims/:id/results', async (req, res) => {
    const { id } = req.params;
    const { results, playerStats } = req.body; // results: string (urls), playerStats: array

    try {
        // 1. Update Scrim
        await db.update(scrims).set({
            status: 'completed',
            results: JSON.stringify(results)
        }).where(eq(scrims.id, Number(id))).run();

        // 2. Insert Player Stats
        if (playerStats && Array.isArray(playerStats)) {
            // clear old stats if re-submitting
            await db.delete(scrimPlayerStats).where(eq(scrimPlayerStats.scrimId, Number(id))).run();

            for (const stat of playerStats) {
                if (stat.playerId) {
                    await db.insert(scrimPlayerStats).values({
                        scrimId: Number(id),
                        playerId: stat.playerId,
                        kills: Number(stat.kills),
                        deaths: Number(stat.deaths),
                        assists: Number(stat.assists),
                        isWin: stat.isWin ? 1 : 0
                    }).run();

                    // 3. Trigger Aggregation
                    const allStats = await db.select().from(scrimPlayerStats).where(eq(scrimPlayerStats.playerId, stat.playerId)).all();

                    let totalK = 0, totalD = 0, totalA = 0, totalAcs = 0, wins = 0;
                    allStats.forEach((s: any) => {
                        totalK += s.kills;
                        totalD += s.deaths;
                        totalA += s.assists;
                        totalAcs += (s.acs || 0);
                        if (s.isWin) wins++;
                    });

                    const kda = totalD === 0 ? totalK + totalA : (totalK + totalA) / totalD;
                    const winRate = allStats.length > 0 ? (wins / allStats.length) * 100 : 0;
                    const avgAcs = allStats.length > 0 ? Math.round(totalAcs / allStats.length) : 0;

                    const currentPlayer = await db.select().from(players).where(eq(players.id, stat.playerId)).get();
                    let newXp = (currentPlayer?.xp || 0) + 20;
                    let newLevel = Math.floor(newXp / 100) + 1;
                    if (newLevel > 1000) newLevel = 1000;

                    await db.update(players).set({
                        kda: kda.toFixed(2),
                        winRate: `${winRate.toFixed(1)}%`,
                        acs: avgAcs.toString(),
                        xp: newXp,
                        level: newLevel
                    }).where(eq(players.id, stat.playerId)).run();
                }
            }
        }

        res.json({ success: true, message: 'Results saved, stats updated, and XP awarded' });
    } catch (error: any) {
        console.error("Error in POST /api/scrims/:id/results:", error);
        res.status(500).json({ success: false, error: 'Failed to save results', details: IS_PROD ? undefined : error.message });
    }
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`[INTERNAL_ERROR] ${req.method} ${req.url}:`, err.stack || err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        path: req.url,
        timestamp: new Date().toISOString()
    });
});


// Startup
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);

    // Initialize Services
    if (!IS_PROD) runMigrations();
    initDiscord();
    initScheduler(generateAndSendWeeklyReport);
});
