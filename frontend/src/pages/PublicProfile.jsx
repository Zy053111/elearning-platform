import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiMessageCircle, FiBook, FiUser, FiArrowLeft } from "react-icons/fi";

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function PublicProfile() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem('access');
            try {
                const res = await fetch(`${API_URL}/api/accounts/user-detail/${userId}/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setProfile(data);
                }
            } catch (err) {
                console.error("Failed to fetch profile", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [userId]);

    if (loading) return <div className="p-10 text-center text-gray-500">Loading profile...</div>;
    if (!profile) return <div className="p-10 text-center text-red-500">User not found.</div>;

    return (
        <div className="min-h-[calc(100vh-64px)] bg-gray-50 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <button 
                    onClick={() => navigate(-1)} 
                    className="flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-6 transition-colors font-medium"
                >
                    <FiArrowLeft /> Back
                </button>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Header Section */}
                    <div className="bg-blue-800 h-32 md:h-48 relative">
                        <div className="absolute -bottom-12 left-8">
                            {profile.photo ? (
                                <img 
                                    src={profile.photo.startsWith('http') ? profile.photo : `${API_URL}${profile.photo}`} 
                                    className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 border-white object-cover shadow-md"
                                    alt="Profile"
                                />
                            ) : (
                                <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 border-white bg-blue-100 flex items-center justify-center text-blue-600 text-4xl font-bold shadow-md">
                                    {profile.username[0].toUpperCase()}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-16 pb-8 px-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">{profile.full_name}</h1>
                            <p className="text-blue-600 font-bold uppercase tracking-widest text-sm flex items-center gap-2 mt-1">
                                <FiUser /> {profile.is_teacher ? 'Faculty / Teacher' : 'Student'}
                            </p>
                            <p className="text-gray-400 text-sm mt-1">@{profile.username}</p>
                        </div>
                        
                        <button 
                            onClick={() => navigate(`/messages/${profile.id}`)}
                            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
                        >
                            <FiMessageCircle size={20} />
                            Send Private Message
                        </button>
                    </div>

                    <hr className="mx-8 border-gray-100" />

                    {/* Courses Section */}
                    <div className="p-8">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <FiBook className="text-blue-600" /> 
                            {profile.is_teacher ? 'Courses Taught' : 'Enrolled Courses'}
                        </h2>
                        
                        {profile.courses && profile.courses.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {profile.courses.map(course => (
                                    <div 
                                        key={course.id} 
                                        className="p-4 border border-gray-100 rounded-xl bg-gray-50 hover:border-blue-200 transition-colors"
                                    >
                                        <h3 className="font-bold text-gray-700">{course.title}</h3>
                                        <p className="text-xs text-gray-400 mt-1">ID: #{course.id}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-400 italic">No courses to display at this time.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}