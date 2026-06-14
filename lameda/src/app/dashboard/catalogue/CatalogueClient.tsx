'use client'

import { useActionState, useState, useTransition } from 'react'
import Image from 'next/image'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, Check, Package } from 'lucide-react'
import {
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProduct,
  type CatalogueActionResult,
} from './actions'

interface Product {
  id: string
  name: string
  description: string | null
  price_kobo: number
  category: string | null
  stock_count: number | null
  image_url: string | null
  is_active: boolean
}

const IDLE: CatalogueActionResult = { success: false }

function naira(kobo: number): string {
  return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 0 })
}

// ── Add product form ──────────────────────────────────────────────────────────
function AddProductForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState(createProduct, IDLE)

  if (state.success) {
    onDone()
    return null
  }

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-lm-indigo mb-1">Product name <span className="text-red-500">*</span></label>
          <input name="name" required placeholder="e.g. Jollof rice (large)" className={field} />
        </div>
        <div>
          <label className="block text-xs font-medium text-lm-indigo mb-1">Price (₦) <span className="text-red-500">*</span></label>
          <input name="price" type="number" min="0" step="0.01" required placeholder="2500" className={field} />
        </div>
        <div>
          <label className="block text-xs font-medium text-lm-indigo mb-1">Stock count</label>
          <input name="stock" type="number" min="0" placeholder="Unlimited if blank" className={field} />
        </div>
        <div>
          <label className="block text-xs font-medium text-lm-indigo mb-1">Category</label>
          <input name="category" placeholder="e.g. Food, Clothing" className={field} />
        </div>
        <div>
          <label className="block text-xs font-medium text-lm-indigo mb-1">Image URL</label>
          <input name="image_url" type="url" placeholder="https://…" className={field} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-lm-indigo mb-1">Description</label>
          <textarea name="description" rows={3} placeholder="Brief description shown to customers…" className={`${field} resize-none`} />
        </div>
      </div>

      {state.error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? 'Adding…' : 'Add product'}
        </button>
        <button type="button" onClick={onDone} className={btnGhost}>Cancel</button>
      </div>
    </form>
  )
}

// ── Edit product form ─────────────────────────────────────────────────────────
function EditProductForm({ product, onDone }: { product: Product; onDone: () => void }) {
  const boundUpdate = updateProduct.bind(null, product.id)
  const [state, action, pending] = useActionState(boundUpdate, IDLE)

  if (state.success) {
    onDone()
    return null
  }

  const priceNaira = (product.price_kobo / 100).toString()

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-lm-indigo mb-1">Product name <span className="text-red-500">*</span></label>
          <input name="name" required defaultValue={product.name} className={field} />
        </div>
        <div>
          <label className="block text-xs font-medium text-lm-indigo mb-1">Price (₦) <span className="text-red-500">*</span></label>
          <input name="price" type="number" min="0" step="0.01" required defaultValue={priceNaira} className={field} />
        </div>
        <div>
          <label className="block text-xs font-medium text-lm-indigo mb-1">Stock count</label>
          <input name="stock" type="number" min="0" defaultValue={product.stock_count ?? ''} placeholder="Unlimited if blank" className={field} />
        </div>
        <div>
          <label className="block text-xs font-medium text-lm-indigo mb-1">Category</label>
          <input name="category" defaultValue={product.category ?? ''} className={field} />
        </div>
        <div>
          <label className="block text-xs font-medium text-lm-indigo mb-1">Image URL</label>
          <input name="image_url" type="url" defaultValue={product.image_url ?? ''} placeholder="https://…" className={field} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-lm-indigo mb-1">Description</label>
          <textarea name="description" rows={3} defaultValue={product.description ?? ''} className={`${field} resize-none`} />
        </div>
      </div>

      {state.error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" onClick={onDone} className={btnGhost}>Cancel</button>
      </div>
    </form>
  )
}

