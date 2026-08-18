import React, { useState } from 'react';
import { CheckCircle, Clock, Package, RotateCcw, Star, Truck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/dataManager';
import './Orders.css';

const STATUS_LABELS = {
  placed: 'Order received',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  picked_up: 'Picked up',
  delivering: 'Delivering',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

const STATUS_PROGRESS = {
  placed: 15,
  confirmed: 30,
  preparing: 45,
  picked_up: 70,
  delivering: 85,
  out_for_delivery: 90,
  delivered: 100,
  cancelled: 0
};

function OrderCard({ order, active, onReorder, onRate }) {
  const [ratingOpen, setRatingOpen] = useState(false);
  const [rating, setRating] = useState(order.rating || 0);
  const [review, setReview] = useState(order.review || '');
  const orderDate = new Date(order.placedAt);
  const canRate = order.status === 'delivered' && !order.rating;

  const submitRating = () => {
    if (!rating) return;
    onRate(order.id, rating, review);
    setRatingOpen(false);
  };

  return (
    <article className={`order-card ${active ? 'order-card--active' : ''}`}>
      <div className="order-card__header">
        <div className="order-card__rest">
          <div className="order-card__rest-avatar">
            {order.restaurantName?.slice(0, 1) || 'R'}
          </div>
          <div>
            <div className="order-card__rest-name">{order.restaurantName}</div>
            <div className="order-card__date">
              {Number.isNaN(orderDate.getTime()) ? '' : orderDate.toLocaleString()}
            </div>
          </div>
        </div>
        <div className="order-card__status">
          {order.status === 'delivered' ? <CheckCircle size={16} /> : <Clock size={16} />}
          <span>{STATUS_LABELS[order.status] || order.status}</span>
        </div>
      </div>

      {active && (
        <div className="order-card__progress">
          <div className="order-card__progress-bar">
            <div
              className="order-card__progress-fill"
              style={{ width: `${STATUS_PROGRESS[order.status] || 0}%` }}
            />
          </div>
          <div className="order-card__progress-labels">
            <span>Received</span><span>Preparing</span><span>On the way</span><span>Delivered</span>
          </div>
        </div>
      )}

      <p className="order-card__items-summary">
        {order.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
      </p>
      <div className="order-card__footer">
        <span className="order-card__total">{formatCurrency(order.total)}</span>
        <div className="order-card__actions">
          <Link className="order-card__action-btn" to={`/orders/${order.id}`}>
            {active ? <Truck size={14} /> : <Package size={14} />}
            {active ? 'Track Order' : 'View Receipt'}
          </Link>
          <button className="order-card__action-btn" onClick={() => onReorder(order.id)}>
            <RotateCcw size={14} /> Reorder
          </button>
          {canRate && (
            <button
              className="order-card__action-btn order-card__action-btn--rate"
              onClick={() => setRatingOpen(true)}
            >
              <Star size={14} /> Rate order
            </button>
          )}
          {order.rating && (
            <span className="order-card__rated">{'★'.repeat(order.rating)}</span>
          )}
        </div>
      </div>

      {ratingOpen && (
        <div className="order-card__rating-form">
          <div className="order-card__star-select" aria-label="Order rating">
            {[1, 2, 3, 4, 5].map(value => (
              <button
                key={value}
                aria-label={`${value} star${value === 1 ? '' : 's'}`}
                className={`order-card__star ${value <= rating ? 'order-card__star--active' : ''}`}
                onClick={() => setRating(value)}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            aria-label="Order review"
            className="order-card__review-input"
            placeholder="Share your experience"
            value={review}
            onChange={event => setReview(event.target.value)}
          />
          <div className="order-card__rating-actions">
            <button className="order-card__cancel-btn" onClick={() => setRatingOpen(false)}>
              Cancel
            </button>
            <button
              className="order-card__submit-btn"
              disabled={!rating}
              onClick={submitRating}
            >
              Submit rating
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

export default function Orders() {
  const { state, reorder, rateOrder } = useApp();
  const navigate = useNavigate();
  const activeOrders = state.orders.filter(
    order => !['delivered', 'cancelled'].includes(order.status)
  );
  const pastOrders = state.orders.filter(
    order => ['delivered', 'cancelled'].includes(order.status)
  );

  const handleReorder = orderId => {
    reorder(orderId);
    navigate('/checkout');
  };

  if (state.orders.length === 0) {
    return (
      <div className="orders-empty">
        <div className="orders-empty__icon"><Package size={36} /></div>
        <h2>No orders yet</h2>
        <p>Your current and past orders will appear here.</p>
        <Link className="orders-empty__btn" to="/">Browse restaurants</Link>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <h1 className="orders-page__title">Orders</h1>
      {activeOrders.length > 0 && (
        <section className="orders-section">
          <h2 className="orders-section__title">Current orders</h2>
          <div className="orders-list">
            {activeOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                active
                onReorder={handleReorder}
                onRate={rateOrder}
              />
            ))}
          </div>
        </section>
      )}
      {pastOrders.length > 0 && (
        <section className="orders-section">
          <h2 className="orders-section__title">Past orders</h2>
          <div className="orders-list">
            {pastOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                active={false}
                onReorder={handleReorder}
                onRate={rateOrder}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
