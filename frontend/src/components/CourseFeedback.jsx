import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function CourseFeedback({ course, userData, refreshCourses }) {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [message, setMessage] = useState('');

    // Check if this specific student has already left a review
    const hasReviewed = course.feedbacks.some(f => f.student_name === userData.username);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('access');

        try {
            const response = await fetch(`${API_URL}/api/courses/${course.id}/leave_feedback/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ rating, comment }),
            });

            if (response.ok) {
                setMessage('Thank you for your feedback!');
                setComment('');
                refreshCourses(); // Instantly refresh the dashboard to show the new review
            } else {
                const data = await response.json();
                setMessage(data.error || 'Failed to submit feedback.');
            }
        } catch (err) {
            console.error(err);
            setMessage('Server error. Is Django running?');
        }
    };

    return (
        <div className="mt-6 border-t pt-4">
            <h5 className="text-lg font-bold text-gray-800 mb-3">Course Reviews</h5>

            {/* Display existing feedbacks */}
            <div className="space-y-3 mb-4">
                {course.feedbacks.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No reviews yet. Be the first to review!</p>
                ) : (
                    course.feedbacks.map((fb) => (
                        <div key={fb.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-3">
                                    {/* Avatar fallback */}
                                    {fb.student_photo ? (
                                        <img
                                            src={fb.student_photo.startsWith('http') ? fb.student_photo : `${API_URL}${fb.student_photo}`}
                                            alt={fb.student_name}
                                            className="w-10 h-10 rounded-full object-cover border border-gray-300"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-lg border border-blue-200">
                                            {fb.student_name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div>
                                        {/* PRIORITY NAME LOGIC */}
                                        <p className="font-bold text-gray-800">
                                            {fb.student_first_name
                                                ? `${fb.student_first_name} ${fb.student_last_name || ''}`
                                                : fb.student_name}
                                        </p>
                                        <p className="text-[10px] text-gray-400">
                                            {new Date(fb.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-yellow-500 font-bold">
                                    {'★'.repeat(fb.rating)}{'☆'.repeat(5 - fb.rating)}
                                </span>
                            </div>
                            <p className="text-gray-600 italic border-l-4 border-gray-200 pl-3 py-1">
                                "{fb.comment}"
                            </p>
                        </div>
                    ))
                )}
            </div>

            {/* Feedback Form */}
            {!hasReviewed ? (
                <form onSubmit={handleSubmit} className="bg-blue-50 p-4 rounded-md border border-blue-100">
                    <h6 className="font-semibold text-blue-800 mb-2">Leave a Review</h6>
                    {message && <p className="text-sm text-red-500 mb-2">{message}</p>}

                    <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                        <select
                            value={rating}
                            onChange={(e) => setRating(Number(e.target.value))}
                            className="w-full px-3 py-1 border rounded bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none"
                        >
                            <option value="5">5 Stars - Excellent</option>
                            <option value="4">4 Stars - Very Good</option>
                            <option value="3">3 Stars - Good</option>
                            <option value="2">2 Stars - Fair</option>
                            <option value="1">1 Star - Poor</option>
                        </select>
                    </div>

                    <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full px-3 py-1 border rounded focus:ring-2 focus:ring-blue-400 focus:outline-none"
                            rows="2"
                            required
                            placeholder="What did you think of the course materials?"
                        ></textarea>
                    </div>

                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700 transition-colors">
                        Submit Review
                    </button>
                </form>
            ) : (
                <p className="text-sm text-green-600 font-medium bg-green-50 p-3 rounded border border-green-200">
                    ✓ You have already reviewed this course.
                </p>
            )}
        </div>
    );
}