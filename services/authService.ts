import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./firebaseConfig";
import { useState, useEffect } from "react";

const googleProvider = new GoogleAuthProvider();

export const signup = async (fullname: string, username: string, email: string, password: string) => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullname, username, email, password }),
        });

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Signup failed');
        }

        const data = result.data;
        const user = {
            uid: `local_${data.id}`,
            email: data.email,
            displayName: data.fullname,
            username: data.username,
            photoURL: data.avatar,
            role: data.role,
            id: data.id
        };

        localStorage.setItem('dev_user', JSON.stringify(user));
        updateGlobalUser(user);
        dispatchAuthChange();
        return user;
    } catch (error) {
        console.error("Signup error:", error);
        throw error;
    }
};

export const login = async (username: string, password: string) => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Login failed');
        }

        const data = result.data;
        const user = {
            uid: `local_${data.id}`,
            email: data.email,
            displayName: data.fullname,
            username: data.username,
            photoURL: data.avatar,
            role: data.role,
            id: data.id
        };

        localStorage.setItem('dev_user', JSON.stringify(user));
        updateGlobalUser(user);
        dispatchAuthChange();
        return user;
    } catch (error) {
        console.error("Login error:", error);
        throw error;
    }
};

export const signInWithGoogle = async () => {
    if (!auth) {
        throw new Error("Google Login is disabled (Missing Firebase Config). Please use Dev Login.");
    }
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // Sync user to backend
        await syncUserToBackend(user);

        return user;
    } catch (error) {
        console.error("Error signing in with Google", error);
        throw error;
    }
};

const dispatchAuthChange = () => {
    console.log("[authService] Dispatching nxc-auth-changed event");
    window.dispatchEvent(new CustomEvent('nxc-auth-changed', { detail: { timestamp: Date.now() } }));
    window.dispatchEvent(new Event('storage')); // For other tabs
};

export const logout = async () => {
    try {
        localStorage.removeItem('dev_user');
        if (auth) {
            try {
                await signOut(auth);
            } catch (firebaseError) {
                console.error("Firebase signOut failed, continuing with local logout:", firebaseError);
            }
        }
    } catch (error) {
        console.error("Local logout error:", error);
    } finally {
        updateGlobalUser(null);
        dispatchAuthChange();
    }
};

export const changePassword = async (userId: number, oldPass: string, newPass: string) => {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, oldPassword: oldPass, newPassword: newPass })
    });
    const result = await res.json();
    if (!result.success) {
        throw new Error(result.error || 'Failed to change password');
    }
    return result.data;
};

