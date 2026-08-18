import React, { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { formatCurrency } from '../utils/dataManager';
import './ItemModal.css';

function defaultSelections(item) {
  return Object.fromEntries(
    item.customizationGroups.map(group => [
      group.id,
      group.options.filter(option => option.isDefault && option.isAvailable)
    ])
  );
}

export default function ItemModal({ item, onClose, onAdd }) {
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState(() => defaultSelections(item));
  const [instructions, setInstructions] = useState('');

  useEffect(() => {
    const handleKeyDown = event => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const selectedOptions = useMemo(
    () =>
      item.customizationGroups.flatMap(group =>
        (selections[group.id] || []).map(option => ({
          ...option,
          groupId: group.id,
          groupName: group.name,
          optionId: option.id,
          optionName: option.name
        }))
      ),
    [item.customizationGroups, selections]
  );
  const missingRequired = item.customizationGroups.some(
    group => (selections[group.id] || []).length < group.minSelections
  );
  const unitPrice =
    item.price + selectedOptions.reduce((sum, option) => sum + option.priceModifier, 0);

  const toggleOption = (group, option) => {
    setSelections(previous => {
      const current = previous[group.id] || [];
      const selected = current.some(candidate => candidate.id === option.id);
      let next;
      if (group.maxSelections === 1) {
        next = selected && group.minSelections === 0 ? [] : [option];
      } else if (selected) {
        next = current.filter(candidate => candidate.id !== option.id);
      } else if (current.length < group.maxSelections) {
        next = [...current, option];
      } else {
        next = current;
      }
      return { ...previous, [group.id]: next };
    });
  };

  const handleAdd = () => {
    if (missingRequired) return;
    onAdd(item, quantity, selectedOptions, instructions);
  };

  return (
    <div className="item-modal-overlay" onClick={onClose}>
      <div
        aria-label={`${item.name} details`}
        aria-modal="true"
        className="item-modal"
        role="dialog"
        onClick={event => event.stopPropagation()}
      >
        <button aria-label="Close item details" className="item-modal__close" onClick={onClose}>
          <X size={20} />
        </button>
        <div className="item-modal__body">
          <header className="item-modal__header">
            <h2 className="item-modal__name">{item.name}</h2>
            <p className="item-modal__desc">{item.description}</p>
            <p className="item-modal__price">{formatCurrency(item.price)}</p>
            {item.dietaryTags.length > 0 && (
              <div className="item-modal__tags">
                {item.dietaryTags.map(tag => (
                  <span className="item-modal__tag" key={tag}>{tag}</span>
                ))}
              </div>
            )}
          </header>

          {item.customizationGroups.map(group => (
            <section className="item-modal__group" key={group.id}>
              <div className="item-modal__group-header">
                <h3 className="item-modal__group-name">{group.name}</h3>
                {group.required ? (
                  <span className="item-modal__required">Required</span>
                ) : (
                  <span className="item-modal__optional">Optional</span>
                )}
              </div>
              <div className="item-modal__options">
                {group.options.filter(option => option.isAvailable).map(option => {
                  const selected = (selections[group.id] || []).some(
                    candidate => candidate.id === option.id
                  );
                  return (
                    <label
                      className={`item-modal__option ${selected ? 'item-modal__option--selected' : ''}`}
                      key={option.id}
                    >
                      <input
                        checked={selected}
                        className="item-modal__option-input"
                        name={group.id}
                        type={group.maxSelections === 1 && group.minSelections > 0 ? 'radio' : 'checkbox'}
                        onChange={() => toggleOption(group, option)}
                      />
                      <span className="item-modal__option-name">{option.name}</span>
                      {option.priceModifier > 0 && (
                        <span className="item-modal__option-price">
                          +{formatCurrency(option.priceModifier)}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </section>
          ))}

          <section className="item-modal__instructions">
            <label htmlFor="item-instructions">Special instructions</label>
            <textarea
              id="item-instructions"
              className="item-modal__textarea"
              placeholder="Add special instructions"
              rows={3}
              value={instructions}
              onChange={event => setInstructions(event.target.value)}
            />
          </section>
        </div>

        <footer className="item-modal__footer">
          <div className="item-modal__qty-controls">
            <button
              aria-label="Decrease quantity"
              className="item-modal__qty-btn"
              disabled={quantity <= 1}
              onClick={() => setQuantity(value => Math.max(1, value - 1))}
            >
              <Minus size={18} />
            </button>
            <span className="item-modal__qty">{quantity}</span>
            <button
              aria-label="Increase quantity"
              className="item-modal__qty-btn"
              onClick={() => setQuantity(value => value + 1)}
            >
              <Plus size={18} />
            </button>
          </div>
          <button
            className={`item-modal__add-btn ${missingRequired ? 'item-modal__add-btn--disabled' : ''}`}
            disabled={missingRequired}
            onClick={handleAdd}
          >
            <span>Add to Cart</span>
            <span>{formatCurrency(unitPrice * quantity)}</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
