
export const GAME_TITLES = [
    "Apex Legends",
    "Call of Duty: Modern Warfare III",
    "Call of Duty: Warzone",
    "Counter-Strike 2",
    "CrossFire",
    "Dota 2",
    "EA Sports FC 24",
    "Fortnite",
    "Free Fire",
    "Honor of Kings",
    "League of Legends",
    "Mobile Legends: Bang Bang",
    "Overwatch 2",
    "PUBG Mobile",
    "PUBG: Battlegrounds",
    "Rainbow Six Siege",
    "Rennsport",
    "Rocket League",
    "StarCraft II",
    "Street Fighter 6",
    "Teamfight Tactics",
    "Tekken 8",
    "Valorant",
    "Valorant Mobile"
];

export const VALORANT_MAPS = ["Ascent", "Bind", "Breeze", "Fracture", "Haven", "Icebox", "Lotus", "Pearl", "Split", "Sunset", "Abyss", "Corrode"];
export const VALORANT_AGENTS = ['Astra', 'Brimstone', 'Clove', 'Harbor', 'Omen', 'Viper', 'Jett', 'Neon', 'Phoenix', 'Raze', 'Reyna', 'Yoru', 'Iso', 'Waylay', 'Veto', 'Breach', 'Fade', 'Gekko', 'KAY_O', 'Skye', 'Sova', 'Tejo', 'Chamber', 'Cypher', 'Deadlock', 'Killjoy', 'Sage', 'Vyse'];
export const VALORANT_ROLES = ["Controller", "Duelist", "Initiator", "Sentinel"];

export const GAME_MAPS: Record<string, string[]> = {
    "Valorant": VALORANT_MAPS,
    "Valorant Mobile": VALORANT_MAPS,
    "Counter-Strike 2": ["Ancient", "Anubis", "Dust2", "Inferno", "Mirage", "Nuke", "Overpass", "Vertigo", "Thera", "Mills", "Cache", "Train"],
    "CS2": ["Ancient", "Anubis", "Dust2", "Inferno", "Mirage", "Nuke", "Overpass", "Vertigo", "Thera", "Mills", "Cache", "Train"],
    "CS:GO": ["Ancient", "Anubis", "Dust2", "Inferno", "Mirage", "Nuke", "Overpass", "Vertigo", "Thera", "Mills", "Cache", "Train"],
    "Apex Legends": ["Kings Canyon", "World's Edge", "Olympus", "Storm Point", "Broken Moon"],
    "Mobile Legends: Bang Bang": ["Land of Dawn"],
    "Honor of Kings": ["Gorge of Kings"],
    "PUBG Mobile": ["Erangel", "Miramar", "Sanhok", "Vikendi", "Livik", "Karakin"],
    "PUBG: Battlegrounds": ["Erangel", "Miramar", "Taego", "Deston", "Vikendi"],
    "Rainbow Six Siege": ["Bank", "Border", "Chalet", "Club House", "Kafe Dostoyevsky", "Oregon", "Skyscraper", "Villa"],
    "Overwatch 2": ["Circuit Royal", "Colosseo", "Esperanza", "Gibraltar", "Hollywood", "Ilios", "Lijiang Tower", "Midtown", "New Junk City", "Oasis", "Paraíso", "Route 66"],
    "Dota 2": ["The Map"],
    "League of Legends": ["Summoner's Rift"],
    "Free Fire": ["Bermuda", "Purgatory", "Kalahari", "Alpine"],
    "Rocket League": ["DFH Stadium", "Mannfield", "Champions Field", "Urban Central"],
    "Call of Duty: Modern Warfare III": ["6 Star", "Departure", "Invasion", "Karachi", "Rio", "Skidrow", "Sub Base", "Vista"],
    "Call of Duty: Warzone": ["Urzikstan", "Rebirth Island", "Fortune's Keep", "Vondel"],
    "Rennsport": ["Hockenheimring", "Nürburgring", "Spa-Francorchamps", "Monza"],
    "EA Sports FC 24": ["Stadium Alpha", "Stadium Beta"], // General stadiums
    "Fortnite": ["Current Island"],
    "StarCraft II": ["Alcyone", "Goldenaura", "Oceanborn", "Post-Youth", "Site Delta"],
    "Street Fighter 6": ["Training Room", "Metro City Downtown", "Genbu Temple"],
    "Teamfight Tactics": ["Convergence"],
    "Tekken 8": ["Urban Square", "Yakushima", "Coliseum"]
};

export const GAME_ROLES: Record<string, string[]> = {
    "VALORANT": ["Controller", "Duelist", "Initiator", "Sentinel"],
    "MOBA": ["Jungler", "Roamer", "Mid Lane", "Gold Lane", "EXP Lane", "Support", "ADC", "Tank", "Carry"],
    "FPS": ["Entry", "Support", "Sniper", "IGL", "Lurker", "Rifler"],
    "BR": ["Fragger", "Support", "Lead", "Scout", "Anchor"],
    "FIGHTING": ["Main", "Sub"],
    "SPORTS": ["Forward", "Midfield", "Defense", "Keeper"]
};

export const GAME_CATEGORY: Record<string, string> = {
    "Apex Legends": "BR",
    "Call of Duty: Modern Warfare III": "FPS",
    "Call of Duty: Warzone": "BR",
    "Counter-Strike 2": "FPS",
    "CrossFire": "FPS",
    "Dota 2": "MOBA",
    "EA Sports FC 24": "SPORTS",
    "Fortnite": "BR",
    "Free Fire": "BR",
    "Honor of Kings": "MOBA",
    "League of Legends": "MOBA",
    "Mobile Legends: Bang Bang": "MOBA",
    "Overwatch 2": "FPS",
    "PUBG Mobile": "BR",
    "PUBG: Battlegrounds": "BR",
    "Rainbow Six Siege": "FPS",
    "Rennsport": "SPORTS",
    "Rocket League": "SPORTS",
    "StarCraft II": "MOBA", // RTS but roles might match MOBA or custom
    "Street Fighter 6": "FIGHTING",
    "Teamfight Tactics": "MOBA", // Auto-battler
    "Tekken 8": "FIGHTING",
    "Valorant": "VALORANT",
    "Valorant Mobile": "VALORANT",
    "CS2": "FPS",
    "CS:GO": "FPS"
};

