const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export const api = {
    getPosts: () => fetch(`${API_BASE_URL}/api/posts`).then(res => res.json()),
    createPost: (post) => fetch(`${API_BASE_URL}/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post)
    }).then(res => res.json())
};
