// Standalone PDF preview generator — uses real data from local.db
// Run: node --experimental-vm-modules generate_pdf_preview.mjs
// Or:  npx tsx generate_pdf_preview.mjs
import Database from 'better-sqlite3';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import { finished } from 'stream/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, 'local.db');
const OUT_PATH = resolve(__dirname, 'NXC_Royal_Edict_Preview.pdf');

const raw = new Database(DB_PATH, { readonly: true });

const allScrims = raw.prepare('SELECT * FROM scrims').all();
const allTournaments = raw.prepare('SELECT * FROM tournaments').all();
const allTeams = raw.prepare('SELECT * FROM teams').all();
const allPlayers = raw.prepare('SELECT * FROM players').all();
const allAchievements = raw.prepare('SELECT * FROM achievements').all();
const allEvents = raw.prepare('SELECT * FROM events').all();
const allSponsors = raw.prepare('SELECT * FROM sponsors').all();

raw.close();

const oneWeekAgo = new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
const recentScrims = allScrims.filter(s => new Date(s.date) >= oneWeekAgo);
const recentTournaments = allTournaments.filter(t => new Date(t.date) >= oneWeekAgo);
const recentAchievements = allAchievements.filter(a => new Date(a.date) >= oneWeekAgo);
const upcomingEvents = allEvents.filter(e => new Date(e.date) >= new Date()).slice(0, 5);

const teamMap = {};
allTeams.forEach(t => { teamMap[t.id] = t.name; });

// Per-team scrim stats
const scrimTeamStats = {};
allScrims.filter(s => s.status === 'completed').forEach(s => {
    const tid = s.teamId;
    if (!scrimTeamStats[tid]) scrimTeamStats[tid] = { name: teamMap[tid] || 'Unknown', wins: 0, losses: 0, total: 0, maps: {} };
    let results = []; try { results = JSON.parse(s.results || '[]'); } catch { }
    let mapsArr = []; try { mapsArr = JSON.parse(s.maps || '[]'); } catch { }
    const isWin = results.filter(r => r.score === 'WIN').length > results.filter(r => r.score === 'LOSS').length;
    scrimTeamStats[tid].total++;
    if (isWin) scrimTeamStats[tid].wins++; else scrimTeamStats[tid].losses++;
    mapsArr.forEach((m, i) => {
        if (!scrimTeamStats[tid].maps[m]) scrimTeamStats[tid].maps[m] = { w: 0, t: 0 };
        scrimTeamStats[tid].maps[m].t++;
        if (results[i]?.score === 'WIN') scrimTeamStats[tid].maps[m].w++;
    });
});

// Per-team tournament stats
const tourTeamStats = {};
allTournaments.filter(t => t.status === 'completed').forEach(t => {
    const tid = t.teamId;
    if (!tourTeamStats[tid]) tourTeamStats[tid] = { name: teamMap[tid] || 'Unknown', wins: 0, losses: 0, total: 0, formats: {} };
    let results = []; try { results = JSON.parse(t.results || '[]'); } catch { }
    const isWin = results.filter(r => r.score === 'WIN').length > results.filter(r => r.score === 'LOSS').length;
    tourTeamStats[tid].total++;
    if (isWin) tourTeamStats[tid].wins++; else tourTeamStats[tid].losses++;
    const fmt = t.format || 'Unknown';
    tourTeamStats[tid].formats[fmt] = (tourTeamStats[tid].formats[fmt] || 0) + 1;
});

const topScrimRosters = Object.values(scrimTeamStats)
    .map(t => ({ ...t, winRate: t.total > 0 ? (t.wins / t.total) * 100 : 0 }))
    .sort((a, b) => b.winRate - a.winRate).slice(0, 5);

const topTourRosters = Object.values(tourTeamStats)
    .map(t => ({ ...t, winRate: t.total > 0 ? (t.wins / t.total) * 100 : 0 }))
    .sort((a, b) => b.winRate - a.winRate).slice(0, 5);

const topByACS = [...allPlayers].sort((a, b) => Number(b.acs || 0) - Number(a.acs || 0)).slice(0, 5);
const topByKDA = [...allPlayers].sort((a, b) => Number(b.kda || 0) - Number(a.kda || 0)).slice(0, 5);

const globalMapWins = {};
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

// ── PDF ──────────────────────────────────────────────────────────────────────
const GOLD = '#D4AF37';
const PURPLE = '#2D0B5A';
const PARCHMENT = '#FDF5E6';
const TEXT_COLOR = '#1a1a1a';
const L_MARGIN = 60;
const CHART_WIDTH = 420;

const doc = new PDFDocument({ margin: 50, size: 'A4' });
const writeStream = fs.createWriteStream(OUT_PATH);
doc.pipe(writeStream);

