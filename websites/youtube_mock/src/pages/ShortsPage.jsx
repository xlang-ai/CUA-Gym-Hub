
import React, { useState, useRef, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, MessageCircle, Share2, MoreVertical, ChevronUp, ChevronDown, X, ListPlus, EyeOff, Link as LinkIcon } from 'lucide-react';
import { useData } from '../context/DataContext';
import PlaylistModal from '../components/PlaylistModal';
import './ShortsPage.css';

const ShortsPage = () => {
  const { data, showToast, toggleSubscription, addComment } = useData();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedShorts, setLikedShorts] = useState([]);
  const [dislikedShorts, setDislikedShorts] = useState([]);
  const [hiddenShortIds, setHiddenShortIds] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const moreMenuRef = useRef(null);

  const shorts = (data.shorts || []).filter(s => !hiddenShortIds.includes(s.shortId));

  useEffect(() => {
    if (currentIndex >= shorts.length && shorts.length > 0) {
      setCurrentIndex(shorts.length - 1);
    }
  }, [shorts.length, currentIndex]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (shorts.length === 0) {
    return (
      <div className="shorts-page">
        <div className="shorts-empty">No Shorts available</div>
      </div>
    );
  }

  const currentShort = shorts[currentIndex];
  const isSubscribed = data.user.subscribedChannels.includes(currentShort.channelId);
  const shortComments = data.comments[currentShort.shortId] || [];

  const formatCount = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = now - date;
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor(diff / 60000);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const closeOverlays = () => {
    setShowComments(false);
    setShowMoreMenu(false);
    setCommentText('');
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      closeOverlays();
    }
  };

  const handleNext = () => {
    if (currentIndex < shorts.length - 1) {
      setCurrentIndex(currentIndex + 1);
      closeOverlays();
    }
  };

  const handleLike = (shortId) => {
    if (likedShorts.includes(shortId)) {
      setLikedShorts(likedShorts.filter(id => id !== shortId));
    } else {
      setLikedShorts([...likedShorts, shortId]);
      setDislikedShorts(dislikedShorts.filter(id => id !== shortId));
    }
  };

  const handleDislike = (shortId) => {
    if (dislikedShorts.includes(shortId)) {
      setDislikedShorts(dislikedShorts.filter(id => id !== shortId));
    } else {
      setDislikedShorts([...dislikedShorts, shortId]);
      setLikedShorts(likedShorts.filter(id => id !== shortId));
    }
  };

  const handleSubscribeClick = () => {
    toggleSubscription(currentShort.channelId);
    showToast(isSubscribed ? 'Unsubscribed' : 'Subscribed');
  };

  const handlePostComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    addComment(currentShort.shortId, trimmed);
    setCommentText('');
  };

  const handleNotInterested = () => {
    setHiddenShortIds(prev => [...prev, currentShort.shortId]);
    setShowMoreMenu(false);
    showToast('Not interested — you will see fewer videos like this');
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/shorts?v=${currentShort.shortId}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    setShowMoreMenu(false);
    showToast('Link copied');
  };

  return (
    <div className="shorts-page">
      <div className="shorts-container">
        <div className="shorts-nav">
          <button
            className="shorts-nav-btn"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            aria-label="Previous short"
          >
            <ChevronUp size={24} />
          </button>
        </div>

        <div className="shorts-viewer">
          <div className="shorts-card">
            <div className="shorts-video-area">
              <img
                src={currentShort.thumbnail}
                alt={currentShort.title}
                className="shorts-thumbnail"
              />
              <div className="shorts-overlay-info">
                <div className="shorts-channel-row">
                  <img src={currentShort.channelAvatar} alt="" className="shorts-channel-avatar" />
                  <span className="shorts-channel-name">{currentShort.channelName}</span>
                  <button
                    className={`shorts-subscribe-btn ${isSubscribed ? 'subscribed' : ''}`}
                    onClick={handleSubscribeClick}
                  >
                    {isSubscribed ? 'Subscribed' : 'Subscribe'}
                  </button>
                </div>
                <div className="shorts-title">{currentShort.title}</div>
              </div>

              {showComments && (
                <div className="shorts-comments-panel">
                  <div className="shorts-comments-header">
                    <span>Comments · {shortComments.length || currentShort.commentCount}</span>
                    <button className="shorts-comments-close" onClick={() => setShowComments(false)} aria-label="Close comments">
                      <X size={18} />
                    </button>
                  </div>
                  <div className="shorts-comments-list">
                    {shortComments.length === 0 && (
                      <div className="shorts-comments-empty">No comments yet. Be the first to comment.</div>
                    )}
                    {shortComments.map(comment => (
                      <div key={comment.commentId} className="shorts-comment-item">
                        <img src={comment.userAvatar} alt={comment.userName} className="shorts-comment-avatar" />
                        <div>
                          <div className="shorts-comment-meta">
                            <span className="shorts-comment-author">{comment.userName}</span>
                            <span className="shorts-comment-time">{formatTimeAgo(comment.timestamp)}</span>
                          </div>
                          <div className="shorts-comment-text">{comment.text}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="shorts-comments-input-row">
                    <img src={data.user.avatar} alt={data.user.displayName} className="shorts-comment-avatar" />
                    <input
                      type="text"
                      className="shorts-comment-input"
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handlePostComment(); }}
                    />
                    <button
                      className="shorts-comment-post"
                      disabled={!commentText.trim()}
                      onClick={handlePostComment}
                    >
                      Post
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="shorts-actions-bar">
              <button
                className={`shorts-action-btn ${likedShorts.includes(currentShort.shortId) ? 'active' : ''}`}
                onClick={() => handleLike(currentShort.shortId)}
              >
                <ThumbsUp size={24} />
                <span>{formatCount(currentShort.likeCount + (likedShorts.includes(currentShort.shortId) ? 1 : 0))}</span>
              </button>
              <button
                className={`shorts-action-btn ${dislikedShorts.includes(currentShort.shortId) ? 'active' : ''}`}
                onClick={() => handleDislike(currentShort.shortId)}
              >
                <ThumbsDown size={24} />
                <span>Dislike</span>
              </button>
              <button
                className={`shorts-action-btn ${showComments ? 'active' : ''}`}
                onClick={() => setShowComments(prev => !prev)}
              >
                <MessageCircle size={24} />
                <span>{formatCount(shortComments.length || currentShort.commentCount)}</span>
              </button>
              <button className="shorts-action-btn" onClick={() => { navigator.clipboard.writeText(window.location.href).catch(() => {}); showToast('Link copied'); }}>
                <Share2 size={24} />
                <span>Share</span>
              </button>
              <div className="shorts-more-wrapper" ref={moreMenuRef}>
                <button className="shorts-action-btn" onClick={() => setShowMoreMenu(prev => !prev)}>
                  <MoreVertical size={24} />
                </button>
                {showMoreMenu && (
                  <div className="dropdown-menu shorts-more-menu">
                    <div className="dropdown-item" onClick={() => { setShowPlaylistModal(true); setShowMoreMenu(false); }}>
                      <ListPlus size={18} />
                      <span>Save to playlist</span>
                    </div>
                    <div className="dropdown-item" onClick={handleNotInterested}>
                      <EyeOff size={18} />
                      <span>Not interested</span>
                    </div>
                    <div className="dropdown-item" onClick={handleCopyLink}>
                      <LinkIcon size={18} />
                      <span>Copy link</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="shorts-sound-btn">
                <img src={currentShort.channelAvatar} alt="" className="shorts-sound-avatar" />
              </div>
            </div>
          </div>
        </div>

        <div className="shorts-nav">
          <button
            className="shorts-nav-btn"
            onClick={handleNext}
            disabled={currentIndex >= shorts.length - 1}
            aria-label="Next short"
          >
            <ChevronDown size={24} />
          </button>
        </div>
      </div>

      <div className="shorts-indicator">
        {currentIndex + 1} / {shorts.length}
      </div>

      <PlaylistModal
        isOpen={showPlaylistModal}
        onClose={() => setShowPlaylistModal(false)}
        videoId={currentShort.shortId}
      />
    </div>
  );
};

export default ShortsPage;
