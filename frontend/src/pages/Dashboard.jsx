import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TeacherDashboard from './TeacherDashboard';
import StudentDashboard from './StudentDashboard';

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function Dashboard() {
    const [userData, setUserData] = useState(null);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        // Function to fetch the user profile
        const fetchProfile = async () => {
            const token = localStorage.getItem('access');

            try {
                const response = await fetch(`${API_URL}/api/accounts/me/`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setUserData(data);
                } else {
                    // If token is invalid/expired, force logout and redirect
                    localStorage.removeItem('access');
                    localStorage.removeItem('refresh');
                    navigate('/login');
                }
            } catch (err) {
                console.error(err);
                setError('Failed to load profile data.');
            }
        };

        fetchProfile();
    }, [navigate]);

    // Show a loading state while fetching data
    if (!userData) return <div className="p-10 text-center text-gray-600">Loading dashboard...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                {/* Render the correct dashboard based on the user's role */}
                {userData.is_teacher ? (
                    <TeacherDashboard userData={userData} />
                ) : userData.is_student ? (
                    <StudentDashboard userData={userData} />
                ) : (
                    <div className="bg-white p-8 rounded shadow-md text-center mt-8">
                        <p className="text-gray-600">Please contact an administrator to assign your role.</p>
                    </div>
                )}

            </div>
        </div>
    );
}