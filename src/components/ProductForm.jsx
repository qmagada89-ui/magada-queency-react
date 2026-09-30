import { useEffect, useRef, useState } from 'react';

const empty = { product_name: '', description: '', price: '', quantity: '' };

export default function ProductForm({ product, onSave, onClose }) {
  const [form, setForm] = useState(product
    ? { product_name: product.product_name, description: product.description ?? '', price: product.price, quantity: product.quantity }
    : empty);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const firstField = useRef(null);

  useEffect(() => {
    firstField.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErrors({}); setMessage('');
    try {
      await onSave({
        ...form,
        price: form.price === '' ? '' : Number(form.price),
        quantity: form.quantity === '' ? '' : Number(form.quantity),
      });
    } catch (err) {
      setErrors(err.response?.data?.errors || {});
      setMessage(err.response?.data?.error || 'Could not save. Check the fields and try again.');
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="sheet" onSubmit={submit} noValidate aria-labelledby="form-title">
        <header className="sheet-head">
          <h2 id="form-title">{product ? `Edit “${product.product_name}”` : 'Add a product'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </header>

        {message && <p className="notice is-error" role="alert">{message}</p>}

        <label>
          Product name
          <input ref={firstField} value={form.product_name} onChange={set('product_name')} maxLength={100} required />
          {errors.product_name && <small className="field-error">{errors.product_name}</small>}
        </label>

        <label>
          Description
          <textarea rows={3} value={form.description} onChange={set('description')} />
        </label>

        <div className="row-2">
          <label>
            Price (₱)
            <input type="number" min="0" step="0.01" inputMode="decimal" value={form.price} onChange={set('price')} required />
            {errors.price && <small className="field-error">{errors.price}</small>}
          </label>
          <label>
            Quantity
            <input type="number" min="0" step="1" inputMode="numeric" value={form.quantity} onChange={set('quantity')} required />
            {errors.quantity && <small className="field-error">{errors.quantity}</small>}
          </label>
        </div>

        <footer className="sheet-foot">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : product ? 'Save changes' : 'Add product'}
          </button>
        </footer>
      </form>
    </div>
  );
}
