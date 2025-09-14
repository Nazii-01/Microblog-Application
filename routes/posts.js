const express = require('express');
const Post = require('../models/Post');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Create post
router.post('/', auth, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Content is required' });
    }

    if (content.trim().length > 280) {
      return res.status(400).json({ message: 'Content must be 280 characters or less' });
    }

    const post = new Post({
      content: content.trim(),
      author: req.user._id
    });

    await post.save();
    await post.populate('author', 'username');

    res.status(201).json(post);
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get feed (posts from followed users + own posts)
router.get('/feed', auth, async (req, res) => {
  try {
    // Get current user with populated following array
    const currentUser = await User.findById(req.user._id).populate('following');
    const followingIds = currentUser.following.map(user => user._id);
    
    // Include own posts in feed
    followingIds.push(req.user._id);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ author: { $in: followingIds } })
      .populate('author', 'username bio')
      .populate('likes', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Transform posts to include like status for current user
    const transformedPosts = posts.map(post => ({
      ...post.toObject(),
      isLiked: post.likes.some(like => like._id.toString() === req.user._id.toString()),
      likesCount: post.likes.length
    }));

    res.json(transformedPosts);
  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all posts (public timeline)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .populate('author', 'username bio')
      .populate('likes', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Transform posts to include likes count
    const transformedPosts = posts.map(post => ({
      ...post.toObject(),
      likesCount: post.likes.length
    }));

    res.json(transformedPosts);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single post
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username bio')
      .populate('likes', 'username');
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const transformedPost = {
      ...post.toObject(),
      likesCount: post.likes.length
    };

    res.json(transformedPost);
  } catch (error) {
    console.error('Get post error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid post ID' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Like/unlike post
router.post('/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const userId = req.user._id;
    const isLiked = post.likes.includes(userId);
    
    if (isLiked) {
      // Unlike the post
      post.likes = post.likes.filter(id => !id.equals(userId));
    } else {
      // Like the post
      post.likes.push(userId);
    }

    await post.save();
    await post.populate('author', 'username bio');

    const transformedPost = {
      ...post.toObject(),
      isLiked: !isLiked,
      likesCount: post.likes.length
    };

    res.json(transformedPost);
  } catch (error) {
    console.error('Toggle like error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid post ID' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete post
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user is the author or admin
    if (!post.author.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid post ID' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get posts by user
router.get('/user/:userId', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ author: req.params.userId })
      .populate('author', 'username bio')
      .populate('likes', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const transformedPosts = posts.map(post => ({
      ...post.toObject(),
      likesCount: post.likes.length
    }));

    res.json(transformedPosts);
  } catch (error) {
    console.error('Get user posts error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;