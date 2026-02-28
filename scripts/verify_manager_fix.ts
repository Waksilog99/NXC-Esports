
import axios from 'axios';
import 'dotenv/config';

const API_BASE = process.env.VITE_API_BASE_URL || 'http://localhost:3001';

async function verifyFix() {
    console.log('--- VERIFYING TEAM CREATION FIX ---');
    try {
        // 1. Find a manager user
        console.log('[1/3] Fetching users to find a manager...');
        const usersRes = await axios.get(`${API_BASE}/api/users`);
        const manager = usersRes.data.find((u: any) => u.role?.includes('manager'));

        if (!manager) {
            console.error('❌ No manager user found to test with.');
            return;
        }
        console.log(`Found manager: ${manager.username} (ID: ${manager.id})`);

        // 2. Attempt to create a team as that manager
        console.log('[2/3] Attempting team creation as manager...');
        const teamName = `TEST SQUAD ${Date.now()}`;
        const createRes = await axios.post(`${API_BASE}/api/teams`, {
            name: teamName,
            game: 'Valorant',
            description: 'Verification test squad',
            managerId: manager.id,
            requesterId: manager.id
        });

        if (createRes.data.success) {
            console.log(`✅ SUCCESS: Team "${teamName}" created by manager.`);

            // 3. Verify it shows up in teams list
            console.log('[3/3] Verifying team exists in database...');
            const teamsRes = await axios.get(`${API_BASE}/api/teams`);
            const teamExists = teamsRes.data.data.some((t: any) => t.name === teamName);

            if (teamExists) {
                console.log('✅ SUCCESS: Team found in database.');
                console.log('\n--- VERIFICATION COMPLETE: ALL SYSTEMS NOMINAL ---');
            } else {
                console.error('❌ FAILURE: Team created but not found in list.');
            }
        } else {
            console.error('❌ FAILURE: API returned success: false', createRes.data);
        }
    } catch (error: any) {
        console.error('❌ ERROR during verification:', error.response?.data || error.message);
        if (error.response?.status === 403) {
            console.error('Still getting Access Denied (403). The fix may not be applied or server not restarted.');
        }
    }
}

verifyFix();
