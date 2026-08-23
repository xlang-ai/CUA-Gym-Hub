
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Search, Mic, Bell, User, Settings, LogOut, Moon, Sun, Video, Upload } from 'lucide-react';
import { useData } from '../context/DataContext';
import './Header.css';

const YouTubeLogo = () => (
  <svg viewBox="0 0 90 20" preserveAspectRatio="xMidYMid meet" style={{ width: 90, height: 20 }}>
    <g>
      <path d="M27.9727 3.12324C27.6435 1.89323 26.6768 0.926623 25.4468 0.597366C23.2197 2.24288e-07 14.285 0 14.285 0C14.285 0 5.35042 2.24288e-07 3.12323 0.597366C1.89323 0.926623 0.926623 1.89323 0.597366 3.12324C2.24288e-07 5.35042 0 10 0 10C0 10 2.24288e-07 14.6496 0.597366 16.8768C0.926623 18.1068 1.89323 19.0734 3.12323 19.4026C5.35042 20 14.285 20 14.285 20C14.285 20 23.2197 20 25.4468 19.4026C26.6768 19.0734 27.6435 18.1068 27.9727 16.8768C28.5701 14.6496 28.5701 10 28.5701 10C28.5701 10 28.5677 5.35042 27.9727 3.12324Z" fill="#FF0000"/>
      <path d="M11.4253 14.2854L18.8477 10.0004L11.4253 5.71533V14.2854Z" fill="white"/>
    </g>
    <g style={{ fill: 'var(--text-primary)' }}>
      <path d="M34.6024 13.0036L31.3945 1.41846H34.1932L35.3174 6.6701C35.6043 7.96361 35.8136 9.06662 35.95 9.97913H36.0323C36.1264 9.32532 36.3381 8.22937 36.665 6.68093L37.8291 1.41846H40.6278L37.3799 13.0036V18.561H34.6001V13.0036H34.6024Z"/>
      <path d="M41.4697 18.1937C40.9053 17.8127 40.5031 17.22 40.2632 16.4157C40.0257 15.6114 39.9058 14.5765 39.9058 13.3092V11.3747C39.9058 10.0982 40.0422 9.05557 40.315 8.24494C40.5878 7.43431 41.0135 6.8345 41.5921 6.44531C42.1707 6.05765 42.9302 5.86229 43.8672 5.86229C44.7878 5.86229 45.5355 6.0623 46.1094 6.46233C46.6833 6.86236 47.1042 7.46653 47.3723 8.27716C47.6404 9.08779 47.7744 10.1199 47.7744 11.3747V13.3092C47.7744 14.5765 47.6499 15.6161 47.4006 16.4251C47.1513 17.2341 46.7491 17.8268 46.1846 18.2031C45.6201 18.5765 44.8724 18.7665 43.9401 18.7665C42.9725 18.7665 42.1942 18.5765 41.4697 18.1937ZM44.6353 16.2323C44.7623 15.8687 44.8282 15.326 44.8282 14.6036V10.0511C44.8282 9.36616 44.7623 8.84003 44.6353 8.47292C44.5765 8.28834 44.4828 8.14644 44.3552 8.04624C44.2276 7.94604 44.0848 7.89594 43.9272 7.89594C43.7697 7.89594 43.6293 7.94604 43.5017 8.04624C43.374 8.14644 43.2804 8.28834 43.2215 8.47292C43.0945 8.84003 43.0286 9.36616 43.0286 10.0511V14.6036C43.0286 15.326 43.0945 15.8687 43.2215 16.2323C43.3463 16.5959 43.5864 16.7788 43.9401 16.7788C44.2937 16.7788 44.5765 16.5959 44.6353 16.2323Z"/>
      <path d="M52.2775 7.94148C52.5953 8.52706 52.7542 9.36878 52.7542 10.4666V18.5765H50.3943L50.17 17.0345H50.1277C49.5491 18.1913 48.7284 18.7665 47.6652 18.7665C46.9055 18.7665 46.3388 18.4819 45.9649 17.9104C45.5934 17.3412 45.4076 16.4727 45.4076 15.3047V7.22998H48.1867V15.0517C48.1867 15.6931 48.2409 16.1491 48.3491 16.4157C48.4574 16.6847 48.6291 16.8192 48.8644 16.8192C49.0592 16.8192 49.2516 16.7499 49.4394 16.609C49.6271 16.4704 49.7754 16.2953 49.8836 16.0874V7.22998H52.6627V7.22998H52.2775V7.94148Z"/>
    </g>
  </svg>
);

