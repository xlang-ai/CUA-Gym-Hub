import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Users, Calendar, MessageSquare, HelpCircle, User, Settings, Bell, Search, MessageCircle, Send, CheckCircle2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import './GlobalNav.css';

const NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { id: 'courses', icon: BookOpen, label: 'Courses', path: null },
  { id: 'groups', icon: Users, label: 'Groups', path: '/groups' },
  { id: 'calendar', icon: Calendar, label: 'Calendar', path: '/calendar' },
  { id: 'inbox', icon: MessageSquare, label: 'Inbox', path: '/conversations' },
];

const GUIDE_ARTICLES = [
  { q: 'How do I submit an assignment?', a: 'Go to the assignment page in your course and use the submission type shown (file upload, text entry, etc.) before the due date.' },
  { q: 'How do I view my grades?', a: 'Open your course and select Grades from the course navigation to see scored and pending assignments.' },
  { q: 'How do I message my instructor?', a: 'Use the Inbox from the global navigation to start a new conversation with your instructor or classmates.' },
  { q: 'How do I join a course?', a: 'Courses you are enrolled in appear automatically on your Dashboard and under Courses once your instructor publishes the course.' },
  { q: 'How do I check upcoming due dates?', a: 'The Calendar and your Dashboard "To Do" list show upcoming assignments across all of your courses.' },
];

