import { useState, useEffect, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_BASE_URL;
const WS_URL = API_URL.replace('http', 'ws');

export default function CourseChat({ courseId, userData }) {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const ws = useRef(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        const token = localStorage.getItem('access');
        if (!token) return;

        if (ws.current && (
            ws.current.readyState === WebSocket.CONNECTING ||
            ws.current.readyState === WebSocket.OPEN
        )) {
            return;
        }

        // Fetch the chat history
        const fetchHistory = async () => {
            try {
                const response = await fetch(`${API_URL}/api/courses/${courseId}/messages/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setMessages(data);
                }
            } catch (err) {
                console.error('Failed to fetch chat history', err);
            }
        };
        fetchHistory();

        // Establish a single WebSocket connection
        const socket = new WebSocket(`${WS_URL}/ws/chat/${courseId}/?token=${token}`);
        ws.current = socket;

        socket.onopen = () => {
            console.log(`Connected to chat room for course ${courseId}`);
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            // This will only trigger once per message now
            setMessages((prevMessages) => [...prevMessages, data]);
        };

        socket.onerror = (error) => {
            if (socket.readyState === WebSocket.CLOSING || socket.readyState === WebSocket.CLOSED) {
                return;
            }
            console.error('WebSocket Error:', error);
        };

        // Nullify the listener before closing to prevent race conditions
        return () => {
            if (socket) {
                socket.onclose = null; // Remove the listener so it doesn't log during cleanup
                socket.onerror = null; // Remove the listener

                if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
                    socket.close();
                }
            }
        };
    }, [courseId]); // Only restart if the user switches courses

    const sendMessage = (e) => {
        e.preventDefault();

        if (inputMessage.trim() !== '' && ws.current) {
            // Send the data as a JSON string to Django
            ws.current.send(JSON.stringify({
                message: inputMessage,
                user_id: userData.id,
                username: userData.username
            }));

            // Clear the input field
            setInputMessage('');
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-gray-50 rounded-lg shadow-inner">
            <div className="bg-gray-200 px-4 py-2 rounded-t-lg border-b font-semibold text-gray-700 text-sm flex justify-between">
                <span>Live Class Discussion</span>
                <span className="text-green-600">● Online</span>
            </div>

            {/* Message History Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {messages.length === 0 ? (
                    <p className="text-xs text-center text-gray-400 mt-4">No messages yet. Start the conversation!</p>
                ) : (
                    messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex flex-col ${msg.username === userData.username ? 'items-end' : 'items-start'}`}
                        >
                            <span className="text-[10px] text-gray-500 mb-1 px-1">{msg.username}</span>
                            <div
                                className={`px-3 py-2 rounded-lg text-sm max-w-[80%] ${msg.username === userData.username
                                    ? 'bg-blue-500 text-white rounded-br-none'
                                    : 'bg-white border text-gray-800 rounded-bl-none'
                                    }`}
                            >
                                {msg.message}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} /> {/* Hidden div to help with auto-scrolling */}
            </div>

            {/* Input Area */}
            <form onSubmit={sendMessage} className="p-2 bg-white border-t rounded-b-lg flex gap-2">
                <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-1 text-sm border rounded-full focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <button
                    type="submit"
                    disabled={!inputMessage.trim()}
                    className="px-4 py-1 bg-blue-500 text-white text-sm font-bold rounded-full hover:bg-blue-600 disabled:bg-blue-300 transition-colors"
                >
                    Send
                </button>
            </form>
        </div>
    );
}