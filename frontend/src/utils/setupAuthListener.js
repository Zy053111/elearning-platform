export const setupAuthListener = (navigate) => {
    const { fetch: originalFetch } = window;

    window.fetch = async (...args) => {
        let [resource, config] = args;

        // 1. Automatically add the token to every fetch if it exists
        const token = localStorage.getItem('access');
        if (token) {
            config = config || {};
            config.headers = {
                ...config.headers,
                'Authorization': `Bearer ${token}`,
            };
        }

        const response = await originalFetch(resource, config);

        // 2. Global 401 Interceptor
        if (response.status === 401) {
            console.warn("Token expired. Logging out...");
            
            // Clean up local data
            localStorage.removeItem('access');
            localStorage.removeItem('refresh');
            
            // Redirect to login with a message
            navigate('/login', { state: { message: "Your session has expired. Please log in again." } });
            
            // Return an empty promise to stop the calling component from crashing
            return new Promise(() => {}); 
        }

        return response;
    };
};