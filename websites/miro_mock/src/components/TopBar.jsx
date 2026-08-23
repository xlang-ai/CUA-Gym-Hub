import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Settings, Bell, Upload, Search, ChevronRight, Zap,
  Clock, Camera, StickyNote, List, ChevronDown, Filter,
  MousePointerClick, Globe, X, Plus, Trash2, Play, Pause,
  RotateCcw, Copy,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext.jsx';
import { generateId } from '../utils/dataManager.js';

const TYPE_LABELS = {
  sticky_note: 'Sticky notes',
  shape: 'Shapes',
  text: 'Text',
  frame: 'Frames',
  connector: 'Connectors',
};

function formatClock(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function TopBar({
  boardName, onBoardNameChange, onGoHome, userName, onShowShortcuts, onShowShare,
  items = [], onFocusItem, onZoomToFit,
  presentationActive, onTogglePresentation,
  filter = { types: [], tagIds: [] }, onFilterChange,
  cursorChatMode, onToggleCursorChat,
}) {
  const { boardId } = useParams();
  const { state, dispatch } = useAppContext();
  const board = state.boards.find(b => b.id === boardId);
  const tags = state.tags[boardId] || [];
  const checklist = (state.checklists || {})[boardId] || [];

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(boardName);
  const inputRef = useRef(null);
  const topBarRef = useRef(null);

  // Only one dropdown-style menu open at a time.
  const [openMenu, setOpenMenu] = useState(null);
  const toggleMenu = (name) => setOpenMenu(prev => (prev === name ? null : name));

  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ name: '', description: '', starred: false });

  const [searchQuery, setSearchQuery] = useState('');
  const [frameCursor, setFrameCursor] = useState(-1);
  const [newChecklistText, setNewChecklistText] = useState('');

  // --- Meeting (local analog: no real video call, but a genuine local session state) ---
  const [meetingActive, setMeetingActive] = useState(false);
  const [meetingElapsed, setMeetingElapsed] = useState(0);
  useEffect(() => {
    if (!meetingActive) return;
    const start = Date.now();
    const id = setInterval(() => setMeetingElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [meetingActive]);

  // --- Timer ---
  const [timerDuration, setTimerDuration] = useState(300);
  const [timerRemaining, setTimerRemaining] = useState(300);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerDone, setTimerDone] = useState(false);
  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      setTimerRemaining(prev => {
        if (prev <= 1) {
          setTimerRunning(false);
          setTimerDone(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Close any open dropdown on outside click.
  useEffect(() => {
    if (!openMenu) return;
    function handleClick(e) {
      if (topBarRef.current && !topBarRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openMenu]);

  const handleStartEdit = () => {
    setEditValue(boardName);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editValue.trim()) {
      onBoardNameChange(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') setIsEditing(false);
  };

  const openSettings = () => {
    setSettingsForm({
      name: board?.name || boardName,
      description: board?.description || '',
      starred: !!board?.starred,
    });
    setShowSettings(true);
    setOpenMenu(null);
  };

  const saveSettings = () => {
    dispatch({
      type: 'UPDATE_BOARD',
      payload: { id: boardId, changes: { name: settingsForm.name.trim() || board.name, description: settingsForm.description } },
    });
    if (!!board?.starred !== settingsForm.starred) {
      dispatch({ type: 'STAR_BOARD', payload: { id: boardId } });
    }
    setShowSettings(false);
  };

  const frames = items.filter(i => i.type === 'frame');
  const handlePrevFrame = () => {
    if (frames.length === 0) return;
    const nextIndex = frameCursor <= 0 ? frames.length - 1 : frameCursor - 1;
    setFrameCursor(nextIndex);
    onFocusItem?.(frames[nextIndex], { zoom: 0.85 });
  };

  const searchResults = searchQuery.trim()
    ? items.filter(i => {
        const text = i.type === 'frame' ? i.title : i.content;
        return text && text.toLowerCase().includes(searchQuery.trim().toLowerCase());
      }).slice(0, 20)
    : [];

  const stickyNotes = items.filter(i => i.type === 'sticky_note');

  const filterActive = filter.types.length > 0 || filter.tagIds.length > 0;
  const presentTypes = Array.from(new Set(items.map(i => i.type)));
  const toggleFilterType = (type) => {
    const types = filter.types.includes(type) ? filter.types.filter(t => t !== type) : [...filter.types, type];
    onFilterChange?.({ ...filter, types });
  };
  const toggleFilterTag = (tagId) => {
    const tagIds = filter.tagIds.includes(tagId) ? filter.tagIds.filter(t => t !== tagId) : [...filter.tagIds, tagId];
    onFilterChange?.({ ...filter, tagIds });
  };

  const doneCount = checklist.filter(c => c.done).length;

  const addChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    dispatch({
      type: 'ADD_CHECKLIST_ITEM',
      payload: { boardId, item: { id: generateId(), text: newChecklistText.trim(), done: false } },
    });
    setNewChecklistText('');
  };

  return (
    <div className="top-bar" ref={topBarRef}>
      {/* Left section */}
      <div className="top-bar-left">
        <button className="top-bar-logo" onClick={onGoHome}>
          xiro
        </button>
        <div className="top-bar-divider" />
        {isEditing ? (
          <input
            ref={inputRef}
            className="board-name-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <button className="board-name-display" onClick={handleStartEdit}>
            {boardName}
          </button>
        )}
        <div className="top-bar-icon-group">
          <button
            className="top-bar-icon-btn"
            title="Board settings"
            onClick={openSettings}
          >
            <Settings size={20} />
          </button>
          <div style={{ position: 'relative' }}>
            <button
              className="top-bar-icon-btn"
              title="Notifications"
              onClick={() => toggleMenu('notifications')}
            >
              <Bell size={20} />
            </button>
            {openMenu === 'notifications' && (
              <div className="topbar-dropdown" style={{ right: 0, left: 'auto', width: 280 }}>
                <div className="topbar-dropdown-header">Notifications</div>
                <div className="topbar-dropdown-empty">No new notifications</div>
              </div>
            )}
          </div>
          <button
            className="top-bar-icon-btn"
            title="Export / Download"
            onClick={() => {
              const data = JSON.stringify({ boardName, exportedAt: new Date().toISOString() }, null, 2);
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${boardName.replace(/\s+/g, '_')}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Upload size={20} />
          </button>
          <div style={{ position: 'relative' }}>
            <button
              className="top-bar-icon-btn"
              title="Search this board"
              onClick={() => toggleMenu('search')}
            >
              <Search size={20} />
            </button>
            {openMenu === 'search' && (
              <div className="topbar-dropdown" style={{ left: 0, width: 300 }}>
                <div className="topbar-panel-search">
                  <input
                    autoFocus
                    className="topbar-panel-input"
                    placeholder="Search sticky notes, shapes, text, frames…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {searchQuery.trim() === '' ? (
                  <div className="topbar-dropdown-empty">Type to search board content</div>
                ) : searchResults.length === 0 ? (
                  <div className="topbar-dropdown-empty">No matches for "{searchQuery}"</div>
                ) : (
                  <div className="topbar-panel-list">
                    {searchResults.map(item => (
                      <button
                        key={item.id}
                        className="topbar-panel-row"
                        onClick={() => { onFocusItem?.(item, { zoom: 1 }); setOpenMenu(null); setSearchQuery(''); }}
                      >
                        <span className="topbar-panel-row-type">{TYPE_LABELS[item.type] || item.type}</span>
                        <span className="topbar-panel-row-text">{item.type === 'frame' ? item.title : item.content}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Center section */}
      <div className="top-bar-center">
        <button
          className="collab-btn"
          title={frames.length === 0 ? 'No frames on this board' : 'Jump to previous frame'}
          onClick={handlePrevFrame}
          disabled={frames.length === 0}
          style={frames.length === 0 ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
        >
          <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <div style={{ position: 'relative' }}>
          <button
            className={`collab-btn ${meetingActive ? 'active' : ''}`}
            title={meetingActive ? 'Meeting in progress' : 'Start meeting'}
            onClick={() => setMeetingActive(v => !v)}
          >
            <Zap size={16} />
            <span>{meetingActive ? formatClock(meetingElapsed) : 'Meeting'}</span>
          </button>
          {meetingActive && (
            <div className="topbar-dropdown" style={{ left: '50%', transform: 'translateX(-50%)', width: 240 }}>
              <div className="topbar-dropdown-header">Meeting in progress · {formatClock(meetingElapsed)}</div>
              <div className="meeting-participants">
                {state.team.members.map(m => (
                  <span key={m.id} className="meeting-avatar" title={m.name}>{m.initials}</span>
                ))}
              </div>
              <div className="topbar-panel-footer">
                <button className="topbar-panel-btn danger" onClick={() => { setMeetingActive(false); setMeetingElapsed(0); }}>Leave meeting</button>
              </div>
            </div>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <button
            className={`collab-btn ${timerRunning || timerDone ? 'active' : ''}`}
            title="Timer"
            onClick={() => toggleMenu('timer')}
          >
            <Clock size={16} />
            {(timerRunning || timerDone) && <span>{formatClock(timerRemaining)}</span>}
          </button>
          {openMenu === 'timer' && (
            <div className="topbar-dropdown" style={{ left: '50%', transform: 'translateX(-50%)', width: 220 }}>
              <div className="topbar-dropdown-header">Timer</div>
              <div className="timer-display" style={{ color: timerDone ? '#d32f2f' : undefined }}>
                {formatClock(timerRemaining)}
                {timerDone && <div className="timer-done-label">Time's up</div>}
              </div>
              {!timerRunning && (
                <div className="timer-presets">
                  {[60, 300, 600].map(sec => (
                    <button
                      key={sec}
                      className={`timer-preset-btn ${timerDuration === sec ? 'active' : ''}`}
                      onClick={() => { setTimerDuration(sec); setTimerRemaining(sec); setTimerDone(false); }}
                    >
                      {sec / 60}m
                    </button>
                  ))}
                </div>
              )}
              <div className="topbar-panel-footer">
                {!timerRunning ? (
                  <button className="topbar-panel-btn" onClick={() => { setTimerRunning(true); setTimerDone(false); }} disabled={timerRemaining === 0}>
                    <Play size={14} /> Start
                  </button>
                ) : (
                  <button className="topbar-panel-btn" onClick={() => setTimerRunning(false)}>
                    <Pause size={14} /> Pause
                  </button>
                )}
                <button className="topbar-panel-btn" onClick={() => { setTimerRunning(false); setTimerRemaining(timerDuration); setTimerDone(false); }}>
                  <RotateCcw size={14} /> Reset
                </button>
              </div>
            </div>
          )}
        </div>
        <button
          className={`collab-btn ${presentationActive ? 'active' : ''}`}
          title={frames.length === 0 ? 'Add a frame to present' : (presentationActive ? 'Exit presentation mode' : 'Present (highlights frames)')}
          onClick={onTogglePresentation}
          disabled={frames.length === 0 && !presentationActive}
          style={(frames.length === 0 && !presentationActive) ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
        >
          <Camera size={16} />
        </button>
        <div style={{ position: 'relative' }}>
          <button
            className="collab-btn"
            title="Sticky note pad"
            onClick={() => toggleMenu('sticky')}
          >
            <StickyNote size={16} />
          </button>
          {openMenu === 'sticky' && (
            <div className="topbar-dropdown" style={{ left: '50%', transform: 'translateX(-50%)', width: 260 }}>
              <div className="topbar-dropdown-header">Sticky notes ({stickyNotes.length})</div>
              {stickyNotes.length === 0 ? (
                <div className="topbar-dropdown-empty">No sticky notes on this board yet</div>
              ) : (
                <div className="topbar-panel-list">
                  {stickyNotes.map(item => (
                    <button key={item.id} className="topbar-panel-row" onClick={() => { onFocusItem?.(item, { zoom: 1 }); setOpenMenu(null); }}>
                      <span className="topbar-panel-swatch" style={{ background: '#fff9b1' }} />
                      <span className="topbar-panel-row-text">{item.content || '(empty note)'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <button
            className="collab-btn"
            title="Checklist"
            onClick={() => toggleMenu('checklist')}
          >
            <List size={16} />
          </button>
          {openMenu === 'checklist' && (
            <div className="topbar-dropdown" style={{ left: '50%', transform: 'translateX(-50%)', width: 280 }}>
              <div className="topbar-dropdown-header">Checklist · {doneCount}/{checklist.length} done</div>
              {checklist.length === 0 ? (
                <div className="topbar-dropdown-empty">No checklist items yet</div>
              ) : (
                <div className="topbar-panel-list">
                  {checklist.map(chk => (
                    <div key={chk.id} className="checklist-row">
                      <input
                        type="checkbox"
                        checked={chk.done}
                        onChange={() => dispatch({ type: 'TOGGLE_CHECKLIST_ITEM', payload: { boardId, itemId: chk.id } })}
                      />
                      <span className={`checklist-row-text ${chk.done ? 'done' : ''}`}>{chk.text}</span>
                      <button className="checklist-row-delete" title="Delete" onClick={() => dispatch({ type: 'DELETE_CHECKLIST_ITEM', payload: { boardId, itemId: chk.id } })}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="topbar-panel-footer">
                <input
                  className="topbar-panel-input"
                  placeholder="Add checklist item…"
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addChecklistItem(); }}
                />
                <button className="topbar-panel-btn" onClick={addChecklistItem}><Plus size={14} /></button>
              </div>
            </div>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <button
            className="collab-btn"
            title="More collaboration tools"
            onClick={() => toggleMenu('more')}
          >
            <ChevronDown size={14} />
          </button>
          {openMenu === 'more' && (
            <div className="topbar-dropdown" style={{ left: '50%', transform: 'translateX(-50%)', width: 200 }}>
              <div className="topbar-panel-list">
                <button className="topbar-panel-row" onClick={() => { onZoomToFit?.(); setOpenMenu(null); }}>
                  <span className="topbar-panel-row-text">Zoom to fit board</span>
                </button>
                <button className="topbar-panel-row" onClick={openSettings}>
                  <span className="topbar-panel-row-text">Board settings</span>
                </button>
                <button className="topbar-panel-row" onClick={() => { onShowShare?.(); setOpenMenu(null); }}>
                  <span className="topbar-panel-row-text">Invite to board</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right section */}
      <div className="top-bar-right">
        <div style={{ position: 'relative' }}>
          <button
            className={`top-bar-icon-btn ${filterActive ? 'active' : ''}`}
            title="Filter items"
            onClick={() => toggleMenu('filter')}
            style={{ position: 'relative' }}
          >
            <Filter size={20} />
            {filterActive && <span className="topbar-filter-badge" />}
          </button>
          {openMenu === 'filter' && (
            <div className="topbar-dropdown" style={{ right: 0, left: 'auto', width: 240 }}>
              <div className="topbar-dropdown-header">Filter board items</div>
              <div className="topbar-panel-list">
                <div className="filter-section-label">Type</div>
                {presentTypes.map(type => (
                  <label key={type} className="checklist-row">
                    <input
                      type="checkbox"
                      checked={filter.types.includes(type)}
                      onChange={() => toggleFilterType(type)}
                    />
                    <span className="checklist-row-text">{TYPE_LABELS[type] || type}</span>
                  </label>
                ))}
                {tags.length > 0 && (
                  <>
                    <div className="filter-section-label">Tags</div>
                    {tags.map(tag => (
                      <label key={tag.id} className="checklist-row">
                        <input
                          type="checkbox"
                          checked={filter.tagIds.includes(tag.id)}
                          onChange={() => toggleFilterTag(tag.id)}
                        />
                        <span className="checklist-row-text">{tag.title}</span>
                      </label>
                    ))}
                  </>
                )}
              </div>
              <div className="topbar-panel-footer">
                <button className="topbar-panel-btn" onClick={() => onFilterChange?.({ types: [], tagIds: [] })} disabled={!filterActive}>
                  Clear filters
                </button>
              </div>
            </div>
          )}
        </div>
        <button
          className={`top-bar-icon-btn ${cursorChatMode ? 'active' : ''}`}
          title={cursorChatMode ? 'Cursor chat active — click the canvas to send a message' : 'Cursor chat'}
          onClick={onToggleCursorChat}
        >
          <MousePointerClick size={20} />
        </button>
        <div style={{ position: 'relative' }}>
          <button
            className="user-avatar"
            title={`Logged in as ${userName}`}
            style={{ cursor: 'pointer', border: '2px solid #ddd' }}
            onClick={() => toggleMenu('user')}
          >
            {userName}
          </button>
          {openMenu === 'user' && (
            <div className="topbar-dropdown" style={{ right: 0, left: 'auto', width: 260 }}>
              <div className="topbar-dropdown-header">
                {state.currentUser.name}
                <div style={{ fontWeight: 400, fontSize: 12, color: 'var(--xiro-text-muted)' }}>{state.currentUser.email}</div>
              </div>
              <div className="topbar-panel-footer">
                <button
                  className="topbar-panel-btn"
                  onClick={() => navigator.clipboard?.writeText(state.currentUser.email).catch(() => {})}
                >
                  <Copy size={14} /> Copy email
                </button>
              </div>
              <div className="filter-section-label" style={{ padding: '4px 16px' }}>Team ({state.team.members.length})</div>
              <div className="topbar-panel-list">
                {state.team.members.map(m => (
                  <div key={m.id} className="topbar-panel-row" style={{ cursor: 'default' }}>
                    <span className="meeting-avatar">{m.initials}</span>
                    <span className="topbar-panel-row-text">{m.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <button
          className="share-btn"
          onClick={onShowShare}
          title="Share this board"
        >
          <Globe size={14} />
          <span>Share</span>
        </button>
      </div>

      {/* Board settings dialog */}
      {showSettings && board && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <h3>Board settings</h3>
            <div className="settings-field">
              <label>Board name</label>
              <input
                className="topbar-panel-input"
                value={settingsForm.name}
                onChange={(e) => setSettingsForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="settings-field">
              <label>Description</label>
              <textarea
                className="topbar-panel-input"
                rows={3}
                value={settingsForm.description}
                onChange={(e) => setSettingsForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="settings-field">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={settingsForm.starred}
                  onChange={(e) => setSettingsForm(f => ({ ...f, starred: e.target.checked }))}
                />
                Starred board
              </label>
            </div>
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="modal-btn cancel" onClick={() => setShowSettings(false)}>Cancel</button>
              <button className="modal-btn" style={{ background: 'var(--xiro-primary)', color: 'white' }} onClick={saveSettings}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
