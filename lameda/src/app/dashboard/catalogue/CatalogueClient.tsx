'use client'

import { useActionState, useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  X, Package, Upload, Download, ChevronDown, ChevronUp,
  Tag, CheckCircle2, AlertCircle,
} from 'lucide-react'
import {
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProduct,
  importFromCsv,
  type CatalogueActionResult,
  type ImportResult,
} from './actions'

export interface Product {
  id: string
  name: string
  description: string | null
  price_kobo: number
  category: string | null
  stock_count: number | null
  image_url: string | null
  is_active: boolean
  tags: string[]
}

const IDLE: CatalogueActionResult = { success: false }
const IMPORT_IDLE: ImportResult = { success: false }

function naira(kobo: number): string {
  return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 0 })
}

function downloadTemplate() {
  const header = 'name,price_ngn,description,category,stock_count,image_url,tags,sizes,colors'
  const example = '"Ankara blouse",8500,"Beautiful hand-woven blouse",Clothing,50,https://example.com/img.jpg,"fashion;women;ankara","S|M|L|XL","Red|Green|Blue"'
  const csv = [header, example].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'lameda-products-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ── Tags field (reused in add + edit forms) ───────────────────────────────────
function TagsField({ defaultValue = '' }: { defaultValue?: string }) {
  return (
    <div className="col-span-2">
      <label className="block text-xs font-medium text-lm-indigo mb-1">
        Tags
        <span className="ml-1.5 font-normal text-lm-muted">(comma-separated — used for search)</span>
      </label>
      <div className="relative">
        <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-lm-muted pointer-events-none" />
        <input
          name="tags"
          defaultValue={defaultValue}
          placeholder="e.g. fashion, women, ankara, new arrival"
          className={`${field} pl-8`}
        />
      </div>
      <p className="text-[0.72rem] text-lm-muted mt-1">Tags help your assistant and customers find products faster.</p>
    </div>
  )
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
        <TagsField />
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
  const tagsDefault = product.tags.join(', ')

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
        <TagsField defaultValue={tagsDefault} />
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

// ── CSV import panel ──────────────────────────────────────────────────────────
function CsvImportPanel({ onClose }: { onClose: () => void }) {
  const [state, action, pending] = useActionState(importFromCsv, IMPORT_IDLE)
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="bg-white rounded-2xl border border-lm-indigo/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-lm-border bg-lm-surface/50">
        <div className="flex items-center gap-2.5">
          <Upload size={16} className="text-lm-indigo" />
          <span className="font-semibold text-lm-indigo text-sm">Import products from CSV</span>
        </div>
        <button onClick={onClose} className="p-1.5 text-lm-muted hover:text-lm-indigo rounded-md transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="p-6 space-y-5">
        {/* Format reference */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-lm-indigo uppercase tracking-wide">Required CSV format</p>
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-1.5 text-[0.78rem] font-medium text-lm-indigo hover:text-lm-indigo-mid transition-colors"
            >
              <Download size={13} />
              Download template
            </button>
          </div>

          <div className="rounded-xl border border-lm-border overflow-hidden text-[0.78rem]">
            <table className="w-full">
              <thead>
                <tr className="bg-lm-surface">
                  <th className="text-left px-3 py-2 font-semibold text-lm-indigo border-b border-lm-border w-36">Column</th>
                  <th className="text-left px-3 py-2 font-semibold text-lm-indigo border-b border-lm-border w-20">Required</th>
                  <th className="text-left px-3 py-2 font-semibold text-lm-indigo border-b border-lm-border">Format &amp; example</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lm-border">
                {CSV_COLUMNS.map(col => (
                  <tr key={col.name} className="align-top">
                    <td className="px-3 py-2 font-mono text-lm-indigo whitespace-nowrap">{col.name}</td>
                    <td className="px-3 py-2 text-center">
                      {col.required
                        ? <span className="text-red-500 font-bold">Yes</span>
                        : <span className="text-lm-muted">No</span>}
                    </td>
                    <td className="px-3 py-2 text-lm-muted leading-relaxed">
                      {col.description}
                      {col.example && (
                        <span className="block mt-0.5 font-mono text-lm-muted-dark">{col.example}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[0.72rem] text-lm-muted mt-2">
            Wrap any field in double-quotes if it contains commas.
            The first row must be the header row with exact column names as shown above.
          </p>
        </div>

        {/* Upload form */}
        {!state.success ? (
          <form action={action} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-lm-indigo mb-2">Select CSV file</label>
              <input
                ref={fileRef}
                name="file"
                type="file"
                accept=".csv,text/csv"
                required
                className="block w-full text-sm text-lm-muted
                  file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0
                  file:text-sm file:font-semibold file:bg-lm-indigo/[0.07] file:text-lm-indigo
                  hover:file:bg-lm-indigo/[0.12] file:transition-colors file:cursor-pointer
                  cursor-pointer"
              />
            </div>

            {state.error && (
              <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2.5">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{state.error}</span>
              </div>
            )}

            {state.errors && state.errors.length > 0 && !state.success && (
              <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2.5 space-y-1">
                {state.errors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}

            <button type="submit" disabled={pending} className={btnPrimary}>
              <Upload size={15} />
              {pending ? 'Importing…' : 'Import products'}
            </button>
          </form>
        ) : (
          /* Success state */
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-emerald-50 rounded-xl px-4 py-3.5">
              <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  {state.imported} product{state.imported !== 1 ? 's' : ''} imported successfully
                </p>
                {state.errors && state.errors.length > 0 && (
                  <p className="text-xs text-emerald-700 mt-0.5">
                    {state.errors.length} warning{state.errors.length !== 1 ? 's' : ''} — see below.
                  </p>
                )}
              </div>
            </div>

            {state.errors && state.errors.length > 0 && (
              <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2.5 space-y-1">
                {state.errors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}

            <button type="button" onClick={onClose} className={btnGhost}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main catalogue UI ─────────────────────────────────────────────────────────
export function CatalogueClient({ products: initial, isAdmin }: { products: Product[]; isAdmin: boolean }) {
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-lm-indigo">Product catalogue</h1>
          <p className="text-sm text-lm-muted mt-0.5">{initial.length} product{initial.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowImport(v => !v); setShowAdd(false) }}
              className={btnOutline}
            >
              <Upload size={15} />
              Import CSV
              {showImport ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {!showAdd && (
              <button
                onClick={() => { setShowAdd(true); setShowImport(false) }}
                className={btnPrimary}
              >
                <Plus size={16} />
                Add product
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── CSV import panel ── */}
      {showImport && isAdmin && (
        <CsvImportPanel onClose={() => setShowImport(false)} />
      )}

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
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setShowAdd(true)} className={btnPrimary}>
                <Plus size={16} />
                Add product
              </button>
              <button onClick={() => setShowImport(true)} className={btnOutline}>
                <Upload size={15} />
                Import CSV
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {initial.map(product => (
            <div
              key={product.id}
              className={`bg-white rounded-2xl border transition-all ${editingId === product.id ? 'border-lm-indigo/30 shadow-sm' : 'border-lm-border hover:border-lm-indigo/20'}`}
            >
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
                <div className="flex items-start gap-4 p-4">
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-lm-surface border border-lm-border shrink-0 flex items-center justify-center mt-0.5">
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
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
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

                    {/* Tags */}
                    {product.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <Tag size={11} className="text-lm-muted shrink-0" />
                        {product.tags.map(tag => (
                          <span
                            key={tag}
                            className="text-[0.7rem] px-2 py-0.5 bg-lm-lime/10 text-lm-indigo/70 rounded-full font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
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

// ── CSV column reference ──────────────────────────────────────────────────────
const CSV_COLUMNS = [
  { name: 'name',        required: true,  description: 'Product name',                                     example: 'Ankara blouse' },
  { name: 'price_ngn',   required: true,  description: 'Price in Naira (numbers only, no ₦ symbol)',        example: '8500' },
  { name: 'description', required: false, description: 'Product description shown to customers',            example: 'Beautiful hand-woven blouse' },
  { name: 'category',    required: false, description: 'Product category',                                  example: 'Clothing' },
  { name: 'stock_count', required: false, description: 'Available quantity (leave blank for unlimited)',     example: '50' },
  { name: 'image_url',   required: false, description: 'Full URL to product image',                         example: 'https://example.com/img.jpg' },
  { name: 'tags',        required: false, description: 'Searchable tags — separate with semicolons (;)',    example: 'fashion;women;ankara' },
  { name: 'sizes',       required: false, description: 'Available sizes — separate with pipes (|)',         example: 'S|M|L|XL' },
  { name: 'colors',      required: false, description: 'Available colors — separate with pipes (|)',        example: 'Red|Green|Blue' },
]

// ── Shared style constants ────────────────────────────────────────────────────
const field = 'w-full rounded-lg border border-lm-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lm-indigo/30 focus:border-lm-indigo/50 bg-white placeholder:text-lm-muted/50'
const btnPrimary = 'inline-flex items-center gap-2 bg-lm-indigo text-white text-[0.86rem] font-semibold px-4 py-2 rounded-lg hover:bg-lm-indigo-mid transition-colors disabled:opacity-50'
const btnGhost = 'inline-flex items-center gap-1.5 text-[0.86rem] font-medium text-lm-muted hover:text-lm-indigo px-3 py-2 rounded-lg hover:bg-lm-surface transition-colors'
const btnOutline = 'inline-flex items-center gap-1.5 border border-lm-border text-[0.86rem] font-medium text-lm-indigo px-4 py-2 rounded-lg hover:bg-lm-surface transition-colors'