// ── Main catalogue UI ─────────────────────────────────────────────────────────
export function CatalogueClient({ products: initial, isAdmin }: { products: Product[]; isAdmin: boolean }) {
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleToggle(id: string, current: boolean) {
    startTransition(() => toggleProduct(id, !current))
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    startTransition(() => deleteProduct(id))
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-lm-indigo">Product catalogue</h1>
          <p className="text-sm text-lm-muted mt-0.5">{initial.length} product{initial.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && !showAdd && (
          <button onClick={() => setShowAdd(true)} className={btnPrimary}>
            <Plus size={16} />
            Add product
          </button>
        )}
      </div>

      {/* ── Add form ── */}
      {showAdd && isAdmin && (
        <div className="bg-white rounded-2xl border border-lm-border p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-lm-indigo">New product</h2>
            <button onClick={() => setShowAdd(false)} className="p-1.5 text-lm-muted hover:text-lm-indigo rounded-md transition-colors">
              <X size={16} />
            </button>
          </div>
          <AddProductForm onDone={() => setShowAdd(false)} />
        </div>
      )}

      {/* ── Product list ── */}
      {initial.length === 0 && !showAdd ? (
        <div className="bg-white rounded-2xl border border-lm-border p-16 text-center">
          <Package size={40} className="text-lm-border mx-auto mb-4" />
          <h3 className="font-semibold text-lm-indigo mb-1">No products yet</h3>
          <p className="text-sm text-lm-muted mb-5">Add your first product and your assistant will start selling it immediately.</p>
          {isAdmin && (
            <button onClick={() => setShowAdd(true)} className={btnPrimary}>
              <Plus size={16} />
              Add your first product
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {initial.map(product => (
            <div key={product.id} className={`bg-white rounded-2xl border transition-all ${editingId === product.id ? 'border-lm-indigo/30 shadow-sm' : 'border-lm-border hover:border-lm-indigo/20'}`}>
              {editingId === product.id ? (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="font-semibold text-lm-indigo">Edit product</h2>
                    <button onClick={() => setEditingId(null)} className="p-1.5 text-lm-muted hover:text-lm-indigo rounded-md transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                  <EditProductForm product={product} onDone={() => setEditingId(null)} />
                </div>
              ) : (
                <div className="flex items-center gap-4 p-4">
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-lm-surface border border-lm-border shrink-0 flex items-center justify-center">
                    {product.image_url ? (
                      <Image src={product.image_url} alt={product.name} width={56} height={56} className="object-cover w-full h-full" unoptimized />
                    ) : (
                      <Package size={22} className="text-lm-border" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[0.9rem] text-lm-indigo truncate">{product.name}</span>
                      {product.category && (
                        <span className="text-[0.72rem] px-2 py-0.5 bg-lm-surface text-lm-muted-dark rounded-full border border-lm-border">{product.category}</span>
                      )}
                      {!product.is_active && (
                        <span className="text-[0.72rem] px-2 py-0.5 bg-zinc-100 text-zinc-400 rounded-full">Inactive</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[0.88rem] font-bold text-lm-indigo">{naira(product.price_kobo)}</span>
                      {product.stock_count !== null && (
                        <span className={`text-[0.78rem] ${product.stock_count === 0 ? 'text-red-500' : 'text-lm-muted'}`}>
                          {product.stock_count === 0 ? 'Out of stock' : `${product.stock_count} in stock`}
                        </span>
                      )}
                      {product.description && (
                        <span className="text-[0.78rem] text-lm-muted truncate hidden sm:block max-w-[260px]">{product.description}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleToggle(product.id, product.is_active)}
                        disabled={isPending}
                        title={product.is_active ? 'Deactivate' : 'Activate'}
                        className={`p-2 rounded-lg transition-colors ${product.is_active ? 'text-emerald-500 hover:bg-emerald-50' : 'text-zinc-300 hover:bg-zinc-50 hover:text-zinc-500'}`}
                      >
                        {product.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      </button>
                      <button
                        onClick={() => setEditingId(product.id)}
                        title="Edit"
                        className="p-2 rounded-lg text-lm-muted hover:text-lm-indigo hover:bg-lm-surface transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id, product.name)}
                        disabled={isPending}
                        title="Delete"
                        className="p-2 rounded-lg text-lm-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Shared style constants ────────────────────────────────────────────────────
const field = 'w-full rounded-lg border border-lm-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lm-indigo/30 focus:border-lm-indigo/50 bg-white placeholder:text-lm-muted/50'
const btnPrimary = 'inline-flex items-center gap-2 bg-lm-indigo text-white text-[0.86rem] font-semibold px-4 py-2 rounded-lg hover:bg-lm-indigo-mid transition-colors disabled:opacity-50'
const btnGhost = 'inline-flex items-center gap-1.5 text-[0.86rem] font-medium text-lm-muted hover:text-lm-indigo px-3 py-2 rounded-lg hover:bg-lm-surface transition-colors'
