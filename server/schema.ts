import { pgTable, text, integer, serial, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    username: text('username').notNull().unique(),
    password: text('password').notNull(),
    email: text('email').notNull().unique(),
    fullname: text('fullname').notNull(),
    googleId: text('google_id').unique(),
    avatar: text('avatar'),
    role: text('role').default('member'),
    bio: text('bio'),
    gamesPlayed: text('games_played'),
    achievements: text('achievements'),
    birthday: text('birthday'),
    createdAt: timestamp('created_at').defaultNow(),
    ign: text('ign'),
});

export const scrims = pgTable('scrims', {
    id: serial('id').primaryKey(),
    teamId: integer('team_id').references(() => teams.id),
    date: text('date').notNull(),
    opponent: text('opponent').notNull(),
    format: text('format').notNull(),
    status: text('status').default('pending'),
    results: text('results'),
    maps: text('maps'),
});

export const scrimPlayerStats = pgTable('scrim_player_stats', {
    id: serial('id').primaryKey(),
    scrimId: integer('scrim_id').references(() => scrims.id),
    playerId: integer('player_id').references(() => players.id),
    kills: integer('kills').default(0),
    deaths: integer('deaths').default(0),
    assists: integer('assists').default(0),
    acs: integer('acs').default(0),
    isWin: integer('is_win').default(0),
});

export const achievements = pgTable('achievements', {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    date: text('date').notNull(),
    description: text('description').notNull(),
    image: text('image'),
    placement: text('placement'),
    game: text('game'),
});

export const events = pgTable('events', {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    date: text('date').notNull(),
    location: text('location'),
    description: text('description'),
    status: text('status').default('upcoming'),
    image: text('image'),
});

export const sponsors = pgTable('sponsors', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    tier: text('tier').notNull(),
    logo: text('logo').notNull(),
    description: text('description'),
    website: text('website'),
});

export const teams = pgTable('teams', {
    id: serial('id').primaryKey(),
    name: text('name').notNull().unique(),
    managerId: integer('manager_id').references(() => users.id),
    game: text('game').notNull(),
    logo: text('logo'),
    description: text('description'),
});

export const players = pgTable('players', {
    id: serial('id').primaryKey(),
    teamId: integer('team_id').references(() => teams.id),
    userId: integer('user_id').references(() => users.id),
    name: text('name').notNull(),
    role: text('role').notNull(),
    kda: text('kda'),
    winRate: text('win_rate'),
    acs: text('acs'),
    image: text('image'),
    level: integer('level').default(1),
    xp: integer('xp').default(0),
    isActive: boolean('is_active').default(true),
});

export const eventNotifications = pgTable('event_notifications', {
    id: serial('id').primaryKey(),
    eventId: integer('event_id').references(() => events.id),
    type: text('type').notNull(),
    sentAt: timestamp('sent_at').defaultNow(),
});

export const scrimNotifications = pgTable('scrim_notifications', {
    id: serial('id').primaryKey(),
    scrimId: integer('scrim_id').references(() => scrims.id),
    type: text('type').notNull(),
    sentAt: timestamp('sent_at').defaultNow(),
});

export const tournamentNotifications = pgTable('tournament_notifications', {
    id: serial('id').primaryKey(),
    tournamentId: integer('tournament_id').references(() => tournaments.id),
    type: text('type').notNull(),
    sentAt: timestamp('sent_at').defaultNow(),
});

export const tournaments = pgTable('tournaments', {
    id: serial('id').primaryKey(),
    teamId: integer('team_id').references(() => teams.id),
    date: text('date').notNull(),
    name: text('name').notNull(),
    opponent: text('opponent'),
    format: text('format').notNull(),
    status: text('status').default('pending'),
    results: text('results'),
    maps: text('maps'),
});

export const tournamentPlayerStats = pgTable('tournament_player_stats', {
    id: serial('id').primaryKey(),
    tournamentId: integer('tournament_id').references(() => tournaments.id),
    playerId: integer('player_id').references(() => players.id),
    kills: integer('kills').default(0),
    deaths: integer('deaths').default(0),
    assists: integer('assists').default(0),
    acs: integer('acs').default(0),
    isWin: integer('is_win').default(0),
});

export const weeklyReports = pgTable('weekly_reports', {
    id: serial('id').primaryKey(),
    weekStart: text('week_start').notNull(),
    weekEnd: text('week_end').notNull(),
    generatedAt: text('generated_at').notNull(),
    reportData: text('report_data').notNull(),
    pdfPath: text('pdf_path'),
});

export const rosterQuotas = pgTable('roster_quotas', {
    id: serial('id').primaryKey(),
    teamId: integer('team_id').references(() => teams.id).unique(),
    baseAimKills: integer('base_aim_kills').default(0),
    baseGrindRG: integer('base_grind_rg').default(0),
    reducedAimKills: integer('reduced_aim_kills').default(0),
    reducedGrindRG: integer('reduced_grind_rg').default(0),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const playerQuotaProgress = pgTable('player_quota_progress', {
    id: serial('id').primaryKey(),
    playerId: integer('player_id').references(() => players.id),
    weekStart: text('week_start').notNull(),
    aimStatus: text('aim_status').default('pending'),
    grindStatus: text('grind_status').default('pending'),
    totalAimKills: integer('total_aim_kills').default(0),
    totalGrindRG: integer('total_grind_rg').default(0),
    aimProof: text('aim_proof'),
    grindProof: text('grind_proof'),
    assignedBaseAim: integer('assigned_base_aim').default(0),
    assignedBaseGrind: integer('assigned_base_grind').default(0),
    punishmentKills: integer('punishment_kills').default(0),
    punishmentRG: integer('punishment_rg').default(0),
    carryOverKills: integer('carry_over_kills').default(0),
    carryOverRG: integer('carry_over_rg').default(0),
    updatedAt: timestamp('updated_at').defaultNow(),
});
