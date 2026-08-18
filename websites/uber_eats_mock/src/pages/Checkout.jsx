import React, { useState } from 'react';
import { Check, CreditCard, MapPin, Tag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/dataManager';
import './Checkout.css';

const TIP_OPTIONS = [0, 15, 18, 20, 25];

export default function Checkout() {
  const {
    state,
    updateAddress,
    updateDefaultPayment,
    setTip,
    applyPromoCode,
    updateDeliveryInstructions,
    placeOrder
  } = useApp();
  const navigate = useNavigate();
  const [openPicker, setOpenPicker] = useState(null);
  const [promoInput, setPromoInput] = useState('');

  const { cart } = state;
  const restaurant = state.restaurants.find(item => item.id === cart.restaurantId);
  const selectedAddress = state.user.addresses.find(
    address => address.id === state.ui.selectedAddressId
  );
  const selectedPayment = state.user.paymentMethods.find(
    method => method.id === state.user.defaultPaymentId || method.isDefault
  );
  const subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
  const serviceFee = Math.min(Math.max(subtotal * 0.15, 0.99), 9.99);
  const deliveryFee = restaurant ? restaurant.deliveryFee : 0;
  const tax = subtotal * 0.09;
  const tip = cart.tipPercentage
    ? subtotal * (cart.tipPercentage / 100)
    : cart.tipAmount;
  const total = subtotal + serviceFee + deliveryFee + tax + tip - cart.promoDiscount;

  if (cart.items.length === 0) {
    return (
      <div className="checkout-empty">
        <h2>Your cart is empty</h2>
        <p>Add an item before checking out.</p>
        <Link className="checkout-empty__btn" to="/">Browse restaurants</Link>
      </div>
    );
  }

  const handlePromoSubmit = event => {
    event.preventDefault();
    const code = promoInput.trim();
    if (!code) return;
    applyPromoCode(code);
    setPromoInput('');
  };

  const handlePlaceOrder = () => {
    const orderId = placeOrder();
    navigate(`/orders/${orderId}`);
  };

  return (
    <div className="checkout">
      <h1 className="checkout__title">Checkout</h1>
      <div className="checkout__layout">
        <div className="checkout__main">
          <section className="checkout__section">
            <h2 className="checkout__section-title">Delivery details</h2>
            <div className="checkout__card">
              <div className="checkout__row">
                <MapPin size={20} />
                <div className="checkout__row-content">
                  <strong>{selectedAddress?.label || 'Select an address'}</strong>
                  <span className="checkout__row-sub">
                    {selectedAddress
                      ? `${selectedAddress.street}${selectedAddress.apt ? `, ${selectedAddress.apt}` : ''}`
                      : 'No delivery address selected'}
                  </span>
                </div>
                <button
                  className="checkout__edit-btn"
                  onClick={() => setOpenPicker(openPicker === 'address' ? null : 'address')}
                >
                  Change
                </button>
              </div>
              {openPicker === 'address' && (
                <div className="checkout__picker">
                  <div className="checkout__picker-title">Delivery address</div>
                  {state.user.addresses.map(address => (
                    <button
                      key={address.id}
                      className={`checkout__picker-option ${address.id === selectedAddress?.id ? 'checkout__picker-option--active' : ''}`}
                      onClick={() => {
                        updateAddress(address.id);
                        setOpenPicker(null);
                      }}
                    >
                      <MapPin size={16} />
                      <span className="checkout__picker-info">
                        <strong>{address.label}</strong>
                        <span>{address.street}{address.apt ? `, ${address.apt}` : ''}</span>
                      </span>
                      {address.id === selectedAddress?.id && <Check size={16} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <label className="checkout__instructions-label" htmlFor="delivery-instructions">
              Delivery instructions
            </label>
            <textarea
              id="delivery-instructions"
              className="checkout__instructions-input"
              placeholder="Add delivery instructions (e.g., Leave at door)"
              value={cart.deliveryInstructions}
              onChange={event => updateDeliveryInstructions(event.target.value)}
            />
          </section>

          <section className="checkout__section">
            <h2 className="checkout__section-title">Payment</h2>
            <div className="checkout__card">
              <div className="checkout__row">
                <CreditCard size={20} />
                <div className="checkout__row-content">
                  <strong>{selectedPayment?.label || 'Select payment'}</strong>
                </div>
                <button
                  className="checkout__edit-btn"
                  onClick={() => setOpenPicker(openPicker === 'payment' ? null : 'payment')}
                >
                  Change
                </button>
              </div>
              {openPicker === 'payment' && (
                <div className="checkout__picker">
                  {state.user.paymentMethods.map(method => (
                    <button
                      key={method.id}
                      className={`checkout__picker-option ${method.id === selectedPayment?.id ? 'checkout__picker-option--active' : ''}`}
                      onClick={() => {
                        updateDefaultPayment(method.id);
                        setOpenPicker(null);
                      }}
                    >
                      <CreditCard size={16} />
                      <span>{method.label}</span>
                      {method.id === selectedPayment?.id && <Check size={16} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="checkout__section">
            <h2 className="checkout__section-title">Tip</h2>
            <div className="checkout__tips">
              {TIP_OPTIONS.map(percentage => (
                <button
                  key={percentage}
                  className={`checkout__tip-btn ${cart.tipPercentage === percentage ? 'checkout__tip-btn--active' : ''}`}
                  onClick={() => setTip(0, percentage)}
                >
                  {percentage}%
                </button>
              ))}
            </div>
          </section>

          <section className="checkout__section">
            <h2 className="checkout__section-title">Promo code</h2>
            {cart.promoCode ? (
              <div className="checkout__promo-applied">
                <Tag size={18} />
                <span className="checkout__promo-code">{cart.promoCode}</span>
                <span className="checkout__promo-save">
                  saves {formatCurrency(cart.promoDiscount)}
                </span>
              </div>
            ) : (
              <form className="checkout__promo-form" onSubmit={handlePromoSubmit}>
                <input
                  aria-label="Promo code"
                  className="checkout__promo-input"
                  value={promoInput}
                  onChange={event => setPromoInput(event.target.value)}
                  placeholder="Enter promo code"
                />
                <button className="checkout__promo-btn" type="submit">Apply</button>
              </form>
            )}
          </section>

          <section className="checkout__section">
            <h2 className="checkout__section-title">Order summary</h2>
            <p className="checkout__rest-name">{restaurant?.name}</p>
            <div className="checkout__items">
              {cart.items.map(item => (
                <div className="checkout__item" key={item.id}>
                  <span className="checkout__item-qty">{item.quantity}x</span>
                  <span className="checkout__item-info">
                    <span className="checkout__item-name">{item.name}</span>
                    {item.selectedOptions.length > 0 && (
                      <span className="checkout__item-opts">
                        {item.selectedOptions.map(option => option.optionName).join(', ')}
                      </span>
                    )}
                  </span>
                  <span className="checkout__item-price">{formatCurrency(item.totalPrice)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="checkout__sidebar">
          <div className="checkout__totals">
            <div className="checkout__total-row"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="checkout__total-row"><span>Service Fee</span><span>{formatCurrency(serviceFee)}</span></div>
            <div className="checkout__total-row"><span>Delivery Fee</span><span>{deliveryFee === 0 ? 'Free' : formatCurrency(deliveryFee)}</span></div>
            <div className="checkout__total-row"><span>Tax</span><span>{formatCurrency(tax)}</span></div>
            <div className="checkout__total-row"><span>Tip</span><span>{formatCurrency(tip)}</span></div>
            {cart.promoDiscount > 0 && (
              <div className="checkout__total-row checkout__total-row--discount">
                <span>Promo</span><span>-{formatCurrency(cart.promoDiscount)}</span>
              </div>
            )}
            <div className="checkout__total-row checkout__total-row--final">
              <span>Total</span><span>{formatCurrency(total)}</span>
            </div>
          </div>
          <button className="checkout__place-btn" onClick={handlePlaceOrder}>
            Place Order — {formatCurrency(total)}
          </button>
          <p className="checkout__terms">Your order remains inside this local sandbox.</p>
        </aside>
      </div>
    </div>
  );
}
