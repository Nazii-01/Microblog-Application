class MicroBlogApp {
    constructor() {
        this.token = localStorage.getItem('token');
        this.currentUser = null;
        this.currentView = 'home';
        
        this.init();
    }

    init() {
        this.bindEvents();
        
        if (this.token) {
            this.loadApp();
        } else {
            this.showAuth();
        }
    }

    bindEvents() {
        // Auth events
        document.getElementById('showRegister').addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegisterForm();
        });

        document.getElementById('showLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });

        document.getElementById('loginFormElement').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        document.getElementById('registerFormElement').addEventListener('submit', (e) => {
            e.preventDefault();
            this.register();
        });

        // Navigation events
        document.getElementById('homeBtn').addEventListener('click', () => {
            this.showHome();
        });

        document.getElementById('profileBtn').addEventListener('click', () => {
            this.showProfile();
        });

        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Post events
        document.getElementById('postBtn').addEventListener('click', () => {
            this.createPost();
        });

        document.getElementById('postContent').addEventListener('input', (e) => {
            this.updateCharCount(e.target);
        });

        // Search events
        document.getElementById('userSearch').addEventListener('input', (e) => {
            this.debounceSearch(e.target.value);
        });
    }

    // Debounce search to avoid too many API calls
    debounceSearch(query) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.searchUsers(query);
        }, 300);
    }

    // Authentication methods
    showAuth() {
        document.getElementById('authContainer').style.display = 'flex';
        document.getElementById('appContainer').style.display = 'none';
        document.getElementById('navbar').style.display = 'none';
        this.hideMessages();
    }

    showLoginForm() {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
        this.clearForms();
    }

    showRegisterForm() {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
        this.clearForms();
    }

    async login() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            this.showError('Please fill in all fields');
            return;
        }

        this.showLoading();

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                localStorage.setItem('token', this.token);
                this.currentUser = data.user;
                this.loadApp();
                this.showSuccess('Login successful!');
            } else {
                this.showError(data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Login failed. Please check your connection and try again.');
        } finally {
            this.hideLoading();
        }
    }

    async register() {
        const username = document.getElementById('registerUsername').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;

        if (!username || !email || !password) {
            this.showError('Please fill in all fields');
            return;
        }

        if (username.length < 3) {
            this.showError('Username must be at least 3 characters long');
            return;
        }

        if (password.length < 6) {
            this.showError('Password must be at least 6 characters long');
            return;
        }

        this.showLoading();

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                localStorage.setItem('token', this.token);
                this.currentUser = data.user;
                this.loadApp();
                this.showSuccess('Registration successful!');
            } else {
                this.showError(data.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showError('Registration failed. Please check your connection and try again.');
        } finally {
            this.hideLoading();
        }
    }

    logout() {
        this.token = null;
        localStorage.removeItem('token');
        this.currentUser = null;
        this.showAuth();
        this.clearForms();
        this.showSuccess('Logged out successfully');
    }

    clearForms() {
        document.getElementById('loginFormElement').reset();
        document.getElementById('registerFormElement').reset();
    }

    // App loading and navigation
    async loadApp() {
        try {
            await this.getCurrentUser();
            document.getElementById('authContainer').style.display = 'none';
            document.getElementById('appContainer').style.display = 'block';
            document.getElementById('navbar').style.display = 'block';
            this.showHome();
        } catch (error) {
            console.error('Load app error:', error);
            this.logout();
        }
    }

    async getCurrentUser() {
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${this.token}`,
            },
        });

        if (response.ok) {
            const data = await response.json();
            this.currentUser = data.user;
            this.updateUserInfo();
        } else {
            throw new Error('Failed to get user');
        }
    }

    updateUserInfo() {
        document.getElementById('currentUsername').textContent = `@${this.currentUser.username}`;
        document.getElementById('currentUserBio').textContent = this.currentUser.bio || 'No bio yet';
        document.getElementById('followingCount').textContent = this.currentUser.following || 0;
        document.getElementById('followersCount').textContent = this.currentUser.followers || 0;
    }

    showHome() {
        this.setActiveNav('homeBtn');
        document.getElementById('homeView').style.display = 'grid';
        document.getElementById('profileView').style.display = 'none';
        this.currentView = 'home';
        this.loadFeed();
    }

    showProfile() {
        this.setActiveNav('profileBtn');
        document.getElementById('homeView').style.display = 'none';
        document.getElementById('profileView').style.display = 'block';
        this.currentView = 'profile';
        this.loadProfile(this.currentUser.username);
    }

    setActiveNav(activeId) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(activeId).classList.add('active');
    }

    // Post methods
    async createPost() {
        const content = document.getElementById('postContent').value.trim();

        if (!content) {
            this.showError('Please enter some content');
            return;
        }

        if (content.length > 280) {
            this.showError('Post is too long (maximum 280 characters)');
            return;
        }

        const postBtn = document.getElementById('postBtn');
        postBtn.disabled = true;
        postBtn.textContent = 'Posting...';

        try {
            const response = await fetch('/api/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`,
                },
                body: JSON.stringify({ content }),
            });

            const data = await response.json();

            if (response.ok) {
                document.getElementById('postContent').value = '';
                this.updateCharCount(document.getElementById('postContent'));
                this.loadFeed();
                this.showSuccess('Post created successfully!');
            } else {
                this.showError(data.message || 'Failed to create post');
            }
        } catch (error) {
            console.error('Create post error:', error);
            this.showError('Failed to create post. Please try again.');
        } finally {
            postBtn.disabled = false;
            postBtn.textContent = 'Post';
        }
    }

    updateCharCount(textarea) {
        const remaining = 280 - textarea.value.length;
        const charCount = document.getElementById('charCount');
        const postBtn = document.getElementById('postBtn');

        charCount.textContent = remaining;
        
        if (remaining < 0) {
            charCount.style.color = '#ff6b6b';
            postBtn.disabled = true;
        } else if (remaining < 20) {
            charCount.style.color = '#ffad1f';
            postBtn.disabled = false;
        } else {
            charCount.style.color = '#657786';
            postBtn.disabled = false;
        }
    }

    async loadFeed() {
        this.showLoading();

        try {
            const response = await fetch('/api/posts/feed', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                },
            });

            if (response.ok) {
                const posts = await response.json();
                this.renderFeed(posts);
            } else {
                console.error('Failed to load feed:', response.status);
                this.showError('Failed to load feed');
            }
        } catch (error) {
            console.error('Load feed error:', error);
            this.showError('Failed to load feed. Please check your connection.');
        } finally {
            this.hideLoading();
        }
    }

    renderFeed(posts) {
        const feed = document.getElementById('feed');
        
        if (posts.length === 0) {
            feed.innerHTML = `
                <div class="post">
                    <p style="text-align: center; color: #657786; padding: 2rem;">
                        No posts yet. Follow some users or create your first post!
                    </p>
                </div>
            `;
            return;
        }

        feed.innerHTML = posts.map(post => this.renderPost(post)).join('');
    }

    renderPost(post) {
        const isOwner = post.author._id === this.currentUser.id;
        const isLiked = post.isLiked || post.likes.some(like => 
            (typeof like === 'string' ? like : like._id) === this.currentUser.id
        );
        const likesCount = post.likesCount || (post.likes ? post.likes.length : 0);
        const timeAgo = this.formatTimeAgo(new Date(post.createdAt));

        return `
            <div class="post" data-post-id="${post._id}">
                <div class="post-header">
                    <span class="post-author">@${post.author.username}</span>
                    <span class="post-time">${timeAgo}</span>
                </div>
                <div class="post-content">${this.escapeHtml(post.content)}</div>
                <div class="post-actions">
                    <button class="like-btn ${isLiked ? 'liked' : ''}" onclick="app.toggleLike('${post._id}')">
                        ♥ ${likesCount}
                    </button>
                    ${isOwner ? `<button class="delete-btn" onclick="app.deletePost('${post._id}')">🗑️ Delete</button>` : ''}
                </div>
            </div>
        `;
    }

    async toggleLike(postId) {
        try {
            const response = await fetch(`/api/posts/${postId}/like`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                },
            });

            if (response.ok) {
                // Update the specific post instead of reloading entire feed
                const updatedPost = await response.json();
                this.updatePostInUI(postId, updatedPost);
            } else {
                this.showError('Failed to update like');
            }
        } catch (error) {
            console.error('Toggle like error:', error);
            this.showError('Failed to update like');
        }
    }

    updatePostInUI(postId, updatedPost) {
        const postElement = document.querySelector(`[data-post-id="${postId}"]`);
        if (postElement) {
            const likesCount = updatedPost.likesCount || updatedPost.likes.length;
            const isLiked = updatedPost.isLiked || updatedPost.likes.some(like => 
                (typeof like === 'string' ? like : like._id) === this.currentUser.id
            );
            
            const likeBtn = postElement.querySelector('.like-btn');
            likeBtn.innerHTML = `♥ ${likesCount}`;
            likeBtn.className = `like-btn ${isLiked ? 'liked' : ''}`;
        }
    }

    async deletePost(postId) {
        if (!confirm('Are you sure you want to delete this post?')) {
            return;
        }

        try {
            const response = await fetch(`/api/posts/${postId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                },
            });

            if (response.ok) {
                // Remove post from UI immediately
                const postElement = document.querySelector(`[data-post-id="${postId}"]`);
                if (postElement) {
                    postElement.remove();
                }
                this.showSuccess('Post deleted successfully');
            } else {
                const data = await response.json();
                this.showError(data.message || 'Failed to delete post');
            }
        } catch (error) {
            console.error('Delete post error:', error);
            this.showError('Failed to delete post');
        }
    }

    // User search and profile methods
    async searchUsers(query) {
        if (!query.trim()) {
            document.getElementById('searchResults').innerHTML = '';
            return;
        }

        try {
            const response = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}`);
            
            if (response.ok) {
                const users = await response.json();
                this.renderSearchResults(users);
            } else {
                console.error('Search failed:', response.status);
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    renderSearchResults(users) {
        const searchResults = document.getElementById('searchResults');
        
        if (users.length === 0) {
            searchResults.innerHTML = '<p style="color: #657786; text-align: center; padding: 1rem;">No users found</p>';
            return;
        }

        searchResults.innerHTML = users.map(user => `
            <div class="user-result" onclick="app.viewUserProfile('${user.username}')">
                <div class="user-result-info">
                    <h5>@${user.username}</h5>
                    <p>${this.escapeHtml(user.bio || 'No bio')}</p>
                </div>
            </div>
        `).join('');
    }

    viewUserProfile(username) {
        this.setActiveNav('profileBtn');
        document.getElementById('homeView').style.display = 'none';
        document.getElementById('profileView').style.display = 'block';
        this.currentView = 'profile';
        this.loadProfile(username);
    }

    async loadProfile(username) {
        this.showLoading();

        try {
            const response = await fetch(`/api/users/${username}`);
            
            if (response.ok) {
                const data = await response.json();
                this.renderProfile(data);
            } else {
                this.showError('User not found');
            }
        } catch (error) {
            console.error('Load profile error:', error);
            this.showError('Failed to load profile');
        } finally {
            this.hideLoading();
        }
    }

    renderProfile(data) {
        const { user, posts } = data;
        const isOwnProfile = user.username === this.currentUser.username;

        document.getElementById('profileContent').innerHTML = `
            <div class="user-profile">
                <div class="profile-header">
                    <h2>@${user.username}</h2>
                    <p class="profile-bio">${this.escapeHtml(user.bio || 'No bio')}</p>
                    <div class="profile-stats">
                        <span><strong>${user.postsCount}</strong> Posts</span>
                        <span><strong>${user.followersCount}</strong> Followers</span>
                        <span><strong>${user.followingCount}</strong> Following</span>
                    </div>
                    ${!isOwnProfile ? `
                        <button id="followBtn" class="follow-btn">
                            Follow
                        </button>
                    ` : ''}
                </div>
                <div class="profile-posts">
                    <h3>Posts</h3>
                    <div class="feed">
                        ${posts.length > 0 ? posts.map(post => this.renderPost(post)).join('') : 
                          '<p style="text-align: center; color: #657786; padding: 2rem;">No posts yet</p>'}
                    </div>
                </div>
            </div>
        `;

        // Add event listener for follow button after rendering
        if (!isOwnProfile) {
            const followBtn = document.getElementById('followBtn');
            if (followBtn) {
                followBtn.addEventListener('click', () => {
                    this.toggleFollow(user.username);
                });
            }
        }

        // Add profile-specific styles if not already present
        if (!document.getElementById('profile-styles')) {
            const style = document.createElement('style');
            style.id = 'profile-styles';
            style.textContent = `
                .user-profile {
                    max-width: 600px;
                    margin: 2rem auto;
                    padding: 0 2rem;
                }
                .profile-header {
                    background-color: #192734;
                    border: 1px solid #2f3336;
                    border-radius: 15px;
                    padding: 2rem;
                    margin-bottom: 2rem;
                    text-align: center;
                }
                .profile-header h2 {
                    color: #ffffff;
                    margin-bottom: 1rem;
                }
                .profile-bio {
                    color: #657786;
                    margin-bottom: 1rem;
                }
                .profile-stats {
                    display: flex;
                    justify-content: center;
                    gap: 2rem;
                    margin-bottom: 1rem;
                }
                .profile-stats span {
                    color: #657786;
                }
                .profile-posts h3 {
                    color: #ffffff;
                    margin-bottom: 1rem;
                    padding-left: 1rem;
                }
                @media (max-width: 768px) {
                    .user-profile {
                        padding: 0 1rem;
                    }
                    .profile-stats {
                        gap: 1rem;
                    }
                    .profile-stats span {
                        font-size: 0.9rem;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    async toggleFollow(username) {
        const followBtn = document.getElementById('followBtn');
        const originalText = followBtn.textContent;
        followBtn.disabled = true;
        followBtn.textContent = 'Loading...';

        try {
            const response = await fetch(`/api/users/${username}/follow`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                followBtn.textContent = data.isFollowing ? 'Unfollow' : 'Follow';
                followBtn.className = `follow-btn ${data.isFollowing ? 'following' : ''}`;
                
                // Update current user stats and reload profile
                await this.getCurrentUser();
                this.loadProfile(username);
                
                this.showSuccess(data.isFollowing ? 'User followed!' : 'User unfollowed!');
            } else {
                const data = await response.json();
                this.showError(data.message || 'Failed to update follow status');
                followBtn.textContent = originalText;
            }
        } catch (error) {
            console.error('Toggle follow error:', error);
            this.showError('Failed to update follow status');
            followBtn.textContent = originalText;
        } finally {
            followBtn.disabled = false;
        }
    }

    // Utility methods
    formatTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showLoading() {
        document.getElementById('loading').style.display = 'block';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    hideMessages() {
        document.getElementById('errorMessage').style.display = 'none';
        document.getElementById('successMessage').style.display = 'none';
    }

    showError(message) {
        this.hideMessages();
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }

    showSuccess(message) {
        this.hideMessages();
        const successDiv = document.getElementById('successMessage');
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 3000);
    }

    // Health check method
    async checkConnection() {
        try {
            const response = await fetch('/api/health');
            if (response.ok) {
                const data = await response.json();
                console.log('Server status:', data);
                return true;
            }
        } catch (error) {
            console.error('Connection check failed:', error);
            this.showError('Unable to connect to server. Please check your connection.');
            return false;
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MicroBlogApp();
    
    // Check server connection on load
    window.app.checkConnection();
});

// Handle browser back/forward buttons
window.addEventListener('popstate', (event) => {
    if (window.app && window.app.currentUser) {
        window.app.showHome();
    }
});

// Handle network status changes
window.addEventListener('online', () => {
    if (window.app) {
        window.app.showSuccess('Connection restored');
        window.app.checkConnection();
    }
});

window.addEventListener('offline', () => {
    if (window.app) {
        window.app.showError('No internet connection');
    }
});