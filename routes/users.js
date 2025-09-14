const express = require('express');
const User = require('../models/User');
const Post = require('../models/Post');
const auth = require('../middleware/auth');

const router = express.Router();

// Search users
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.json([]);
    }

    const users = await User.find({
      username: { $regex: q.trim(), $options: 'i' }
    }).select('username bio').limit(10);

    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user profile
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('username bio followers following createdAt');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const posts = await Post.find({ author: user._id })
      .populate('author', 'username')
      .sort({ createdAt: -1 });

    res.json({
      user: {
        ...user.toObject(),
        followersCount: user.followers.length,
        followingCount: user.following.length,
        postsCount: posts.length
      },
      posts
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Follow/unfollow user
router.post('/:username/follow', auth, async (req, res) => {
  try {
    const userToFollow = await User.findOne({ username: req.params.username });
    
    if (!userToFollow) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (userToFollow._id.equals(req.user._id)) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    const currentUser = await User.findById(req.user._id);
    const isFollowing = currentUser.following.includes(userToFollow._id);

    if (isFollowing) {
      // Unfollow
      currentUser.following = currentUser.following.filter(id => !id.equals(userToFollow._id));
      userToFollow.followers = userToFollow.followers.filter(id => !id.equals(currentUser._id));
    } else {
      // Follow
      currentUser.following.push(userToFollow._id);
      userToFollow.followers.push(currentUser._id);
    }

    await currentUser.save();
    await userToFollow.save();

    res.json({ 
      isFollowing: !isFollowing,
      message: isFollowing ? 'Unfollowed successfully' : 'Followed successfully'
    });
  } catch (error) {
    console.error('Follow/unfollow error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;