const addPageBg = () => {
    doc.rect(0, 0, 595, 842).fill(PARCHMENT);
    doc.lineWidth(3).strokeColor(GOLD).rect(18, 18, 559, 806).stroke();
    doc.lineWidth(1).rect(23, 23, 549, 796).stroke();
};

const addSectionHeader = (title) => {
    if (doc.y > 720) { doc.addPage(); addPageBg(); doc.moveDown(2); }
    doc.fillColor(PURPLE).fontSize(14).font('Times-Bold').text(title, L_MARGIN);
    doc.lineWidth(1.5).strokeColor(GOLD).moveTo(L_MARGIN, doc.y + 2).lineTo(535, doc.y + 2).stroke();
    doc.moveDown(1.2);
};

const addBar = (label, value, maxVal, suffix = '') => {
    const y = doc.y;
    const bw = maxVal > 0 ? Math.max((value / maxVal) * CHART_WIDTH, 2) : 2;
    doc.fillColor('#e8e0c8').rect(L_MARGIN, y, CHART_WIDTH, 16).fill();
    doc.fillColor(GOLD).rect(L_MARGIN, y, bw, 16).fill();
    doc.fillColor(PURPLE).fontSize(9).font('Times-Bold').text(String(label).toUpperCase(), L_MARGIN + 4, y + 4);
    doc.fillColor(PURPLE).text(`${value}${suffix}`, L_MARGIN + CHART_WIDTH + 8, y + 4);
    doc.y = y + 20;
};

// ── PAGE 1 COVER ──
addPageBg();
doc.rect(18, 18, 559, 120).fill(PURPLE);
doc.fillColor(GOLD).fontSize(26).font('Times-Bold').text('ROYAL PERFORMANCE EDICT', 18, 38, { align: 'center', width: 559 });
doc.fontSize(11).font('Times-Roman').text('NXC ESPORTS — COMPREHENSIVE COMMAND INTELLIGENCE', 18, 72, { align: 'center', width: 559 });
doc.fontSize(9).text(`DECREED: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} | STATUS: SOVEREIGN & CONFIDENTIAL`, 18, 92, { align: 'center', width: 559 });
doc.y = 160;

// ── I. EXECUTIVE SUMMARY ──
const totalScrimWins = Object.values(scrimTeamStats).reduce((a, t) => a + t.wins, 0);
const totalScrimLosses = Object.values(scrimTeamStats).reduce((a, t) => a + t.losses, 0);
const totalScrimTotal = totalScrimWins + totalScrimLosses;
const totalTourWins = Object.values(tourTeamStats).reduce((a, t) => a + t.wins, 0);
const totalTourLosses = Object.values(tourTeamStats).reduce((a, t) => a + t.losses, 0);
const totalTourTotal = totalTourWins + totalTourLosses;

addSectionHeader('I. EXECUTIVE SUMMARY');
const summaryRows = [
    ['Total Teams', `${allTeams.length}`],
    ['Total Players', `${allPlayers.length}`],
    ['Total Scrims (All Time)', `${allScrims.length}`],
    ['Scrims This Week', `${recentScrims.length}`],
    ['Scrim Win Rate (Completed)', totalScrimTotal > 0 ? `${Math.round((totalScrimWins / totalScrimTotal) * 100)}%` : 'N/A'],
    ['Total Tournaments (All Time)', `${allTournaments.length}`],
    ['Tournaments This Week', `${recentTournaments.length}`],
    ['Tournament Win Rate (Completed)', totalTourTotal > 0 ? `${Math.round((totalTourWins / totalTourTotal) * 100)}%` : 'N/A'],
    ['Active Sponsors', `${allSponsors.length}`],
    ['Upcoming Events', `${upcomingEvents.length}`],
];

doc.fillColor(PURPLE).fontSize(10).font('Times-Bold').text('METRIC', L_MARGIN, doc.y, { continued: true, width: 300 });
doc.text('VALUE', { align: 'right', width: 220 });
summaryRows.forEach(([k, v], i) => {
    const rowY = doc.y;
    if (i % 2 === 0) doc.fillColor('#f0e8d0').rect(L_MARGIN, rowY - 2, 460, 16).fill();
    doc.fillColor(TEXT_COLOR).fontSize(10).font('Times-Roman').text(k, L_MARGIN + 4, rowY, { continued: true, width: 296 });
    doc.fillColor(PURPLE).font('Times-Bold').text(v, { align: 'right', width: 160 });
});
doc.moveDown(1.5);

