import { useState, useEffect, useRef } from 'react'; // Added useRef
import { useNavigate, useParams } from 'react-router-dom';
import { FiMessageSquare, FiSearch } from "react-icons/fi";
import PrivateMessage from './PrivateMessage';

const API_URL = import.meta.env.VITE_API_BASE_URL;
const WS_URL = API_URL.replace('http', 'ws');

export default function Messages() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [chatList, setChatList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    // Use a ref for the WebSocket so it persists across renders
    const listSocket = useRef(null);

    // Core function to fetch the chat list
    const fetchChatList = async () => {
        const token = localStorage.getItem('access');
        if (!token) return;

        try {
            const res = await fetch(`${API_URL}/api/chat/recent-chats/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setChatList(data);
            }
        } catch (err) {
            console.error("Failed to fetch chat list", err);
        } finally {
            setLoading(false);
        }
    };

    // Initial Fetch
    useEffect(() => {
        fetchChatList();
    }, [userId]);

    // REAL-TIME UPDATE LOGIC
    useEffect(() => {
        const token = localStorage.getItem('access');
        if (!token) return;

        // Connect to the global notification group
        const wsUrl = `${WS_URL}/ws/notifications/?token=${token}`;
        listSocket.current = new WebSocket(wsUrl);

        listSocket.current.onmessage = (e) => {
            const data = JSON.parse(e.data);

            // Trigger a refresh whenever a new notification arrives
            if (data.unread_count !== undefined) {
                fetchChatList();
            }
        };

        return () => {
            if (listSocket.current) {
                listSocket.current.close();
            }
        };
    }, []);

    // Filter list based on Username, First Name, OR Last Name
    const filteredChats = chatList.filter(chat => {
        const searchLower = searchTerm.toLowerCase();

        const matchesUsername = chat.username.toLowerCase().includes(searchLower);
        const matchesFirstName = chat.first_name?.toLowerCase().includes(searchLower);
        const matchesLastName = chat.last_name?.toLowerCase().includes(searchLower);

        return matchesUsername || matchesFirstName || matchesLastName;
    });

    return (
        <div className="flex h-[calc(100vh-64px)] bg-gray-100 overflow-hidden">
            {/* LEFT SIDEBAR */}
            <div className="w-80 bg-white border-r flex flex-col flex-shrink-0 shadow-sm">
                <div className="p-4 border-b space-y-3">
                    <h2 className="text-xl font-bold text-gray-800">Messages</h2>
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search chats..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-10 text-center text-gray-400 text-sm">Loading...</div>
                    ) : filteredChats.length > 0 ? (
                        filteredChats.map((chat) => (
                            <div
                                key={chat.id}
                                onClick={() => navigate(`/messages/${chat.id}`)}
                                className={`p-4 flex items-center gap-3 cursor-pointer border-b transition-all ${parseInt(userId) === chat.id
                                    ? 'bg-blue-50 border-l-4 border-l-blue-600'
                                    : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                                    }`}
                            >
                                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm relative">
                                    {chat.username.charAt(0).toUpperCase()}

                                    {chat.unread_count > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                                            {chat.unread_count}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline">
                                        <h4 className="font-semibold text-gray-800 truncate">
                                            {chat.first_name ? `${chat.first_name} ${chat.last_name || ''}` : chat.username}
                                        </h4>
                                    </div>
                                    <p className={`text-xs truncate ${chat.unread_count > 0 ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>
                                        {chat.last_message}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="p-10 text-center text-gray-400 text-sm">No conversations found.</p>
                    )}
                </div>
            </div>

            {/* RIGHT SIDE: CHAT AREA */}
            <div className="flex-1 relative bg-gray-50">
                {userId ? (
                    <PrivateMessage key={userId} />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <div className="p-6 bg-white rounded-full shadow-sm mb-4">
                            <FiMessageSquare size={48} className="text-blue-200" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-600">Your Messages</h3>
                        <p className="text-sm">Select a contact to start a conversation</p>
                    </div>
                )}
            </div>
        </div>
    );
}