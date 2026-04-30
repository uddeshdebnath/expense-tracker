'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

const PARTNER_ID = "b35f5d4f-fdef-4387-97de-fdd48d272a32"

export default function DashboardPage() {
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [householdId, setHouseholdId] = useState<string | null>(null)

  const [expenses, setExpenses] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])

  const [monthId, setMonthId] = useState(
    new Date().toISOString().slice(0, 7)
  )

  const [form, setForm] = useState({
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    description: '',
    category_id: '',
    paid_by: '',
    split_type: 'equal' as 'equal' | 'custom',
    split_value: null as any,
  })

  const [customMode, setCustomMode] = useState<'percent' | 'amount'>('percent')
  const [submitting, setSubmitting] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'all'>('month')

  // INIT
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      setUserId(user.id)
      setForm((f) => ({ ...f, paid_by: user.id }))

      const { data: member } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .single()

      if (!member) return

      setHouseholdId(member.household_id)

      const { data: cats } = await supabase
        .from('categories')
        .select('*')
        .eq('household_id', member.household_id)

      setCategories(cats || [])

      fetchExpenses(member.household_id, monthId)
    }

    init()
  }, [])

  useEffect(() => {
    if (householdId) fetchExpenses(householdId, monthId)
  }, [monthId])

  async function fetchExpenses(hId: string, mId: string) {
    const { data } = await supabase
      .from('expenses')
      .select(`
        id, amount, date, description, paid_by,
        split_type, split_value,
        categories ( name )
      `)
      .eq('household_id', hId)
      .eq('month_id', mId)
      .order('date', { ascending: false })

    setExpenses(data || [])
  }

  // ADD EXPENSE
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.category_id || !form.amount) {
      alert('Fill required fields')
      return
    }

    setSubmitting(true)

    const payload = {
      household_id: householdId,
      category_id: form.category_id,
      amount: Number(form.amount),
      date: form.date,
      month_id: form.date.slice(0, 7),
      description: form.description || null,
      paid_by: form.paid_by,
      split_type: form.split_type,
      split_value:
        form.split_type === 'custom'
          ? { mode: customMode, ...(form.split_value || {}) }
          : null,
    }

    const { error } = await supabase.from('expenses').insert(payload)

    if (error) {
      alert(error.message)
      setSubmitting(false)
      return
    }

    setForm({
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      description: '',
      category_id: '',
      paid_by: userId || '',
      split_type: 'equal',
      split_value: null,
    })

    await fetchExpenses(householdId!, monthId)
    setSubmitting(false)
  }

  // CALCULATIONS (CORRECTED)
  const { total, mine, partner } = useMemo(() => {
    let total = 0
    let mine = 0
    let partner = 0

    expenses.forEach((e) => {
      const amount = Number(e.amount)
      total += amount

      // EQUAL SPLIT (FIXED)
      if (!e.split_type || e.split_type === 'equal') {
        mine += amount / 2
        partner += amount / 2
      }

      // CUSTOM SPLIT
      else if (e.split_type === 'custom' && e.split_value) {
        const s = e.split_value

        if (s.mode === 'percent') {
          mine += (amount * (s.you || 0)) / 100
          partner += (amount * (s.partner || 0)) / 100
        } else {
          mine += s.you || 0
          partner += s.partner || 0
        }
      }
    })

    return { total, mine, partner }
  }, [expenses, userId])

  // CATEGORY
  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {}

    expenses.forEach((e) => {
      const name = e.categories?.name || 'Other'
      map[name] = (map[name] || 0) + Number(e.amount)
    })

    return map
  }, [expenses])

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])
function groupExpenses(expenses: any[]) {
  const groups: Record<string, any[]> = {}

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(today.getDate() - 7)

  expenses.forEach((e) => {
    const expenseDate = new Date(e.date)

    // 🔴 FILTERING LOGIC
    if (viewMode === 'week') {
      if (expenseDate < sevenDaysAgo) return
    }

    let key = 'Older'

    // 🟢 GROUPING LOGIC
    if (viewMode === 'all') {
      key = e.date.slice(0, 7) // YYYY-MM
    } else {
      if (e.date === todayStr) key = 'Today'
      else key = 'Earlier'
    }

    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  })

  return groups
}