// ── II. SCRIM ANALYTICS ──
addSectionHeader('II. SCRIM NETWORK ANALYTICS');
doc.fillColor(TEXT_COLOR).fontSize(10).font('Times-Bold').text('Weekly Campaign Results:', L_MARGIN);
doc.moveDown(0.5);
const weeklyWins = recentScrims.filter(s => { try { return JSON.parse(s.results || '[]').some(r => r.score === 'WIN'); } catch { return false; } }).length;
addBar('Victories', weeklyWins, Math.max(recentScrims.length, 1));
addBar('Defeats', recentScrims.length - weeklyWins, Math.max(recentScrims.length, 1));
doc.moveDown(0.8);

doc.fillColor(TEXT_COLOR).fontSize(10).font('Times-Bold').text('Top Squads by Scrim Win Rate:', L_MARGIN);
doc.moveDown(0.5);
if (topScrimRosters.length === 0) { doc.fillColor(TEXT_COLOR).fontSize(10).font('Times-Roman').text('No completed scrims on record.', L_MARGIN + 10); }
else topScrimRosters.forEach(r => addBar(`${r.name}  (${r.wins}W-${r.losses}L)`, Math.round(r.winRate), 100, '%'));
doc.moveDown(0.8);

if (Object.values(scrimTeamStats).length > 0) {
    doc.fillColor(TEXT_COLOR).fontSize(10).font('Times-Bold').text('Full Team Scrim Breakdown:', L_MARGIN);
    doc.moveDown(0.4);
    const colX = [L_MARGIN + 4, L_MARGIN + 250, L_MARGIN + 290, L_MARGIN + 330, L_MARGIN + 380];
    doc.fillColor(PURPLE).fontSize(9).font('Times-Bold');
    ['Team', 'W', 'L', 'Total', 'WR%'].forEach((h, i, arr) => doc.text(h, colX[i], doc.y, { continued: i < arr.length - 1 }));
    doc.lineWidth(0.5).strokeColor(GOLD).moveTo(L_MARGIN, doc.y + 2).lineTo(535, doc.y + 2).stroke();
    doc.moveDown(0.5);
    Object.values(scrimTeamStats).sort((a, b) => (b.wins / (b.total || 1)) - (a.wins / (a.total || 1))).forEach((t, idx) => {
        const wr = t.total > 0 ? Math.round((t.wins / t.total) * 100) : 0;
        if (idx % 2 === 0) doc.fillColor('#f0e8d0').rect(L_MARGIN, doc.y - 1, 460, 14).fill();
        doc.fillColor(TEXT_COLOR).fontSize(9).font('Times-Roman');
        doc.text(t.name, colX[0], doc.y, { continued: true, width: 240 });
        doc.text(`${t.wins}`, colX[1], doc.y, { continued: true, width: 30 });
        doc.text(`${t.losses}`, colX[2], doc.y, { continued: true, width: 30 });
        doc.text(`${t.total}`, colX[3], doc.y, { continued: true, width: 40 });
        doc.fillColor(wr >= 60 ? '#2d6a4f' : wr >= 40 ? '#7d5a00' : PURPLE).font('Times-Bold').text(`${wr}%`, colX[4], doc.y);
    });
}
doc.moveDown(1.5);

// ── III. MAP INTELLIGENCE ──
if (topMaps.length > 0) {
    addSectionHeader('III. THEATER MAP INTELLIGENCE');
    doc.fillColor(TEXT_COLOR).fontSize(10).font('Times-Bold').text('Global Map Win Rate (All Scrims):', L_MARGIN);
    doc.moveDown(0.5);
    topMaps.forEach(m => addBar(m.name, m.winRate, 100, '%'));
    doc.moveDown(1.5);
}

// ── IV. TOURNAMENT ANALYTICS ──
addSectionHeader('IV. TOURNAMENT NETWORK ANALYTICS');
doc.fillColor(TEXT_COLOR).fontSize(10).font('Times-Bold').text('Top Squads by Tournament Win Rate:', L_MARGIN);
doc.moveDown(0.5);
if (topTourRosters.length === 0) { doc.fillColor(TEXT_COLOR).fontSize(10).font('Times-Roman').text('No completed tournaments on record.', L_MARGIN + 10); }
else topTourRosters.forEach(r => addBar(`${r.name}  (${r.wins}W-${r.losses}L)`, Math.round(r.winRate), 100, '%'));
doc.moveDown(0.8);

