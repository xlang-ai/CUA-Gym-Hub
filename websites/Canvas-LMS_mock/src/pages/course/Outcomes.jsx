import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Target, ChevronDown, ChevronRight, Trash2, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import './Outcomes.css';

const CALC_METHODS = [
  { value: 'decaying_average', label: 'Decaying Average' },
  { value: 'n_mastery', label: 'n Number of Times' },
  { value: 'highest', label: 'Highest Score' },
  { value: 'latest', label: 'Most Recent Score' },
];

const DEFAULT_RATINGS = [
  { description: 'Exceeds Mastery', points: 4 },
  { description: 'Mastery', points: 3 },
  { description: 'Near Mastery', points: 2 },
  { description: 'Below Mastery', points: 1 },
  { description: 'No Evidence', points: 0 },
];

function calcMethodLabel(method, calcInt) {
  const found = CALC_METHODS.find(m => m.value === method);
  const label = found ? found.label : method;
  if (method === 'decaying_average' && calcInt != null) return `${label} (${calcInt}/${100 - calcInt})`;
  if (method === 'n_mastery' && calcInt != null) return `${label}: ${calcInt}`;
  return label;
}

function AddOutcomeModal({ groups, onClose, onAdd }) {
  const [title, setTitle] = useState('');
  const [group, setGroup] = useState(groups[0] || 'General');
  const [newGroup, setNewGroup] = useState('');
  const [description, setDescription] = useState('');
  const [masteryPoints, setMasteryPoints] = useState(3);
  const [calcMethod, setCalcMethod] = useState('decaying_average');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const finalGroup = group === '__new__' ? (newGroup.trim() || 'General') : group;
    onAdd({
      title: title.trim(),
      group: finalGroup,
      description: description.trim(),
      mastery_points: Number(masteryPoints) || 0,
      points_possible: 4,
      calculation_method: calcMethod,
      calculation_int: calcMethod === 'decaying_average' ? 65 : calcMethod === 'n_mastery' ? 3 : null,
      ratings: DEFAULT_RATINGS,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modules-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modules-modal-header">
          <h3>Create Outcome</h3>
          <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modules-modal-body">
            <div className="modal-field">
              <label>Outcome Name</label>
              <input
                type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                className="modal-input" placeholder="e.g. Data Validation Techniques" autoFocus
              />
            </div>
            <div className="modal-field">
              <label>Outcome Group</label>
              <select className="modal-input" value={group} onChange={(e) => setGroup(e.target.value)}>
                {groups.map(g => <option key={g} value={g}>{g}</option>)}
                <option value="__new__">+ New group…</option>
              </select>
              {group === '__new__' && (
                <input
                  type="text" value={newGroup} onChange={(e) => setNewGroup(e.target.value)}
                  className="modal-input" style={{ marginTop: 8 }} placeholder="New group name"
                />
              )}
            </div>
            <div className="modal-field">
              <label>Criterion Description</label>
              <textarea
                className="modal-input" rows={3} value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what mastery of this outcome looks like…"
              />
            </div>
            <div className="modal-field outcome-modal-row">
              <div>
                <label>Mastery Points (of 4)</label>
                <input
                  type="number" min="0" max="4" className="modal-input"
                  value={masteryPoints} onChange={(e) => setMasteryPoints(e.target.value)}
                />
              </div>
              <div>
                <label>Calculation Method</label>
                <select className="modal-input" value={calcMethod} onChange={(e) => setCalcMethod(e.target.value)}>
                  {CALC_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="modules-modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-success" disabled={!title.trim()}>Create Outcome</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Outcomes() {
  const { courseId } = useParams();
  const { state, setState } = useAppContext();
  const cid = parseInt(courseId);

  const [showAddModal, setShowAddModal] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const courseOutcomes = (state.outcomes || []).filter(o => o.course_id === cid);

  const groups = [...new Set(courseOutcomes.map(o => o.group))];
  const groupOptions = groups.length ? groups : ['General'];

  const outcomesByGroup = groupOptions.reduce((acc, g) => {
    acc[g] = courseOutcomes.filter(o => o.group === g);
    return acc;
  }, {});

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleGroup = (g) => setCollapsedGroups(prev => ({ ...prev, [g]: !prev[g] }));

  const handleAddOutcome = (payload) => {
    const newId = Math.max(0, ...(state.outcomes || []).map(o => o.id)) + 1;
    setState(prev => ({
      ...prev,
      outcomes: [...(prev.outcomes || []), { id: newId, course_id: cid, ...payload }],
    }));
  };

  const handleDeleteOutcome = (id) => {
    setState(prev => ({
      ...prev,
      outcomes: (prev.outcomes || []).filter(o => o.id !== id),
    }));
  };

  return (
    <div className="outcomes-page">
      <div className="outcomes-header">
        <h1>Outcomes</h1>
        <div className="outcomes-header-actions">
          <button className="btn btn-success" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Outcome
          </button>
        </div>
      </div>

      {courseOutcomes.length === 0 ? (
        <div className="outcomes-empty">
          <Target size={40} />
          <p>No outcomes have been added to this course yet.</p>
          <button className="btn btn-success" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Create your first outcome
          </button>
        </div>
      ) : (
        <div className="outcomes-groups">
          {groupOptions.filter(g => outcomesByGroup[g].length > 0).map(g => (
            <div key={g} className="outcome-group">
              <button className="outcome-group-header" onClick={() => toggleGroup(g)}>
                {collapsedGroups[g] ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                <span>{g}</span>
                <span className="outcome-group-count">{outcomesByGroup[g].length}</span>
              </button>
              {!collapsedGroups[g] && (
                <div className="outcome-list">
                  {outcomesByGroup[g].map(o => (
                    <div key={o.id} className="outcome-row">
                      <button className="outcome-row-main" onClick={() => toggleExpand(o.id)}>
                        <Target size={16} className="outcome-icon" />
                        <span className="outcome-title">{o.title}</span>
                        <span className="outcome-mastery-chip">Mastery at {o.mastery_points}/{o.points_possible}</span>
                        {expanded[o.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                      {expanded[o.id] && (
                        <div className="outcome-detail">
                          <p className="outcome-description">{o.description || 'No criterion description provided.'}</p>
                          <div className="outcome-calc-method">Calculation method: {calcMethodLabel(o.calculation_method, o.calculation_int)}</div>
                          <div className="outcome-ratings">
                            {o.ratings.map((r, i) => (
                              <div key={i} className={`outcome-rating-chip${r.points === o.mastery_points ? ' is-mastery' : ''}`}>
                                {r.description} <span>{r.points} pts</span>
                              </div>
                            ))}
                          </div>
                          <button className="btn btn-secondary btn-sm outcome-delete-btn" onClick={() => handleDeleteOutcome(o.id)}>
                            <Trash2 size={14} /> Delete Outcome
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddOutcomeModal groups={groupOptions} onClose={() => setShowAddModal(false)} onAdd={handleAddOutcome} />
      )}
    </div>
  );
}
