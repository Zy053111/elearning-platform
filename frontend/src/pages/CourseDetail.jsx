import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CourseChat from '../components/CourseChat';
import CourseFeedback from '../components/CourseFeedback';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function CourseDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    // Add a state for userData
    const [userData, setUserData] = useState(null);
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);

    // UI States
    const [activeTab, setActiveTab] = useState('materials');
    const [isMaterialsOpen, setIsMaterialsOpen] = useState(true);
    const [selectedMaterial, setSelectedMaterial] = useState(null);

    // PDF states
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);

    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadTitle, setUploadTitle] = useState('');
    const [uploadFile, setUploadFile] = useState(null);

    const handleUpload = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('title', uploadTitle);
        formData.append('file', uploadFile);

        try {
            const response = await fetch(`${API_URL}/api/courses/${id}/upload_material/`, {
                method: 'POST',
                body: formData,
            });
            if (response.ok) {
                setIsUploadModalOpen(false);
                setUploadTitle('');
                fetchData(); // Refresh to show new material
            }
        } catch (err) { console.error("Upload failed", err); }
    };

    const handleRemoveStudent = async (studentId) => {
        if (!window.confirm("Are you sure you want to remove this student from the course?")) return;

        try {
            // You will need to create this 'remove_student' endpoint in your Django ViewSet
            const response = await fetch(`${API_URL}/api/courses/${id}/remove_student/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ student_id: studentId })
            });
            if (response.ok) fetchData();
        } catch (err) { console.error("Removal failed", err); }
    };

    const handleDeleteMaterial = async (materialId) => {
        if (!window.confirm("Delete this material permanently?")) return;
        try {
            const response = await fetch(`${API_URL}/api/course-materials/${materialId}/`, {
                method: 'DELETE'
            });
            if (response.ok) {
                setSelectedMaterial(null); // Clear the preview
                fetchData(); // Refresh the list
            }
        } catch (err) { console.error("Delete failed", err); }
    };

    const handleDirectMessage = (studentId) => {
        // Navigate to a direct messaging page (you can build this next!)
        navigate(`/messages/${studentId}`);
    };

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages);
        setPageNumber(1);
    }

    // We wrap the fetch in useCallback so we can pass it to the Feedback component to refresh reviews
    const fetchData = useCallback(async () => {
        const token = localStorage.getItem('access');
        try {
            // Fetch BOTH the course details and the user profile at the same time
            const [courseRes, userRes] = await Promise.all([
                fetch(`${API_URL}/api/courses/${id}/`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/accounts/me/`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (courseRes.ok && userRes.ok) {
                const courseData = await courseRes.json();
                const userInfo = await userRes.json();

                setCourse(courseData);
                setUserData(userInfo);

                // Automatically select the first material if it exists and nothing is selected yet
                if (courseData.materials && courseData.materials.length > 0 && !selectedMaterial) {
                    setSelectedMaterial(courseData.materials[0]);
                }
            }
        } catch (err) {
            console.error('Failed to fetch data', err);
        } finally {
            setLoading(false);
        }
    }, [id, selectedMaterial]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) return <div className="p-10 text-center text-gray-600">Loading course...</div>;
    if (!course || !userData) return <div className="p-10 text-center text-red-500">Failed to load course data.</div>;

    // Helper function to figure out the file type
    const getFileType = (fileUrl) => {
        if (!fileUrl) return 'unknown';
        const lowerUrl = fileUrl.toLowerCase();
        if (lowerUrl.endsWith('.pdf')) return 'pdf';
        if (lowerUrl.match(/\.(jpeg|jpg|gif|png|webp)$/)) return 'image';
        return 'other'; // For docx, zip, etc.
    };

    return (
        <div className="flex h-[calc(100vh-64px)] bg-white border-t">
            {/* LEFT SIDEBAR */}
            <div className="w-72 bg-gray-50 border-r overflow-y-auto flex-shrink-0">
                <div className="p-6">
                    <button onClick={() => navigate('/dashboard')} className="text-sm text-blue-600 hover:underline mb-6 block font-medium">
                        &larr; Back to Dashboard
                    </button>
                    <h2 className="text-xl font-bold text-gray-800 mb-6">{course.title}</h2>

                    <nav className="space-y-1">
                        {/* Course Materials with Teacher ADD Button */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Content</span>
                                {userData.is_teacher && (
                                    <button
                                        onClick={() => setIsUploadModalOpen(true)}
                                        className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700 font-bold shadow-sm"
                                    >
                                        + ADD
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    setIsMaterialsOpen(!isMaterialsOpen);
                                    setActiveTab('materials');
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'materials' ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-gray-200'}`}
                            >
                                <span>📚 Course Materials</span>
                                <span>{isMaterialsOpen ? '▼' : '▶'}</span>
                            </button>

                            {isMaterialsOpen && (
                                <ul className="mt-1 ml-4 space-y-1 border-l-2 border-gray-200 pl-2">
                                    {course.materials.length === 0 ? (
                                        <li className="text-xs text-gray-500 py-1 pl-2">No materials yet</li>
                                    ) : (
                                        course.materials.map(mat => (
                                            <li key={mat.id} className="group flex items-center justify-between pr-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedMaterial(mat);
                                                        setActiveTab('materials');
                                                        setPageNumber(1);
                                                    }}
                                                    className={`flex-1 text-left px-2 py-1.5 text-sm rounded-md truncate ${selectedMaterial?.id === mat.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                                                >
                                                    📄 {mat.title}
                                                </button>
                                                {userData.is_teacher && (
                                                    <button
                                                        onClick={() => handleDeleteMaterial(mat.id)}
                                                        className="hidden group-hover:block text-red-500 hover:text-red-700 p-1"
                                                        title="Delete Material"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </li>
                                        ))
                                    )}
                                </ul>
                            )}
                        </div>

                        <button onClick={() => setActiveTab('chat')} className={`w-full text-left px-3 py-2 text-sm font-semibold rounded-md transition-colors mt-2 ${activeTab === 'chat' ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-gray-200'}`}>💬 Live Chat Discussion</button>
                        <button onClick={() => setActiveTab('classmates')} className={`w-full text-left px-3 py-2 text-sm font-semibold rounded-md transition-colors mt-2 ${activeTab === 'classmates' ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-gray-200'}`}>👥 Classmates</button>
                        <button onClick={() => setActiveTab('reviews')} className={`w-full text-left px-3 py-2 text-sm font-semibold rounded-md transition-colors mt-2 ${activeTab === 'reviews' ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-gray-200'}`}>⭐ Course Reviews</button>
                    </nav>
                </div>
            </div>

            {/* RIGHT MAIN CONTENT AREA */}
            <div className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6">
                {activeTab === 'materials' && (
                    <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
                        {selectedMaterial ? (
                            <>
                                <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                                    <h3 className="font-bold text-gray-800">{selectedMaterial.title}</h3>
                                    <div className="flex gap-2">
                                        <a
                                            href={selectedMaterial.file.startsWith('http') ? selectedMaterial.file : `${API_URL}${selectedMaterial.file}`}
                                            download target="_blank" rel="noreferrer"
                                            className="p-2 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 shadow-sm"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                        </a>
                                    </div>
                                </div>

                                <div className="flex-1 bg-gray-200 rounded-b-lg overflow-y-auto flex flex-col items-center py-6">
                                    {getFileType(selectedMaterial.file) === 'image' && (
                                        <img src={selectedMaterial.file.startsWith('http') ? selectedMaterial.file : `${API_URL}${selectedMaterial.file}`} alt={selectedMaterial.title} className="max-w-full h-auto shadow-lg border border-gray-300 max-h-[800px] object-contain" />
                                    )}

                                    {getFileType(selectedMaterial.file) === 'pdf' && (
                                        <>
                                            <Document file={selectedMaterial.file.startsWith('http') ? selectedMaterial.file : `${API_URL}${selectedMaterial.file}`} onLoadSuccess={onDocumentLoadSuccess} className="shadow-lg border border-gray-300">
                                                <Page pageNumber={pageNumber} renderTextLayer={false} renderAnnotationLayer={false} width={800} />
                                            </Document>
                                            {numPages && (
                                                <div className="flex items-center gap-4 mt-6 bg-white px-6 py-2 rounded-full shadow-sm border text-sm">
                                                    <button disabled={pageNumber <= 1} onClick={() => setPageNumber(prev => prev - 1)} className="px-3 py-1 font-semibold text-gray-700 hover:text-blue-600 disabled:opacity-40">&larr; Prev</button>
                                                    <span className="font-medium text-gray-600">Page {pageNumber} of {numPages}</span>
                                                    <button disabled={pageNumber >= numPages} onClick={() => setPageNumber(prev => prev + 1)} className="px-3 py-1 font-semibold text-gray-700 hover:text-blue-600 disabled:opacity-40">Next &rarr; </button>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {getFileType(selectedMaterial.file) === 'other' && (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-500 mt-20">
                                            <span className="text-6xl mb-4">📁</span>
                                            <p className="text-lg font-medium text-gray-700">Preview not available.</p>
                                            <p className="text-sm">Please download the file to view its content.</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                                <span className="text-4xl mb-4">📂</span>
                                <p>Select a material from the left menu.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* CLASSMATES TAB: With Remove Option for Teachers */}
                {activeTab === 'classmates' && (
                    <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
                        <div className="p-4 border-b bg-gray-50 rounded-t-lg flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-gray-800">Enrolled Students</h3>
                                <p className="text-xs text-gray-500">{course.student_details?.length || 0} students currently enrolled</p>
                            </div>
                        </div>
                        <div className="p-6">
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {course.student_details && course.student_details.map(student => (
                                    <li key={student.id} className="p-4 border rounded-xl bg-gray-50 flex items-center gap-3 shadow-sm hover:shadow transition-shadow">
                                        {student.photo ? (
                                            <img src={student.photo.startsWith('http') ? student.photo : `${API_URL}${student.photo}`} alt={student.username} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xl border-2 border-white shadow-sm">{student.username.charAt(0).toUpperCase()}</div>
                                        )}
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-800 leading-none mb-1">
                                                {student.first_name ? `${student.first_name} ${student.last_name || ''}` : student.username}
                                            </p>
                                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Student</p>
                                        </div>

                                        <div className="flex gap-2">
                                            {userData.is_teacher && (
                                                <button onClick={() => handleRemoveStudent(student.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100" title="Remove student from course">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" /></svg>
                                                </button>
                                            )}
                                            {student.id !== userData.id && (
                                                <button onClick={() => handleDirectMessage(student.id)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-all border border-blue-100" title={`Message ${student.username}`}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {/* (Keep Chat and Reviews tabs as they were) */}
                {activeTab === 'chat' && (
                    <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
                        <div className="p-4 border-b bg-gray-50 rounded-t-lg">
                            <h3 className="font-bold text-gray-800">Course Live Chat</h3>
                        </div>
                        <div className="flex-1 p-4 overflow-y-auto">
                            <CourseChat courseId={course.id} userData={userData} />
                        </div>
                    </div>
                )}

                {activeTab === 'reviews' && (
                    <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
                        <div className="p-4 border-b bg-gray-50 rounded-t-lg"><h3 className="font-bold text-gray-800">Course Reviews</h3></div>
                        <div className="p-4 overflow-y-auto"><CourseFeedback course={course} userData={userData} refreshCourses={fetchData} /></div>
                    </div>
                )}
            </div>

            {/* TEACHER UPLOAD MODAL */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <form onSubmit={handleUpload} className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl space-y-6">
                        <div className="text-center">
                            <h3 className="text-2xl font-bold text-gray-800">Add Material</h3>
                            <p className="text-sm text-gray-500 mt-1">Upload files for your students to access.</p>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Title</label>
                                <input type="text" placeholder="e.g. Node 1 Physical Computing" className="w-full border-2 border-gray-100 p-3 rounded-xl focus:border-blue-500 outline-none transition-colors" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">File</label>
                                <input type="file" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={(e) => setUploadFile(e.target.files[0])} required />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button type="button" onClick={() => setIsUploadModalOpen(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                            <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">Upload File</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}