const groupedExpenses = groupExpenses(expenses)

  return (
  <>
    <main className="max-w-md mx-auto px-4 py-6 bg-gray-50 min-h-screen">

      <h1 className="text-2xl font-semibold mb-4">Expenses</h1>

<input
  type="month"
  value={monthId}
  onChange={(e) => setMonthId(e.target.value)}
  className="mb-4 border px-3 py-2 rounded-lg"
/>


      {/* SUMMARY */}
      <div className="bg-white p-4 rounded-lg mb-6 border">
        <p className="text-sm text-gray-500">This month together</p>
        <p className="text-xl font-semibold">₹{total}</p>

        <p className="text-sm text-gray-500">
          ₹{Math.round(mine)} you · ₹{Math.round(partner)} Srijita
        </p>
      </div>

      {/* CATEGORY */}
      <div className="bg-white p-4 rounded-lg mb-6 border">
        {sortedCategories.map(([name, value]) => (
          <div key={name} className="flex justify-between text-sm mb-1">
            <span>{name}</span>
            <span>₹{value}</span>
          </div>
        ))}
      </div>

      

      {/* FILTER TOGGLE */}
<div className="flex gap-2 mb-4">
  {['week', 'month', 'all'].map((mode) => (
    <button
      key={mode}
      onClick={() => setViewMode(mode as any)}
      className={`px-3 py-1 rounded-full text-sm ${
        viewMode === mode ? 'bg-black text-white' : 'bg-gray-200'
      }`}
    >
      {mode}
    </button>
  ))}
</div>

{/* LIST */}
<ul className="space-y-6">
  {Object.entries(groupedExpenses).map(([group, items]) => (
    <div key={group}>
      
      {/* GROUP HEADER */}
      <p className="text-xs text-gray-400 mb-2">{group}</p>

      <div className="space-y-3">
        {items.map((e: any) => (
          <li key={e.id} className="bg-white p-4 rounded-lg border">
            
            <div className="flex justify-between">
              <span>{e.categories?.name}</span>
              <span>₹{e.amount}</span>
            </div>

            <p className="text-xs text-gray-400">{e.date}</p>

            <p className="text-xs text-gray-500">
              {e.paid_by === userId ? 'You paid' : 'Srijita paid'}
            </p>

            {(!e.split_type || e.split_type === 'equal') ? (
              <p className="text-xs text-gray-400">Split: 50 / 50</p>
            ) : (
              <p className="text-xs text-gray-400">Custom split</p>
            )}

          </li>
        ))}
      </div>

    </div>
  ))}
</ul>

    </main>

{/* FLOATING ADD BUTTON */}
<button
  onClick={() => setShowModal(true)}
  className="fixed bottom-6 right-6 w-14 h-14 bg-black text-white rounded-full text-2xl flex items-center justify-center shadow-lg active:scale-95 transition"
>
  +
</button>

{showModal && (
  <div className="fixed inset-0 bg-black/40 flex items-end z-50">
    <div className="bg-white w-full rounded-t-3xl px-5 pt-4 pb-6 space-y-5 shadow-2xl">

      {/* HANDLE */}
<div className="flex justify-center">
  <div className="w-10 h-1.5 bg-gray-300 rounded-full mb-2" />
</div>

{/* CLOSE */}
<div className="flex justify-end">
        <button onClick={() => setShowModal(false)}>✕</button>
      </div>

      {/* FORM */}
      <form
        onSubmit={(e) => {
          handleSubmit(e)
          setShowModal(false)
        }}
        className="space-y-4"
      >

        <input
  type="number"
  placeholder="₹0"
  value={form.amount}
  onChange={(e) => setForm({ ...form, amount: e.target.value })}
  className="w-full text-3xl font-semibold border-none outline-none text-center"
/>

      <input
  type="date"
  value={form.date}
  onChange={(e) => setForm({ ...form, date: e.target.value })}
  className="w-full border px-3 py-2 rounded-lg"
/>

        <select
          value={form.category_id}
          onChange={(e) => setForm({ ...form, category_id: e.target.value })}
          className="w-full border px-3 py-2 rounded-lg"
        >
          <option value="">Select category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={form.paid_by}
          onChange={(e) => setForm({ ...form, paid_by: e.target.value })}
          className="w-full border px-3 py-2 rounded-lg"
        >
          <option value={userId || ''}>You</option>
          <option value={PARTNER_ID}>Srijita</option>
        </select>

        {/* SPLIT */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setForm({ ...form, split_type: 'equal', split_value: null })}
            className={`flex-1 py-2 rounded ${
              form.split_type === 'equal' ? 'bg-black text-white' : 'bg-gray-200'
            }`}
          >
            Equal
          </button>

          <button
            type="button"
            onClick={() => setForm({ ...form, split_type: 'custom' })}
            className={`flex-1 py-2 rounded ${
              form.split_type === 'custom' ? 'bg-black text-white' : 'bg-gray-200'
            }`}
          >
            Custom
          </button>
        </div>

        {/* CUSTOM */}
        {form.split_type === 'custom' && (
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="You"
              className="w-full border px-3 py-2 rounded-lg"
              onChange={(e) =>
                setForm({
                  ...form,
                  split_value: {
                    ...(form.split_value || {}),
                    you: Number(e.target.value),
                  },
                })
              }
            />

            <input
              type="number"
              placeholder="Srijita"
              className="w-full border px-3 py-2 rounded-lg"
              onChange={(e) =>
                setForm({
                  ...form,
                  split_value: {
                    ...(form.split_value || {}),
                    partner: Number(e.target.value),
                  },
                })
              }
            />
          </div>
        )}

        <button className="w-full bg-black text-white py-3 rounded-xl">
          {submitting ? 'Saving...' : 'Add Expense'}
        </button>

      </form>
    </div>
  </div>
)}

</>
)
}