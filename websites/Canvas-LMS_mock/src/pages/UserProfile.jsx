import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Bell, Mail, BookOpen, Save, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import './UserProfile.css';

const ROLE_LABELS = {
  teacher: 'Teacher',
  student: 'Student',
  ta: 'TA',
  admin: 'Admin',
};

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export default function UserProfile() {
  const navigate = useNavigate();
  const { state, setState } = useAppContext();
  const user = state.currentUser;

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user.short_name || '');
  const [pronouns, setPronouns] = useState(user.pronouns || '');
  const [bio, setBio] = useState(user.bio || '');

  const enrolledCourses = state.enrollments
    .filter(e => e.user_id === user.id)
    .map(e => ({
      enrollment: e,
      course: state.courses.find(c => c.id === e.course_id),
    }))
    .filter(x => x.course);

  const startEditing = () => {
    setDisplayName(user.short_name || '');
    setPronouns(user.pronouns || '');
    setBio(user.bio || '');
    setEditing(true);
  };

  const handleSave = () => {
    const nextShortName = displayName.trim() || user.short_name;
    const nextPronouns = pronouns.trim();
    const nextBio = bio;
    setState(prev => ({
      ...prev,
      currentUser: {
        ...prev.currentUser,
        short_name: nextShortName,
        pronouns: nextPronouns,
        bio: nextBio,
      },
      users: prev.users.map(u =>
        u.id === prev.currentUser.id
          ? { ...u, short_name: nextShortName, pronouns: nextPronouns, bio: nextBio }
          : u
      ),
    }));
    setEditing(false);
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar">{user.name.charAt(0)}</div>
        <div className="profile-identity">
          <h1>{user.name}</h1>
          <div className="profile-subline">
            <span className="profile-display-name">{user.short_name}</span>
            {user.pronouns && <span className="profile-pronouns">({user.pronouns})</span>}
            <span className="profile-role-badge">{ROLE_LABELS[user.role] || user.role}</span>
          </div>
          <div className="profile-email"><Mail size={14} /> {user.email}</div>
        </div>
        <div className="profile-header-actions">
          {!editing && (
            <button className="btn btn-primary" onClick={startEditing}>Edit Profile</button>
          )}
          <button className="btn btn-secondary" onClick={() => navigate('/profile/settings')}>
            <Settings size={14} /> Account Settings
          </button>
        </div>
      </div>

      <div className="profile-section">
        <h2>About</h2>
        {editing ? (
          <div className="profile-edit-form">
            <div className="profile-field">
              <label className="profile-label" htmlFor="profile-display-name">Display Name</label>
              <input
                id="profile-display-name"
                className="profile-input"
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
              />
            </div>
            <div className="profile-field">
              <label className="profile-label" htmlFor="profile-pronouns">Pronouns</label>
              <input
                id="profile-pronouns"
                className="profile-input"
                type="text"
                value={pronouns}
                onChange={e => setPronouns(e.target.value)}
                placeholder="e.g. She/Her"
              />
            </div>
            <div className="profile-field">
              <label className="profile-label" htmlFor="profile-bio">Biography</label>
              <textarea
                id="profile-bio"
                className="profile-input"
                rows={4}
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Tell people about yourself"
              />
            </div>
            <div className="profile-edit-actions">
              <button className="btn btn-secondary" onClick={() => setEditing(false)}>
                <X size={14} /> Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                <Save size={14} /> Save Profile
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="profile-bio">{user.bio ? user.bio : 'No biography yet.'}</p>
            <dl className="profile-meta">
              <div className="profile-meta-row">
                <dt>Sortable Name</dt>
                <dd>{user.sortable_name}</dd>
              </div>
              <div className="profile-meta-row">
                <dt>Time Zone</dt>
                <dd>{user.time_zone || 'America/New_York'}</dd>
              </div>
              <div className="profile-meta-row">
                <dt>Language</dt>
                <dd>{user.locale || 'English (US)'}</dd>
              </div>
              <div className="profile-meta-row">
                <dt>Last Login</dt>
                <dd>{formatDateTime(user.last_login)}</dd>
              </div>
            </dl>
          </>
        )}
      </div>

      <div className="profile-section">
        <h2>Enrollments</h2>
        {enrolledCourses.length === 0 ? (
          <p className="profile-empty">You are not enrolled in any courses.</p>
        ) : (
          <ul className="profile-enrollment-list">
            {enrolledCourses.map(({ enrollment, course }) => (
              <li key={enrollment.id} className="profile-enrollment-item">
                <span className="profile-course-dot" style={{ background: course.color }} />
                <button
                  className="profile-course-link"
                  onClick={() => navigate(`/courses/${course.id}`)}
                >
                  <BookOpen size={14} /> {course.name}
                </button>
                <span className="profile-enrollment-meta">
                  {course.course_code} · {enrollment.type.replace('Enrollment', '')} · {enrollment.enrollment_state}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="profile-section">
        <h2>Preferences</h2>
        <div className="profile-links">
          <button className="profile-inline-link" onClick={() => navigate('/profile/settings')}>
            <Settings size={14} /> Account Settings
          </button>
          <button className="profile-inline-link" onClick={() => navigate('/notifications')}>
            <Bell size={14} /> Notification Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
