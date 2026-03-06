import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_BASE_URL;
const WS_URL = API_URL.replace('http', 'ws');

export default function PrivateMessage() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [targetUser, setTargetUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const ws = useRef(null);
    const messagesEndRef = useRef(null);

    // --- Mark Messages as Read Logic ---
    const markAsRead = async () => {
        const token = localStorage.getItem('access');
        try {
            const response = await fetch(`${API_URL}/api/chat/mark-read/${userId}/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                console.log("Conversation marked as read");
            }
        } catch (err) {
            console.error("Failed to mark messages as read", err);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('access');
        let isMounted = true;

        const initChat = async () => {
            try {
                const [meRes, targetRes] = await Promise.all([
                    fetch(`${API_URL}/api/accounts/me/`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`${API_URL}/api/accounts/user/${userId}/`, { headers: { 'Authorization': `Bearer ${token}` } })
                ]);

                if (meRes.ok && targetRes.ok && isMounted) {
                    const me = await meRes.json();
                    const target = await targetRes.json();
                    setUserData(me);
                    setTargetUser(target);

                    // Fetch History
                    const histRes = await fetch(`${API_URL}/api/chat/messages/${userId}/`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (histRes.ok) {
                        const history = await histRes.json();
                        setMessages(history);
                    }

                    // Trigger Mark as Read on Load
                    markAsRead();

                    // Connect WebSocket
                    if (ws.current) ws.current.close();
                    const roomName = [me.id, target.id].sort((a, b) => a - b).join('_');
                    ws.current = new WebSocket(`${WS_URL}/ws/pc/chat/${roomName}/?token=${token}`);

                    ws.current.onmessage = (e) => {
                        const data = JSON.parse(e.data);
                        setMessages(prev => [...prev, {
                            message: data.message,
                            sender_id: data.sender_id,
                            username: data.username,
                            timestamp: data.timestamp || new Date().toISOString() // Fallback for real-time msgs
                        }]);

                        // If we are actively looking at the chat, mark incoming as read
                        markAsRead();
                    };
                }
            } catch (err) { console.error(err); }
        };

        initChat();

        return () => {
            isMounted = false;
            if (ws.current) ws.current.close();
        };
    }, [userId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (inputMessage.trim() && ws.current) {
            ws.current.send(JSON.stringify({
                message: inputMessage,
                sender_id: userData.id,
                receiver_id: parseInt(userId),
                username: userData.username
            }));
            setInputMessage('');
        }
    };

    if (!targetUser || !userData) return <div className="p-10 text-center text-gray-500">Loading Chat...</div>;

    const formatDateLabel = (dateString) => {
        const date = new Date(dateString || new Date()); // Safety fallback
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

        return date.toLocaleDateString([], {
            month: 'long',
            day: 'numeric',
            year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-100 p-4">
            <div className="max-w-2xl mx-auto w-full flex flex-col h-full bg-white rounded-xl shadow-lg border overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b bg-blue-800 text-white flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="hover:bg-blue-700 p-1 rounded">←</button>
                    <div className="w-10 h-10 rounded-full bg-blue-600 border border-blue-400 flex items-center justify-center font-bold">
                        {targetUser.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-bold">
                            {targetUser.first_name ? `${targetUser.first_name} ${targetUser.last_name || ''}` : targetUser.username}
                        </h3>
                        <p className="text-xs text-blue-200">Private Message</p>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    {messages.map((msg, idx) => {
                        const isMe = msg.sender_id === userData.id || msg.username === userData.username;

                        // --- Safer Date Parsing ---
                        const msgTimestamp = msg.timestamp || new Date().toISOString();
                        const currentDate = new Date(msgTimestamp).toDateString();
                        const previousDate = idx > 0 ? new Date(messages[idx - 1].timestamp || new Date()).toDateString() : null;
                        const showDateDivider = currentDate !== previousDate;

                        const time = new Date(msgTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        return (
                            <div key={idx} className="flex flex-col">
                                {showDateDivider && (
                                    <div className="flex justify-center my-6">
                                        <span className="px-4 py-1 bg-gray-200 text-gray-500 text-[11px] font-bold rounded-full uppercase tracking-wider shadow-sm">
                                            {formatDateLabel(msgTimestamp)}
                                        </span>
                                    </div>
                                )}

                                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[75%] px-4 py-2 rounded-2xl shadow-sm text-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-800 border rounded-bl-none'
                                        }`}>
                                        {msg.message}
                                    </div>
                                    <span className="text-[10px] text-gray-400 mt-1 px-1 italic">
                                        {time}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={sendMessage} className="p-4 bg-white border-t flex gap-2">
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Type your private message..."
                        className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button type="submit" className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
}