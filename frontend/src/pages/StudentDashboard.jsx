import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function StudentDashboard({ userData }) {
    const [courses, setCourses] = useState([]);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const fetchCourses = async () => {
        try {
            // AuthGuard now handles the headers automatically!
            const response = await fetch(`${API_URL}/api/courses/`);
            if (response.ok) {
                const data = await response.json();
                setCourses(data);
            }
        } catch (err) {
            console.error('Failed to fetch courses', err);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            await fetchCourses();
        };
        loadData();
    }, []);

    const handleEnrol = async (courseId) => {
        try {
            const response = await fetch(`${API_URL}/api/courses/${courseId}/enrol/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                setMessage('Successfully enrolled in the course!');
                fetchCourses();
            } else {
                setMessage('Failed to enrol. Please try again.');
            }
        } catch (err) {
            console.error(err);
            setMessage('Server error.');
        }
    };

    // --- UPDATED FILTER LOGIC ---
    // Only show courses that are NOT archived
    const activeCourses = courses.filter(course => !course.is_archived);

    // Filter from the ACTIVE list only
    const enrolledCourses = activeCourses.filter(course => course.students.includes(userData.id));
    const availableCourses = activeCourses.filter(course => !course.students.includes(userData.id));

    return (
        <div className="mt-4">
            {message && (
                <div className="mb-6 p-4 bg-green-100 text-green-800 rounded-md border border-green-200">
                    {message}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* LEFT COLUMN: CURRENT COURSES */}
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">My Current Courses</h2>
                    {enrolledCourses.length === 0 ? (
                        <p className="text-gray-500 bg-white p-6 rounded-lg shadow-sm border border-gray-100 text-center">
                            You haven't enrolled in any active courses yet.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {enrolledCourses.map((course) => (
                                <div key={course.id} className="p-5 bg-white border border-blue-100 rounded-lg shadow-sm border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                                    <h4 className="text-lg font-bold text-gray-800 mb-1">{course.title}</h4>
                                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{course.description}</p>
                                    <div className="flex items-center justify-between mt-4">
                                        <span className="text-xs text-gray-500 font-medium">Instructor: {course.teacher_name}</span>
                                        <button onClick={() => navigate(`/course/${course.id}`)} className="px-4 py-1.5 text-sm font-bold text-blue-700 bg-blue-50 rounded hover:bg-blue-100">
                                            Go to Course &rarr;
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: AVAILABLE COURSES */}
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">Available to Enrol</h2>
                    {availableCourses.length === 0 ? (
                        <p className="text-gray-500 bg-white p-6 rounded-lg shadow-sm border border-gray-100 text-center">
                            No new active courses available.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {availableCourses.map((course) => (
                                <div key={course.id} className="p-5 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                    <h4 className="text-lg font-bold text-gray-800 mb-1">{course.title}</h4>
                                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{course.description}</p>
                                    <div className="flex items-center justify-between mt-4 border-t pt-4">
                                        <span className="text-xs text-gray-500 font-medium">Instructor: {course.teacher_name}</span>
                                        <button onClick={() => handleEnrol(course.id)} className="px-4 py-1.5 text-sm font-bold text-white bg-green-600 rounded hover:bg-green-700">
                                            Enrol Now
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}