export const deleteAccount = async (userId: number) => {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users/${userId}`, {
        method: 'DELETE'
    });
    const result = await res.json();
    if (!result.success) {
        throw new Error(result.error || 'Failed to delete account');
    }
    // Auto logout after delete
    await logout();
    return true;
};

// Sync user data to our local/neon DB via Express backend
// Updated for compatibility with new schema
const syncUserToBackend = async (user: User, additionalData?: { birthday?: string, role?: string }) => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                googleId: user.uid,
                email: user.email,
                name: user.displayName,
                avatar: user.photoURL,
                birthday: additionalData?.birthday,
                role: additionalData?.role
            }),
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.details || result.error || 'Failed to sync user to backend');
        }

        return result.data;
    } catch (error: any) {
        console.error("Backend sync failed:", error);
        throw error; // Rethrow to show in UI
    }
};

// Mock Login for Dev Admin
export const loginAsAdminDev = async () => {
    const mockUser = {
        uid: 'super_admin_seed',
        email: 'admin@novanexus.io',
        displayName: 'Super Commander',
        photoURL: 'https://ui-avatars.com/api/?name=Super+Commander&background=fbbf24&color=000',
        emailVerified: true,
        isAnonymous: false,
        metadata: {},
        providerData: [],
        refreshToken: '',
        tenantId: null,
        delete: async () => { },
        getIdToken: async () => 'mock_token',
        getIdTokenResult: async () => ({
            token: 'mock',
            signInProvider: 'custom',
            claims: {},
            authTime: '',
            issuedAtTime: '',
            expirationTime: '',
            signInSecondFactor: null,
            multiFactor: { enrolledFactors: [], user: null }
        } as any),
        reload: async () => { },
        toJSON: () => ({})
    } as unknown as User;

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Sync with backend
    const syncResult = await syncUserToBackend(mockUser, { role: 'admin' });
    const backendUser = syncResult?.user;

    const finalUser = {
        ...mockUser,
        displayName: backendUser?.name || mockUser.displayName,
        photoURL: backendUser?.avatar || mockUser.photoURL,
        role: backendUser?.role || 'admin'
    } as any;

    // Dispatch change event
    localStorage.setItem('dev_user', JSON.stringify(finalUser));
    updateGlobalUser(finalUser);
    dispatchAuthChange();

    return mockUser;
};

// Mock Login for Dev Member
export const loginAsMemberDev = async () => {
    const mockUser = {
        uid: 'member_seed',
        email: 'member@novanexus.io',
        displayName: 'Elite Operative',
        photoURL: 'https://ui-avatars.com/api/?name=Elite+Operative&background=10b981&color=fff',
        emailVerified: true,
        isAnonymous: false,
        metadata: {},
        providerData: [],
        refreshToken: '',
        tenantId: null,
        delete: async () => { },
        getIdToken: async () => 'mock_token_member',
        getIdTokenResult: async () => ({
            token: 'mock_member',
            signInProvider: 'custom',
            claims: {},
            authTime: '',
            issuedAtTime: '',
            expirationTime: '',
            signInSecondFactor: null,
            multiFactor: { enrolledFactors: [], user: null }
        } as any),
        reload: async () => { },
        toJSON: () => ({})
    } as unknown as User;

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Sync with backend
    const syncResult = await syncUserToBackend(mockUser, { role: 'member' });
    const backendUser = syncResult?.user;

    const finalUser = {
        ...mockUser,
        displayName: backendUser?.name || mockUser.displayName,
        photoURL: backendUser?.avatar || mockUser.photoURL,
        role: backendUser?.role || 'member'
    } as any;

    // Dispatch change event
    localStorage.setItem('dev_user', JSON.stringify(finalUser));
    updateGlobalUser(finalUser);
    dispatchAuthChange();

    return mockUser;
};// Mock Login for Dev Manager
export const loginAsManagerDev = async () => {
    const mockUser = {
        uid: 'manager_seed',
        email: 'manager@novanexus.io',
        displayName: 'Strategic Director',
        photoURL: 'https://ui-avatars.com/api/?name=Strategic+Director&background=8b5cf6&color=fff',
        emailVerified: true,
        isAnonymous: false,
        metadata: {},
        providerData: [],
        refreshToken: '',
        tenantId: null,
        delete: async () => { },
        getIdToken: async () => 'mock_token_manager',
        getIdTokenResult: async () => ({
            token: 'mock_manager',
            signInProvider: 'custom',
            claims: {},
            authTime: '',
            issuedAtTime: '',
            expirationTime: '',
            signInSecondFactor: null,
            multiFactor: { enrolledFactors: [], user: null }
        } as any),
        reload: async () => { },
        toJSON: () => ({})
    } as unknown as User;

    await new Promise(resolve => setTimeout(resolve, 800));

    const syncResult = await syncUserToBackend(mockUser, { role: 'manager' });
    const backendUser = syncResult?.user;

    const finalUser = {
        ...mockUser,
        displayName: backendUser?.name || mockUser.displayName,
        photoURL: backendUser?.avatar || mockUser.photoURL,
        role: backendUser?.role || 'manager'
    } as any;

    localStorage.setItem('dev_user', JSON.stringify(finalUser));
    updateGlobalUser(finalUser);
    dispatchAuthChange();

    return mockUser;
};
// Global state for useUser to ensure all instances are in sync
let globalUser: any = (() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('dev_user') : null;
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            return (parsed && parsed.email) ? parsed : null;
        } catch { return null; }
    }
    return null;
})();

const userListeners = new Set<(user: any) => void>();

const updateGlobalUser = (user: any) => {
    globalUser = user;
    userListeners.forEach(listener => listener(user));
};

export const useUser = () => {
    const [user, setUser] = useState<any>(globalUser);
    const [loading, setLoading] = useState(() => !user && !!auth);

    useEffect(() => {
        const listener = (newUser: any) => {
            setUser(newUser);
            setLoading(false);
        };
        userListeners.add(listener);

        const syncFromStorage = () => {
            const raw = localStorage.getItem('dev_user');
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    const userData = (parsed && parsed.email) ? parsed : null;
                    if (JSON.stringify(userData) !== JSON.stringify(globalUser)) {
                        updateGlobalUser(userData);
                    }
                } catch { updateGlobalUser(null); }
            } else if (!auth?.currentUser) {
                updateGlobalUser(null);
            }
            setLoading(false);
        };

        // Add event listeners for cross-instance and tab sync
        window.addEventListener('storage', syncFromStorage);
        window.addEventListener('nxc-auth-changed', syncFromStorage);

        // Sync initially in case something changed between render and effect
        syncFromStorage();

        let unsubscribeFirebase = () => { };
        if (auth) {
            unsubscribeFirebase = onAuthStateChanged(auth, (currentUser) => {
                const hasDev = !!localStorage.getItem('dev_user');
                if (!hasDev) {
                    updateGlobalUser(currentUser);
                    setLoading(false);
                }
            });
        } else {
            setLoading(false);
        }

        return () => {
            userListeners.delete(listener);
            window.removeEventListener('storage', syncFromStorage);
            window.removeEventListener('nxc-auth-changed', syncFromStorage);
            unsubscribeFirebase();
        };
    }, []);

    return { user, loading };
};
