import { useState, useEffect, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function Profile() {
    const [userData, setUserData] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    // Form states including new fields
    const [formData, setFormData] = useState({
        username: '',
        first_name: '',
        last_name: '',
        email: ''
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    const [message, setMessage] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(true);

    const fileInputRef = useRef(null);

    const fetchProfile = async () => {
        try {
            const response = await fetch(`${API_URL}/api/accounts/me/`);
            if (response.ok) {
                const data = await response.json();
                setUserData(data);
                setFormData({
                    username: data.username,
                    first_name: data.first_name || '',
                    last_name: data.last_name || '',
                    email: data.email || ''
                });
                setPreviewUrl(data.photo ? (data.photo.startsWith('http') ? data.photo : `${API_URL}${data.photo}`) : null);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        const dataToSend = new FormData();
        dataToSend.append('username', formData.username);
        dataToSend.append('first_name', formData.first_name);
        dataToSend.append('last_name', formData.last_name);
        dataToSend.append('email', formData.email);

        if (selectedFile) {
            dataToSend.append('photo', selectedFile);
        }

        try {
            const response = await fetch(`${API_URL}/api/accounts/me/`, {
                method: 'PATCH',
                body: dataToSend
                // AuthGuard handles the Authorization header automatically now!
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Profile updated successfully!' });
                setIsEditing(false);
                fetchProfile();
                window.dispatchEvent(new Event('profileUpdated'));
            } else {
                const errData = await response.json();
                setMessage({ type: 'error', text: errData.detail || 'Failed to update profile.' });
            }
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Server connection error.' });
        }
    };

    if (loading) return <div className="p-10 text-center text-gray-600">Loading profile...</div>;
    if (!userData) return null;

    return (
        <div className="min-h-[calc(100vh-64px)] bg-gray-50 py-10 px-4">
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md overflow-hidden border">
                <div className="bg-blue-800 h-32 flex items-end justify-end p-4">
                    <span className="text-blue-200 text-xs font-medium">
                        Member since: {new Date(userData.date_joined).toLocaleDateString()}
                    </span>
                </div>

                <div className="px-8 pb-8">
                    <div className="relative flex justify-center -mt-16 mb-6">
                        <div className="relative">
                            {previewUrl ? (
                                <img src={previewUrl} alt="Profile" className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg bg-white" />
                            ) : (
                                <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-gray-200 flex items-center justify-center text-4xl font-bold text-gray-500">
                                    {userData.username.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                            {isEditing && (
                                <button type="button" onClick={() => fileInputRef.current.click()} className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full text-white hover:bg-blue-700 shadow-sm border-2 border-white transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    {message.text && (
                        <div className={`mb-6 p-4 rounded-md text-sm font-medium ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-800">{userData.first_name} {userData.last_name}</h1>
                        <div className="flex justify-center gap-2 mt-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${userData.is_teacher ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                {userData.is_teacher ? 'Teacher' : 'Student'}
                            </span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">First Name</label>
                                <input
                                    type="text"
                                    value={isEditing ? formData.first_name : userData.first_name || ''}
                                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                    disabled={!isEditing}
                                    className={`w-full px-4 py-2 rounded-md border ${isEditing ? 'border-blue-300 bg-white' : 'border-gray-200 bg-gray-50 text-gray-600'}`}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Last Name</label>
                                <input
                                    type="text"
                                    value={isEditing ? formData.last_name : userData.last_name || ''}
                                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                    disabled={!isEditing}
                                    className={`w-full px-4 py-2 rounded-md border ${isEditing ? 'border-blue-300 bg-white' : 'border-gray-200 bg-gray-50 text-gray-600'}`}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Username</label>
                            <input
                                type="text"
                                value={isEditing ? formData.username : userData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                disabled={!isEditing}
                                className={`w-full px-4 py-2 rounded-md border ${isEditing ? 'border-blue-300 bg-white' : 'border-gray-200 bg-gray-50 text-gray-600'}`}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
                            <input
                                type="email"
                                value={isEditing ? formData.email : userData.email || ''}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                disabled={!isEditing}
                                className={`w-full px-4 py-2 rounded-md border ${isEditing ? 'border-blue-300 bg-white' : 'border-gray-200 bg-gray-50 text-gray-600'}`}
                            />
                        </div>

                        <div className="pt-6 border-t flex justify-end gap-3">
                            {isEditing ? (
                                <>
                                    <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-2 font-semibold text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
                                    <button type="submit" className="px-6 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">Save Changes</button>
                                </>
                            ) : (
                                <button type="button" onClick={() => setIsEditing(true)} className="px-6 py-2 font-semibold text-white bg-gray-800 rounded-md hover:bg-gray-900">Edit Profile</button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}