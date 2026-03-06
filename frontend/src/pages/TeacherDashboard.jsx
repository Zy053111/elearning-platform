import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlusCircle, FiUploadCloud, FiBookOpen, FiUsers, FiMessageCircle, FiSearch, FiBarChart2, FiArchive, FiRefreshCw, FiTrash2 } from "react-icons/fi";

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function TeacherDashboard({ userData }) {
    const [courses, setCourses] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [message, setMessage] = useState('');

    const [uploadCourseId, setUploadCourseId] = useState('');
    const [materialTitle, setMaterialTitle] = useState('');
    const [file, setFile] = useState(null);
    const [uploadMessage, setUploadMessage] = useState('');
    const navigate = useNavigate();

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [courseToDelete, setCourseToDelete] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const fetchCourses = async () => {
        try {
            const response = await fetch(`${API_URL}/api/courses/`);
            if (response.ok) {
                const data = await response.json();
                setCourses(data.filter(c => c.teacher === userData.id));
            }
        } catch (err) {
            console.error('Failed to fetch courses', err);
        }
    };

    useEffect(() => { fetchCourses(); }, []);

    // New: Toggle Archive function
    const handleToggleArchive = async (courseId) => {
        try {
            const response = await fetch(`${API_URL}/api/courses/${courseId}/toggle_archive/`, {
                method: 'POST'
            });
            if (response.ok) {
                fetchCourses();
            }
        } catch (err) {
            console.error("Archive failed", err);
        }
    };

    // Filter and Separate Active vs Archived
    const filteredCourses = courses.filter(course =>
        course.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const activeCourses = filteredCourses.filter(c => !c.is_archived);
    const archivedCourses = filteredCourses.filter(c => c.is_archived);

    const totalStudents = courses.reduce((acc, course) => acc + (course.students?.length || 0), 0);

    const handleCreateCourse = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_URL}/api/courses/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description }),
            });
            if (response.ok) {
                setMessage('Course created successfully!');
                setTitle(''); setDescription('');
                fetchCourses();
            }
        } catch (err) {
            console.error(err);
            setMessage('Server error.');
        }
    };

    const handleUploadMaterial = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('title', materialTitle);
        formData.append('file', file);
        try {
            const response = await fetch(`${API_URL}/api/courses/${uploadCourseId}/upload_material/`, {
                method: 'POST',
                body: formData,
            });
            if (response.ok) {
                setUploadMessage('Material uploaded successfully!');
                setMaterialTitle(''); setFile(null);
                document.getElementById('file-upload').value = '';
                fetchCourses();
            }
        } catch (err) {
            console.error(err);
            setUploadMessage('Error uploading.');
        }
    };

    const confirmDelete = async () => {
        setDeleteLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/courses/${courseToDelete.id}/`, {
                method: 'DELETE',
            });
            if (response.ok) {
                setShowDeleteModal(false);
                fetchCourses();
            }
        } catch (err) {
            console.error("Delete failed", err);
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="mt-4 pb-10">
            {/* Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex items-center gap-4">
                    <div className="bg-blue-100 p-3 rounded-lg text-blue-600"><FiBookOpen size={24} /></div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Active Courses</p>
                        <p className="text-2xl font-bold text-gray-800">{activeCourses.length}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm flex items-center gap-4">
                    <div className="bg-green-100 p-3 rounded-lg text-green-600"><FiUsers size={24} /></div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Students</p>
                        <p className="text-2xl font-bold text-gray-800">{totalStudents}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm flex items-center gap-4">
                    <div className="bg-purple-100 p-3 rounded-lg text-purple-600"><FiBarChart2 size={24} /></div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Archived</p>
                        <p className="text-2xl font-bold text-gray-800">{archivedCourses.length}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* LEFT COLUMN: ACTIVE COURSES */}
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-2">
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <FiBookOpen className="text-blue-600" /> My Courses
                        </h2>
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search courses..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-64"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Courses</h3>
                        {activeCourses.length === 0 ? (
                            <p className="text-gray-400 italic text-center py-4 bg-white rounded-lg border">No active courses found.</p>
                        ) : (
                            activeCourses.map((course) => (
                                <div key={course.id} className="bg-white border rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="text-lg font-bold text-gray-800">{course.title}</h4>
                                            <button
                                                onClick={() => handleToggleArchive(course.id)}
                                                className="text-gray-400 hover:text-blue-600 transition-colors"
                                                title="Archive Course"
                                            >
                                                <FiArchive size={18} />
                                            </button>
                                        </div>
                                        <p className="text-sm text-gray-600 line-clamp-2 mb-4">{course.description}</p>
                                        <div className="flex gap-2">
                                            <button onClick={() => navigate(`/course/${course.id}`)} className="flex-1 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                                                Manage
                                            </button>
                                            <button
                                                onClick={() => { setCourseToDelete(course); setShowDeleteModal(true); }}
                                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 border border-red-100"
                                            >
                                                <FiTrash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}

                        {/* ARCHIVED SECTION */}
                        {archivedCourses.length > 0 && (
                            <div className="mt-10 pt-6 border-t">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Archived</h3>
                                <div className="space-y-2">
                                    {archivedCourses.map(course => (
                                        <div key={course.id} className="bg-gray-50 border rounded-lg p-3 flex justify-between items-center opacity-70">
                                            <span className="text-sm text-gray-600 font-medium">{course.title}</span>
                                            <button
                                                onClick={() => handleToggleArchive(course.id)}
                                                className="flex items-center gap-1 text-xs text-blue-600 font-bold hover:underline"
                                            >
                                                <FiRefreshCw /> Restore
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: TOOLS */}
                <div className="space-y-8">
                    {/* Forms logic remains standard... */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
                        <h3 className="text-lg font-bold mb-4 text-blue-800 flex items-center gap-2">
                            <FiPlusCircle /> New Course
                        </h3>
                        {message && (
                            <p className={`mb-4 text-sm font-medium p-2 rounded ${message.includes('successfully') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                }`}>
                                {message}
                            </p>
                        )}
                        {/* ... Create Course Form ... */}
                        <form onSubmit={handleCreateCourse} className="space-y-4">
                            <input type="text" placeholder="Course Title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
                            <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-2 border rounded-lg" rows="3" required />
                            <button type="submit" className="w-full py-2 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700">Launch</button>
                        </form>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-purple-100">
                        <h3 className="text-lg font-bold mb-4 text-purple-800 flex items-center gap-2">
                            <FiUploadCloud /> Quick Upload
                        </h3>
                        {uploadMessage && (
                            <p className={`mb-4 text-sm font-medium p-2 rounded ${uploadMessage.includes('successfully') ? 'bg-purple-50 text-purple-600' : 'bg-red-50 text-red-600'
                                }`}>
                                {uploadMessage}
                            </p>
                        )}
                        {/* ... Upload Form ... */}
                        <form onSubmit={handleUploadMaterial} className="space-y-4">
                            <select value={uploadCourseId} onChange={(e) => setUploadCourseId(e.target.value)} className="w-full px-4 py-2 border rounded-lg bg-gray-50" required>
                                <option value="" disabled>Select course</option>
                                {activeCourses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                            </select>
                            <input type="text" placeholder="Material Name" value={materialTitle} onChange={(e) => setMaterialTitle(e.target.value)} className="w-full px-4 py-2 border rounded-lg" required />
                            <input id="file-upload" type="file" onChange={(e) => setFile(e.target.files[0])} className="w-full px-4 py-2 border rounded-lg bg-white" required />
                            <button type="submit" className="w-full py-2 font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-700">Add File</button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Delete Modal Logic ... */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Delete Course?</h3>
                        <p className="text-gray-600 text-sm mb-6">Are you sure you want to delete <b>"{courseToDelete?.title}"</b>?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2 bg-gray-100 text-gray-600 font-bold rounded-lg hover:bg-gray-200">Cancel</button>
                            <button onClick={confirmDelete} disabled={deleteLoading} className="flex-1 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50">{deleteLoading ? 'Deleting...' : 'Yes, Delete'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}