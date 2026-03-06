import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { FiBell, FiMessageSquare, FiSearch, FiBook, FiUserPlus } from "react-icons/fi";

const API_URL = import.meta.env.VITE_API_BASE_URL;
const WS_URL = API_URL.replace('http', 'ws');

export default function Navbar() {
    const navigate = useNavigate();
    const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('access'));
    const [userData, setUserData] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);

    // NOTIFICATION STATES
    const [chatUnreadCount, setChatUnreadCount] = useState(0);
    const [notifUnreadCount, setNotifUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);

    // SEARCH STATES
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);

    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const notificationWs = useRef(null);
    const searchRef = useRef(null);
    const notifRef = useRef(null);

    // Load User Profile AND Initial Counts
    useEffect(() => {
        const loadInitialData = async () => {
            const token = localStorage.getItem('access');
            if (token) {
                try {
                    // Fetch Profile
                    const profileRes = await fetch(`${API_URL}/api/accounts/me/`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (profileRes.ok) {
                        const data = await profileRes.json();
                        setUserData(data);
                    }

                    // Fetch initial unread counts from your backend
                    const countRes = await fetch(`${API_URL}/api/chat/unread-counts/`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (countRes.ok) {
                        const counts = await countRes.json();
                        setChatUnreadCount(counts.unread_chat_count || 0);
                        setNotifUnreadCount(counts.unread_notif_count || 0);
                    }
                } catch (err) { console.error('Initial data load error', err); }
            }
        };
        if (isLoggedIn) loadInitialData();
    }, [isLoggedIn, refreshTrigger]);

    useEffect(() => {
        const handleProfileUpdate = () => {
            setRefreshTrigger(prev => prev + 1);
        };

        window.addEventListener('profileUpdated', handleProfileUpdate);

        return () => {
            window.removeEventListener('profileUpdated', handleProfileUpdate);
        };
    }, []);

    // Fetch Notifications List
    const fetchNotifications = async () => {
        const token = localStorage.getItem('access');
        try {
            const res = await fetch(`${API_URL}/api/chat/notifications/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
        } catch (err) { console.error("Notification fetch error", err); }
    };

    // Real-time WebSocket Logic
    useEffect(() => {
        const token = localStorage.getItem('access');
        if (!isLoggedIn || !token) return;

        if (notificationWs.current &&
            (notificationWs.current.readyState === WebSocket.CONNECTING ||
                notificationWs.current.readyState === WebSocket.OPEN)) {
            return;
        }

        const wsUrl = `${WS_URL}/ws/notifications/?token=${token}`;
        const ws = new WebSocket(wsUrl);
        notificationWs.current = ws;

        ws.onmessage = (e) => {
            const data = JSON.parse(e.data);
            console.log("WebSocket Received:", data);

            if (data.unread_notif_count !== undefined) {
                setNotifUnreadCount(data.unread_notif_count);
                if (showNotifDropdown) fetchNotifications();
            }
            if (data.unread_chat_count !== undefined) {
                setChatUnreadCount(data.unread_chat_count);
            }
        };

        ws.onclose = (event) => {
            // Only warn if the closure wasn't a manual cleanup
            if (!event.wasClean) {
                console.warn("Notification WebSocket closed unexpectedly.");
                setTimeout(() => setRefreshTrigger(prev => prev + 1), 3000);
            }
        };

        return () => {
            // Only close if the socket actually exists
            if (ws) {
                ws.onclose = null; // Prevent the warning during intentional close
                ws.close();
            }
        };
    }, [isLoggedIn, refreshTrigger]);

    // Click Outside Listeners
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) setShowSearchDropdown(false);
            if (notifRef.current && !notifRef.current.contains(event.target)) setShowNotifDropdown(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearch = async (e) => {
        const val = e.target.value;
        setSearchQuery(val);
        if (val.length > 2) {
            const token = localStorage.getItem('access');
            try {
                const res = await fetch(`${API_URL}/api/accounts/search/?q=${val}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setSearchResults(data);
                    setShowSearchDropdown(true);
                }
            } catch (err) { console.error("Search error", err); }
        } else { setShowSearchDropdown(false); }
    };

    const handleLogout = () => {
        localStorage.clear();
        setIsLoggedIn(false);
        navigate('/login');
    };

    const markNotificationsAsRead = async () => {
        if (notifUnreadCount === 0) return;
        const token = localStorage.getItem('access');
        try {
            await fetch(`${API_URL}/api/chat/notifications/mark-read/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotifUnreadCount(0);
        } catch (err) { console.error("Mark read error", err); }
    };

    return (
        <nav className="bg-blue-800 text-white shadow-md w-full z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">

                    {/* LEFT SIDE: Brand & Search */}
                    <div className="flex items-center gap-6 flex-1">
                        <Link to="/" className="text-xl font-bold tracking-wider">eLearnPlatform</Link>

                        {isLoggedIn && userData?.is_teacher && (
                            <div className="relative hidden md:block" ref={searchRef}>
                                <div className="relative">
                                    <FiSearch className="absolute left-3 top-2.5 text-blue-300" />
                                    <input
                                        type="text" placeholder="Search students or teachers..."
                                        className="bg-blue-700 text-white placeholder-blue-300 rounded-full px-10 py-1.5 text-sm w-64 focus:w-80 transition-all outline-none focus:ring-2 focus:ring-white"
                                        value={searchQuery} onChange={handleSearch}
                                    />
                                </div>
                                {showSearchDropdown && searchResults.length > 0 && (
                                    <div className="absolute top-11 left-0 w-full min-w-[320px] bg-white shadow-2xl rounded-xl border py-2 z-50 text-gray-800">
                                        {searchResults.map(user => (
                                            <div key={user.id} className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b last:border-0" onClick={() => { navigate(`/profile/${user.id}`); setShowSearchDropdown(false); setSearchQuery(""); }}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">{user.username[0].toUpperCase()}</div>
                                                    <div>
                                                        <p className="text-sm font-bold">{user.full_name}</p>
                                                        <p className="text-[10px] text-blue-600 font-bold uppercase">{user.is_teacher ? 'Teacher' : 'Student'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* RIGHT SIDE: Icons & Profile */}
                    <div className="flex space-x-4 items-center">
                        {isLoggedIn ? (
                            <>
                                <button onClick={() => navigate('/messages')} className="p-2 rounded-full hover:bg-blue-700 relative">
                                    <FiMessageSquare size={20} />
                                    {chatUnreadCount > 0 && <span className="absolute top-1 right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-blue-800 animate-pulse"></span>}
                                </button>

                                {/* NOTIFICATION DROPDOWN */}
                                <div className="relative" ref={notifRef}>
                                    <button
                                        onClick={() => {
                                            const nextState = !showNotifDropdown;
                                            setShowNotifDropdown(nextState);
                                            if (nextState) {
                                                fetchNotifications();
                                                markNotificationsAsRead();
                                            }
                                        }}
                                        className="p-2 rounded-full hover:bg-blue-700 relative"
                                    >
                                        <FiBell size={20} />
                                        {notifUnreadCount > 0 && <span className="absolute top-1 right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-blue-800"></span>}
                                    </button>

                                    {showNotifDropdown && (
                                        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl z-50 py-2 border text-gray-800">
                                            <div className="px-4 py-2 border-b flex justify-between items-center">
                                                <h3 className="font-bold text-sm">Notifications</h3>
                                            </div>
                                            <div className="max-h-80 overflow-y-auto">
                                                {notifications.length > 0 ? notifications.map(n => (
                                                    <div key={n.id} className={`px-4 py-3 border-b hover:bg-gray-50 flex gap-3 ${!n.is_read ? 'bg-blue-50' : ''}`}>
                                                        <div className="mt-1 text-blue-600">
                                                            {n.notification_type === 'enrollment' ? <FiUserPlus size={18} /> : <FiBook size={18} />}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-xs text-gray-700 leading-snug">{n.message}</p>
                                                            <p className="text-[10px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <p className="p-8 text-center text-gray-400 text-xs">No notifications yet.</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* PROFILE */}
                                <div className="relative">
                                    <button onClick={() => setShowDropdown(!showDropdown)} className="flex items-center">
                                        {userData?.photo ? (
                                            <img src={userData.photo.startsWith('http') ? userData.photo : `${API_URL}${userData.photo}`} className="w-8 h-8 rounded-full object-cover border border-blue-300" alt="Profile" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center border border-blue-300 text-xs font-bold">{userData?.username[0].toUpperCase()}</div>
                                        )}
                                    </button>
                                    {showDropdown && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 text-gray-800 border">
                                            <div className="px-4 py-2 border-b text-sm font-medium">
                                                {userData?.first_name
                                                    ? `${userData.first_name} ${userData.last_name || ''}`
                                                    : userData?.username}
                                            </div>
                                            <button onClick={() => { setShowDropdown(false); navigate('/profile'); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">Profile</button>
                                            <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Log Out</button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-4">
                                <Link to="/login" className="hover:text-blue-200 text-sm font-medium">Log In</Link>
                                <Link to="/register" className="bg-white text-blue-800 px-4 py-1.5 rounded-md text-sm font-bold shadow-sm">Sign Up</Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}