const Header = ({ onMenuClick, theme, onThemeToggle }) => {
  const navigate = useNavigate();
  const { data, markNotificationAsRead, markAllNotificationsAsRead, showToast, addToSearchHistory } = useData();
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const createMenuRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);
  const voiceTimeoutRef = useRef(null);

  const trimmedSearch = searchQuery.trim().toLowerCase();
  const searchSuggestions = trimmedSearch
    ? [
        ...data.videos
          .filter(video => video.title.toLowerCase().includes(trimmedSearch))
          .map(video => video.title),
        ...(data.user.searchHistory || []).filter(query => query.toLowerCase().includes(trimmedSearch))
      ]
        .filter((suggestion, index, list) => list.indexOf(suggestion) === index)
        .slice(0, 8)
    : [];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (createMenuRef.current && !createMenuRef.current.contains(event.target)) {
        setShowCreateMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => clearTimeout(voiceTimeoutRef.current);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      addToSearchHistory(searchQuery.trim());
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchFocused(false);
    }
  };

  const handleVoiceSearch = () => {
    if (voiceListening) return;
    setVoiceListening(true);
    voiceTimeoutRef.current = setTimeout(() => {
      const topVideo = [...data.videos].sort((a, b) => b.viewCount - a.viewCount)[0];
      const query = topVideo ? topVideo.title : 'trending videos';
      setSearchQuery(query);
      addToSearchHistory(query);
      setVoiceListening(false);
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }, 1200);
  };

  const unreadCount = data.notifications.filter(n => !n.isRead).length;

  const handleNotificationClick = (notification) => {
    markNotificationAsRead(notification.notificationId);
    if (notification.videoId) {
      navigate(`/watch/${notification.videoId}`);
      setShowNotifications(false);
    }
  };

  const selectSuggestion = (suggestion) => {
    setSearchQuery(suggestion);
    addToSearchHistory(suggestion);
    navigate(`/search?q=${encodeURIComponent(suggestion)}`);
    setSearchFocused(false);
  };

  const renderNotificationText = (notif) => {
    if (notif.type === 'comment_reply') {
      return (
        <>
          <strong>{notif.commenterName || notif.channelName}</strong> replied: {notif.commentSnippet || notif.videoTitle}
        </>
      );
    }
    if (notif.type === 'milestone') {
      return (
        <>
          <strong>{notif.channelName}</strong> reached {notif.milestone || 'a subscriber milestone'}
        </>
      );
    }
    return (
      <>
        <strong>{notif.channelName}</strong> uploaded: {notif.videoTitle}
      </>
    );
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="header-icon-btn" onClick={onMenuClick} aria-label="Menu">
          <Menu size={24} />
        </button>
        <Link to="/" className="logo">
          <YouTubeLogo />
        </Link>
      </div>

      <div className="header-center">
        <form className="search-form" onSubmit={handleSearch}>
          <div className={`search-container ${searchFocused ? 'focused' : ''}`}>
            {searchFocused && (
              <div className="search-icon-left">
                <Search size={20} />
              </div>
            )}
            <input
              type="text"
              className="search-input"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => window.setTimeout(() => setSearchFocused(false), 120)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchFocused(false);
                }
              }}
            />
            <button type="submit" className="search-button" aria-label="Search">
              <Search size={20} />
            </button>
          </div>
          {searchFocused && searchSuggestions.length > 0 && (
            <div className="search-suggestions">
              {searchSuggestions.map((suggestion) => (
                <button
                  type="button"
                  key={suggestion}
                  className="search-suggestion"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    selectSuggestion(suggestion);
                  }}
                >
                  <Search size={18} />
                  <span>{suggestion}</span>
                </button>
              ))}
            </div>
          )}
        </form>
        <div className="voice-button-wrapper">
          <button
            className={`voice-button ${voiceListening ? 'listening' : ''}`}
            aria-label="Voice search"
            title="Search with your voice"
            onClick={handleVoiceSearch}
          >
            <Mic size={20} />
          </button>
          {voiceListening && (
            <div className="voice-search-overlay">
              <div className="voice-search-pulse">
                <Mic size={28} />
              </div>
              <span>Listening…</span>
            </div>
          )}
        </div>
      </div>

      <div className="header-right">
        <div className="header-right-btn-group" ref={createMenuRef}>
          <button
            className="header-icon-btn create-btn"
            aria-label="Create"
            onClick={() => { setShowCreateMenu(!showCreateMenu); setShowNotifications(false); setShowUserMenu(false); }}
          >
            <svg height="24" viewBox="0 0 24 24" width="24" fill="currentColor">
              <path d="M14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2zm3-7H3v12h14v-6.39l4 1.83V8.56l-4 1.83V6m1-1v3.83L22 7v10l-4-1.83V19H2V5h16z"/>
            </svg>
          </button>
          {showCreateMenu && (
            <div className="dropdown-menu" style={{ right: 0, minWidth: 200 }}>
              <div
                className="dropdown-item"
                onClick={() => { navigate('/upload'); showToast('Upload page opened'); setShowCreateMenu(false); }}
              >
                <Upload size={20} />
                <span>Upload video</span>
              </div>
              <div
                className="dropdown-item"
                onClick={() => { showToast('Live streaming started'); setShowCreateMenu(false); }}
              >
                <Video size={20} />
                <span>Go live</span>
              </div>
            </div>
          )}
        </div>

        <div className="header-right-btn-group" ref={notifRef}>
          <button
            className="header-icon-btn"
            onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); setShowCreateMenu(false); }}
            aria-label="Notifications"
          >
            <Bell size={24} />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {showNotifications && (
            <div className="notifications-panel">
              <div className="notifications-header">
                <h3>Notifications</h3>
                <button
                  className="notifications-mark-read"
                  onClick={() => markAllNotificationsAsRead()}
                >
                  Mark all as read
                </button>
              </div>
              <div className="notifications-list">
                {data.notifications.length === 0 ? (
                  <div className="notifications-empty">
                    <Bell size={48} />
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  data.notifications.map(notif => (
                    <div
                      key={notif.notificationId}
                      className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      {!notif.isRead && <div className="notification-dot" />}
                      <img
                        src={notif.channelAvatar}
                        alt={notif.channelName}
                        className="notification-avatar"
                      />
                      <div className="notification-content">
                        <div className="notification-text">
                          {renderNotificationText(notif)}
                        </div>
                        <div className="notification-time">{formatTime(notif.timestamp)}</div>
                      </div>
                      {notif.videoThumbnail && (
                        <img
                          src={notif.videoThumbnail}
                          alt=""
                          className="notification-thumbnail"
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="header-right-btn-group" ref={userMenuRef}>
          <button
            className="avatar-btn"
            onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); setShowCreateMenu(false); }}
            aria-label="Account menu"
          >
            <img
              src={data.user.avatar}
              alt={data.user.displayName}
              className="user-avatar"
            />
          </button>

          {showUserMenu && (
            <div className="dropdown-menu user-menu">
              <div className="user-menu-header">
                <img src={data.user.avatar} alt={data.user.displayName} className="user-menu-avatar" />
                <div className="user-menu-info">
                  <div className="user-menu-name">{data.user.displayName}</div>
                  <div className="user-menu-handle">{data.user.handle}</div>
                  <Link to={`/channel/${data.user.userId}`} className="user-menu-channel-link" onClick={() => setShowUserMenu(false)}>
                    View your channel
                  </Link>
                </div>
              </div>
              <div className="dropdown-divider" />
              <Link to={`/channel/${data.user.userId}`} className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                <User size={20} />
                <span>Your channel</span>
              </Link>
              <Link to="/settings" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                <Settings size={20} />
                <span>Settings</span>
              </Link>
              <div className="dropdown-divider" />
              <div className="dropdown-item" onClick={onThemeToggle}>
                {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                <span>Appearance: {theme === 'dark' ? 'Dark' : 'Light'}</span>
              </div>
              <div className="dropdown-divider" />
              <div
                className="dropdown-item"
                onClick={() => { showToast('Sign out is not available in demo mode'); setShowUserMenu(false); }}
              >
                <LogOut size={20} />
                <span>Sign out</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
