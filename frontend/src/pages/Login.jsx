import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom'; // Added useLocation

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [infoMessage, setInfoMessage] = useState(''); // State for session messages

    const navigate = useNavigate();
    const location = useLocation(); // Hook to access state passed from navigate()

    // Check for messages from setupAuthListener.js on mount
    useEffect(() => {
        // Check if there is a message in the navigation state
        const message = location.state?.message;
        if (message) {
            const timer = setTimeout(() => {
                setInfoMessage(message);
                window.history.replaceState({}, document.title);
            }, 0);

            return () => clearTimeout(timer); // Cleanup timer if component unmounts
        }
    }, [location]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setInfoMessage(''); // Clear info message when a new login attempt begins

        try {
            const response = await fetch(`${API_URL}/api/token/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('access', data.access);
                localStorage.setItem('refresh', data.refresh);
                navigate('/');
            } else {
                setError('Invalid username or password.');
            }
        } catch (err) {
            console.error(err);
            setError('Cannot connect to the server. Is Django running?');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded shadow-md">
                <h2 className="text-2xl font-bold text-center text-gray-800">eLearning Login</h2>

                {/* Session Expired Message */}
                {infoMessage && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-yellow-700 font-medium">{infoMessage}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Existing error message */}
                {error && <p className="text-red-500 text-sm text-center font-bold">{error}</p>}

                <form onSubmit={handleLogin} className="space-y-4">
                    {/* ... (Keep your existing form inputs and button) ... */}
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                            required
                        />
                    </div>

                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full px-4 py-2 font-bold text-white bg-blue-500 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                        Log In
                    </button>
                </form>
                <p className="text-sm text-center text-gray-600">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-blue-500 hover:underline">
                        Sign up here
                    </Link>
                </p>
            </div>
        </div>
    );
}