if (Object.values(tourTeamStats).length > 0) {
    doc.fillColor(TEXT_COLOR).fontSize(10).font('Times-Bold').text('Full Team Tournament Breakdown:', L_MARGIN);
    doc.moveDown(0.4);
    const colX2 = [L_MARGIN + 4, L_MARGIN + 250, L_MARGIN + 290, L_MARGIN + 330, L_MARGIN + 380];
    doc.fillColor(PURPLE).fontSize(9).font('Times-Bold');
    ['Team', 'W', 'L', 'Total', 'WR%'].forEach((h, i, arr) => doc.text(h, colX2[i], doc.y, { continued: i < arr.length - 1 }));
    doc.lineWidth(0.5).strokeColor(GOLD).moveTo(L_MARGIN, doc.y + 2).lineTo(535, doc.y + 2).stroke();
    doc.moveDown(0.5);
    Object.values(tourTeamStats).sort((a, b) => (b.wins / (b.total || 1)) - (a.wins / (a.total || 1))).forEach((t, idx) => {
        const wr = t.total > 0 ? Math.round((t.wins / t.total) * 100) : 0;
        if (idx % 2 === 0) doc.fillColor('#f0e8d0').rect(L_MARGIN, doc.y - 1, 460, 14).fill();
        doc.fillColor(TEXT_COLOR).fontSize(9).font('Times-Roman');
        doc.text(t.name, colX2[0], doc.y, { continued: true, width: 240 });
        doc.text(`${t.wins}`, colX2[1], doc.y, { continued: true, width: 30 });
        doc.text(`${t.losses}`, colX2[2], doc.y, { continued: true, width: 30 });
        doc.text(`${t.total}`, colX2[3], doc.y, { continued: true, width: 40 });
        doc.fillColor(wr >= 60 ? '#2d6a4f' : wr >= 40 ? '#7d5a00' : PURPLE).font('Times-Bold').text(`${wr}%`, colX2[4], doc.y);
    });
}
doc.moveDown(1.5);

// ── V. PLAYER LEADERBOARD ──
addSectionHeader('V. CHAMPIONS OF THE REALM (Player Leaderboard)');
doc.fillColor(TEXT_COLOR).fontSize(10).font('Times-Bold').text('Top 5 by ACS:', L_MARGIN);
doc.moveDown(0.5);
const maxAcs = Math.max(...topByACS.map(p => Number(p.acs || 0)), 1);
topByACS.forEach(p => addBar(p.name, Number(p.acs || 0), maxAcs));
doc.moveDown(0.8);
doc.fillColor(TEXT_COLOR).fontSize(10).font('Times-Bold').text('Top 5 by KDA:', L_MARGIN);
doc.moveDown(0.4);
const maxKda = Math.max(...topByKDA.map(p => Number(p.kda || 0)), 1);
topByKDA.forEach(p => addBar(p.name, Number(p.kda || 0), maxKda));
doc.moveDown(1.5);

// ── VI. RECENT TRIUMPHS ──
if (recentAchievements.length > 0) {
    addSectionHeader('VI. RECENT TRIUMPHS');
    recentAchievements.slice(0, 5).forEach(a => {
        doc.fillColor(TEXT_COLOR).fontSize(10).font('Times-Bold').text(`• ${a.title}  [${a.placement || 'Finalist'}]`, L_MARGIN + 10);
        doc.fontSize(9).font('Times-Roman').fillColor('#444').text(a.description || '', L_MARGIN + 20, doc.y, { width: 460 });
        doc.moveDown(0.4);
    });
    doc.moveDown(1);
}

// ── VII. FUTURE DECREES ──
if (upcomingEvents.length > 0) {
    addSectionHeader('VII. FUTURE DECREES (Upcoming Events)');
    upcomingEvents.forEach(e => {
        const d = new Date(e.date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });
        doc.fillColor(TEXT_COLOR).fontSize(10).font('Times-Bold').text(`• ${e.title}`, L_MARGIN + 10, doc.y, { continued: true });
        doc.fillColor(PURPLE).font('Times-Roman').text(`  ${d}`, { align: 'right', width: 300 });
        doc.moveDown(0.3);
    });
    doc.moveDown(1);
}

// ── VIII. PATRONS ──
if (allSponsors.length > 0) {
    addSectionHeader('VIII. IMPERIAL PATRONS (Sponsors & Partners)');
    ['Platinum', 'Gold', 'Silver', 'Bronze'].forEach(tier => {
        const inTier = allSponsors.filter(s => s.tier === tier);
        if (!inTier.length) return;
        doc.fillColor(PURPLE).fontSize(10).font('Times-Bold').text(`${tier.toUpperCase()} TIER`, L_MARGIN + 4);
        doc.fillColor(TEXT_COLOR).fontSize(9).font('Times-Roman').text(inTier.map(s => s.name).join('  •  '), L_MARGIN + 16, doc.y, { width: 460 });
        doc.moveDown(0.5);
    });
}

// Footer
doc.fillColor(PURPLE).fontSize(8).font('Times-Italic')
    .text('By Royal Decree of the NXC Executive Council. All metrics verified and sovereign. This document is confidential.', 18, 808, { align: 'center', width: 559 });

doc.end();
await finished(writeStream);

console.log(`\n✅ PDF generated: ${OUT_PATH}\n`);
