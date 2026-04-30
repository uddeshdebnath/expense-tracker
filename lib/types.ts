export type Category = {
  id: string
  name: string
  icon: string | null
  color: string | null
}

export type Subcategory = {
  id: string
  category_id: string
  name: string
}

export type Expense = {
  id: string
  household_id: string
  month_id: string
  category_id: string
  subcategory_id: string | null
  amount: number
  paid_by: string          // user UUID
  split_type: 'equal' | 'custom'
  split_value: number      // 0.5 = equal, 0.7 = payer covers 70%
  date: string
  description: string | null
  is_recurring: boolean
  created_at: string
  // joined
  categories?: { name: string; icon: string | null }
  subcategories?: { name: string } | null
}

export type NewExpense = {
  household_id: string
  month_id: string
  category_id: string
  subcategory_id: string | null
  amount: number
  paid_by: string
  split_type: 'equal' | 'custom'
  split_value: number
  date: string
  description: string | null
  is_recurring: boolean
}