export default function GlobalNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, setState } = useAppContext();
  const [accountOpen, setAccountOpen] = useState(false);
  const [coursesOpen, setCoursesOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpView, setHelpView] = useState('menu'); // 'menu' | 'search' | 'report' | 'reported'
  const [guideQuery, setGuideQuery] = useState('');
  const [reportSubject, setReportSubject] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const accountRef = useRef(null);
  const coursesRef = useRef(null);
  const helpRef = useRef(null);

  const unreadCount = state.conversations.filter(c => c.workflow_state === 'unread').length;

  const activeCourses = state.courses.filter(c => c.workflow_state === 'available');

  const isActive = (id) => {
    if (id === 'dashboard') return location.pathname === '/dashboard' || location.pathname === '/';
    if (id === 'courses') return location.pathname.startsWith('/courses');
    if (id === 'calendar') return location.pathname === '/calendar';
    if (id === 'inbox') return location.pathname === '/conversations';
    if (id === 'groups') return location.pathname === '/groups';
    return false;
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) setAccountOpen(false);
      if (coursesRef.current && !coursesRef.current.contains(e.target)) setCoursesOpen(false);
      if (helpRef.current && !helpRef.current.contains(e.target)) {
        setHelpOpen(false);
        setHelpView('menu');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSubmitReport = (e) => {
    e.preventDefault();
    if (!reportSubject.trim()) return;
    const newId = Math.max(0, ...(state.supportTickets || []).map(t => t.id)) + 1;
    setState(prev => ({
      ...prev,
      supportTickets: [
        ...(prev.supportTickets || []),
        {
          id: newId,
          subject: reportSubject.trim(),
          details: reportDetails.trim(),
          submitted_by: state.currentUser.name,
          submitted_at: new Date().toISOString(),
          status: 'open',
        },
      ],
    }));
    setReportSubject('');
    setReportDetails('');
    setHelpView('reported');
  };

  const handleNavClick = (item) => {
    if (item.id === 'courses') {
      setCoursesOpen(!coursesOpen);
      setAccountOpen(false);
    } else if (item.path) {
      navigate(item.path);
      setAccountOpen(false);
      setCoursesOpen(false);
    }
  };

  return (
    <nav className="global-nav">
      {/* Logo */}
      <button className="nav-item nav-logo" onClick={() => navigate('/dashboard')}>
        <div className="canvas-logo">
          <svg viewBox="0 0 32 32" width="28" height="28">
            <circle cx="16" cy="16" r="15" fill="#E74C3C" />
            <text x="16" y="22" textAnchor="middle" fill="white" fontSize="18" fontWeight="700" fontFamily="Lato, sans-serif">C</text>
          </svg>
        </div>
      </button>

      {/* Account */}
      <div className="nav-item-wrapper" ref={accountRef}>
        <button
          className={`nav-item ${accountOpen ? 'active' : ''}`}
          onClick={() => { setAccountOpen(!accountOpen); setCoursesOpen(false); }}
        >
          <div className="nav-avatar">
            {state.currentUser.name.charAt(0)}
          </div>
          <span className="nav-label">Account</span>
        </button>
        {accountOpen && (
          <div className="nav-flyout account-flyout">
            <div className="flyout-header">
              <div className="flyout-avatar">{state.currentUser.name.charAt(0)}</div>
              <div>
                <div className="flyout-name">{state.currentUser.name}</div>
                <div className="flyout-email">{state.currentUser.email}</div>
              </div>
            </div>
            <div className="flyout-divider" />
            <button className="flyout-item" onClick={() => { setAccountOpen(false); navigate('/profile'); }}>
              <User size={16} /> Profile
            </button>
            <button className="flyout-item" onClick={() => { setAccountOpen(false); navigate('/profile/settings'); }}>
              <Settings size={16} /> Settings
            </button>
            <button className="flyout-item" onClick={() => { setAccountOpen(false); navigate('/notifications'); }}>
              <Bell size={16} /> Notifications
            </button>
          </div>
        )}
      </div>

      {/* Main nav items */}
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        if (item.id === 'courses') {
          return (
            <div className="nav-item-wrapper" key={item.id} ref={coursesRef}>
              <button
                className={`nav-item ${isActive(item.id) ? 'active' : ''}`}
                onClick={() => handleNavClick(item)}
              >
                <div className="nav-icon-wrap">
                  <Icon size={22} />
                </div>
                <span className="nav-label">{item.label}</span>
              </button>
              {coursesOpen && (
                <div className="nav-flyout courses-flyout">
                  <div className="flyout-title">Courses</div>
                  {activeCourses.slice(0, 7).map(course => (
                    <button
                      key={course.id}
                      className="flyout-item flyout-course-item"
                      onClick={() => { setCoursesOpen(false); navigate(`/courses/${course.id}`); }}
                    >
                      <span className="course-dot" style={{ background: course.color }} />
                      <span className="course-name-text">{course.name}</span>
                    </button>
                  ))}
                  <div className="flyout-divider" />
                  <button
                    className="flyout-item flyout-all-courses"
                    onClick={() => { setCoursesOpen(false); navigate('/courses'); }}
                  >
                    All Courses
                  </button>
                </div>
              )}
            </div>
          );
        }

        return (
          <button
            key={item.id}
            className={`nav-item ${isActive(item.id) ? 'active' : ''}`}
            onClick={() => handleNavClick(item)}
          >
            <div className="nav-icon-wrap">
              <Icon size={22} />
              {item.id === 'inbox' && unreadCount > 0 && (
                <span className="nav-badge">{unreadCount}</span>
              )}
            </div>
            <span className="nav-label">{item.label}</span>
          </button>
        );
      })}

      {/* Spacer */}
      <div className="nav-spacer" />

      {/* Help */}
      <div className="nav-item-wrapper" ref={helpRef}>
        <button
          className={`nav-item ${helpOpen ? 'active' : ''}`}
          onClick={() => { setHelpOpen(!helpOpen); setHelpView('menu'); setAccountOpen(false); setCoursesOpen(false); }}
        >
          <div className="nav-icon-wrap">
            <HelpCircle size={22} />
          </div>
          <span className="nav-label">Help</span>
        </button>
        {helpOpen && (
          <div className="nav-flyout help-flyout">
            {helpView === 'menu' && (
              <>
                <div className="flyout-title">Help</div>
                <button className="flyout-item" onClick={() => setHelpView('search')}>
                  <Search size={16} /> Search the Canvas Guides
                </button>
                <button className="flyout-item" onClick={() => setHelpView('report')}>
                  <MessageCircle size={16} /> Report a Problem
                </button>
              </>
            )}
            {helpView === 'search' && (
              <div className="help-panel">
                <div className="help-panel-header">
                  <button className="help-back-link" onClick={() => setHelpView('menu')}>&larr; Back</button>
                </div>
                <input
                  className="help-search-input"
                  type="text"
                  autoFocus
                  placeholder="Search guides…"
                  value={guideQuery}
                  onChange={(e) => setGuideQuery(e.target.value)}
                />
                <div className="help-guide-results">
                  {GUIDE_ARTICLES.filter(g => g.q.toLowerCase().includes(guideQuery.toLowerCase())).map((g, i) => (
                    <div key={i} className="help-guide-item">
                      <div className="help-guide-q">{g.q}</div>
                      <div className="help-guide-a">{g.a}</div>
                    </div>
                  ))}
                  {guideQuery && GUIDE_ARTICLES.filter(g => g.q.toLowerCase().includes(guideQuery.toLowerCase())).length === 0 && (
                    <div className="help-guide-empty">No guides matched "{guideQuery}".</div>
                  )}
                </div>
              </div>
            )}
            {helpView === 'report' && (
              <form className="help-panel" onSubmit={handleSubmitReport}>
                <div className="help-panel-header">
                  <button type="button" className="help-back-link" onClick={() => setHelpView('menu')}>&larr; Back</button>
                </div>
                <div className="help-field">
                  <label>Subject</label>
                  <input
                    className="help-search-input" type="text" autoFocus
                    value={reportSubject} onChange={(e) => setReportSubject(e.target.value)}
                    placeholder="Briefly describe the problem"
                  />
                </div>
                <div className="help-field">
                  <label>Details</label>
                  <textarea
                    className="help-search-input" rows={3}
                    value={reportDetails} onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="What were you trying to do?"
                  />
                </div>
                <button type="submit" className="btn btn-success help-submit-btn" disabled={!reportSubject.trim()}>
                  <Send size={14} /> Submit
                </button>
              </form>
            )}
            {helpView === 'reported' && (
              <div className="help-panel help-reported">
                <CheckCircle2 size={28} color="var(--success, #0B874B)" />
                <div className="help-reported-text">Thanks — your report has been logged for the sandbox admins.</div>
                <button className="flyout-item flyout-all-courses" onClick={() => { setHelpOpen(false); setHelpView('menu'); }}>
                  Close
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
