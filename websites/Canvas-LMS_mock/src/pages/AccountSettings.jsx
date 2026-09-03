import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Bell, User, CheckCircle2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import './AccountSettings.css';

const TIME_ZONES = [
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'UTC', label: 'UTC' },
];

const LANGUAGES = [
  { value: 'English (US)', label: 'English (US)' },
  { value: 'English (UK)', label: 'English (UK)' },
  { value: 'Español', label: 'Español' },
  { value: 'Français', label: 'Français' },
  { value: '中文 (简体)', label: '中文 (简体)' },
];

export default function AccountSettings() {
  const navigate = useNavigate();
  const { state, setState } = useAppContext();
  const user = state.currentUser;

  const [fullName, setFullName] = useState(user.name || '');
  const [displayName, setDisplayName] = useState(user.short_name || '');
  const [sortableName, setSortableName] = useState(user.sortable_name || '');
  const [email, setEmail] = useState(user.email || '');
  const [pronouns, setPronouns] = useState(user.pronouns || '');
  const [timeZone, setTimeZone] = useState(user.time_zone || 'America/New_York');
  const [locale, setLocale] = useState(user.locale || 'English (US)');
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    const next = {
      name: fullName.trim() || user.name,
      short_name: displayName.trim() || user.short_name,
      sortable_name: sortableName.trim() || user.sortable_name,
      email: email.trim() || user.email,
      pronouns: pronouns.trim(),
      time_zone: timeZone,
      locale,
    };
    setState(prev => ({
      ...prev,
      currentUser: { ...prev.currentUser, ...next },
      users: prev.users.map(u =>
        u.id === prev.currentUser.id
          ? {
              ...u,
              name: next.name,
              short_name: next.short_name,
              sortable_name: next.sortable_name,
              email: next.email,
              pronouns: next.pronouns,
            }
          : u
      ),
    }));
    setSaved(true);
  };

  return (
    <div className="acct-settings-page">
      <div className="acct-settings-header">
        <Settings size={24} />
        <div>
          <h1>Account Settings</h1>
          <p className="acct-settings-desc">Update the name, contact details, and locale used across your Xanvas account.</p>
        </div>
      </div>

      <form className="acct-settings-form" onSubmit={handleSave}>
        <div className="acct-settings-card">
          <h2>Profile</h2>
          <div className="acct-field">
            <label className="acct-label" htmlFor="acct-full-name">Full Name</label>
            <input
              id="acct-full-name" className="acct-input" type="text"
              value={fullName}
              onChange={e => { setFullName(e.target.value); setSaved(false); }}
            />
            <div className="acct-hint">This name appears in the gradebook and on your submissions.</div>
          </div>
          <div className="acct-field">
            <label className="acct-label" htmlFor="acct-display-name">Display Name</label>
            <input
              id="acct-display-name" className="acct-input" type="text"
              value={displayName}
              onChange={e => { setDisplayName(e.target.value); setSaved(false); }}
            />
            <div className="acct-hint">People will see this name in discussions and the inbox.</div>
          </div>
          <div className="acct-field">
            <label className="acct-label" htmlFor="acct-sortable-name">Sortable Name</label>
            <input
              id="acct-sortable-name" className="acct-input" type="text"
              value={sortableName}
              onChange={e => { setSortableName(e.target.value); setSaved(false); }}
            />
          </div>
          <div className="acct-field">
            <label className="acct-label" htmlFor="acct-pronouns">Pronouns</label>
            <input
              id="acct-pronouns" className="acct-input" type="text"
              value={pronouns}
              onChange={e => { setPronouns(e.target.value); setSaved(false); }}
              placeholder="e.g. She/Her"
            />
          </div>
        </div>

        <div className="acct-settings-card">
          <h2>Contact</h2>
          <div className="acct-field">
            <label className="acct-label" htmlFor="acct-email">Default Email</label>
            <input
              id="acct-email" className="acct-input" type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setSaved(false); }}
            />
          </div>
        </div>

        <div className="acct-settings-card">
          <h2>Language &amp; Time Zone</h2>
          <div className="acct-field">
            <label className="acct-label" htmlFor="acct-time-zone">Time Zone</label>
            <select
              id="acct-time-zone" className="acct-input"
              value={timeZone}
              onChange={e => { setTimeZone(e.target.value); setSaved(false); }}
            >
              {TIME_ZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
            </select>
          </div>
          <div className="acct-field">
            <label className="acct-label" htmlFor="acct-locale">Language</label>
            <select
              id="acct-locale" className="acct-input"
              value={locale}
              onChange={e => { setLocale(e.target.value); setSaved(false); }}
            >
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
        </div>

        <div className="acct-settings-actions">
          {saved && (
            <span className="acct-saved-note">
              <CheckCircle2 size={16} /> Settings saved
            </span>
          )}
          <button type="submit" className="btn btn-primary">Update Settings</button>
        </div>
      </form>

      <div className="acct-settings-links">
        <button className="acct-inline-link" onClick={() => navigate('/profile')}>
          <User size={14} /> View Profile
        </button>
        <button className="acct-inline-link" onClick={() => navigate('/notifications')}>
          <Bell size={14} /> Notification Preferences
        </button>
      </div>
    </div>
  );
}
