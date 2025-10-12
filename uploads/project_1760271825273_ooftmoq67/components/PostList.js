import React from 'react';

const PostList = ({ posts }) => {
    return (
        <div className="post-list">
            {posts.map(post => (
                <div key={post.id} className="post">
                    <h3>{post.title}</h3>
                    <p>{post.content}</p>
                </div>
            ))}
        </div>
    );
};

export default PostList;
