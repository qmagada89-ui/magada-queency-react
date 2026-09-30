import { useCallback, useEffect, useMemo, useState } from 'react';
import { authApi, productApi, tokens, errorMessage } from '../api';
import ProductForm from './ProductForm.jsx';

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
const LOW_STOCK = 5;

export default function Products({ user, onLogout }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [editing, setEditing] = useState(null);   // null = closed, {} = new, product = edit
  const [deleting, setDeleting] = useState(null);
  const [query, setQuery] = useState('');

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2600); };

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data } = await productApi.list();
      setItems(data.data || []);
    } catch (err) {
      setError(errorMessage(err, 'Could not load products.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((p) => `${p.product_name} ${p.description ?? ''}`.toLowerCase().includes(q)) : items;
  }, [items, query]);

  const totals = useMemo(() => ({
    units: items.reduce((s, p) => s + p.quantity, 0),
    value: items.reduce((s, p) => s + p.price * p.quantity, 0),
    low: items.filter((p) => p.quantity < LOW_STOCK).length,
  }), [items]);

  async function save(payload) {
    if (editing?.id) {
      await productApi.update(editing.id, payload);
      flash('Product updated');
    } else {
      await productApi.create(payload);
      flash('Product added');
    }
    setEditing(null);
    load();
  }

  async function confirmDelete() {
    try {
      await productApi.remove(deleting.id);
      flash('Product deleted');
      setDeleting(null);
      load();
    } catch (err) {
      setError(errorMessage(err, 'Could not delete product.'));
      setDeleting(null);
    }
  }

  async function logout() {
    try { await authApi.logout(); } catch { /* token may already be gone */ }
    tokens.clear();
    onLogout();
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">▣</span>
          <span>Stockroom</span>
        </div>
        <div className="who">
          <span>Signed in as <strong>{user?.username}</strong></span>
          <button className="btn btn-ghost" onClick={logout}>Log out</button>
        </div>
      </header>

      <main className="content">
        <section className="summary" aria-label="Inventory summary">
          <div><span className="k">Products</span><span className="v">{items.length}</span></div>
          <div><span className="k">Units in stock</span><span className="v">{totals.units.toLocaleString()}</span></div>
          <div><span className="k">Stock value</span><span className="v">{peso.format(totals.value)}</span></div>
          <div className={totals.low ? 'warn' : ''}><span className="k">Low stock (&lt; {LOW_STOCK})</span><span className="v">{totals.low}</span></div>
        </section>

        <div className="toolbar">
          <h1>Products</h1>
          <input className="search" type="search" placeholder="Search products" value={query}
            onChange={(e) => setQuery(e.target.value)} aria-label="Search products" />
          <button className="btn btn-primary" onClick={() => setEditing({})}>Add product</button>
        </div>

        {error && <p className="notice is-error" role="alert">{error} <button className="link" onClick={load}>Try again</button></p>}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th className="num">Price</th>
                <th className="num">Qty</th>
                <th>Added</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="empty">Loading products…</td></tr>}

              {!loading && shown.length === 0 && (
                <tr><td colSpan={5} className="empty">
                  {items.length === 0
                    ? <>No products yet. <button className="link" onClick={() => setEditing({})}>Add the first one</button>.</>
                    : 'No products match your search.'}
                </td></tr>
              )}

              {!loading && shown.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="p-name">{p.product_name}</div>
                    {p.description && <div className="p-desc">{p.description}</div>}
                  </td>
                  <td className="num">{peso.format(p.price)}</td>
                  <td className="num">
                    <span className={`qty ${p.quantity === 0 ? 'out' : p.quantity < LOW_STOCK ? 'low' : ''}`}>
                      {p.quantity}
                    </span>
                  </td>
                  <td className="date">{p.created_at ? new Date(p.created_at.replace(' ', 'T')).toLocaleDateString() : '—'}</td>
                  <td className="actions">
                    <button className="btn btn-sm" onClick={() => setEditing(p)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => setDeleting(p)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {editing && (
        <ProductForm product={editing.id ? editing : null} onSave={save} onClose={() => setEditing(null)} />
      )}

      {deleting && (
        <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && setDeleting(null)}>
          <div className="sheet sheet-sm" role="alertdialog" aria-labelledby="del-title">
            <h2 id="del-title">Delete “{deleting.product_name}”?</h2>
            <p className="muted">This removes the product from the database. It can’t be undone.</p>
            <footer className="sheet-foot">
              <button className="btn" onClick={() => setDeleting(null)} autoFocus>Cancel</button>
              <button className="btn btn-danger-solid" onClick={confirmDelete}>Delete product</button>
            </footer>
          </div>
        </div>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
