import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'medlify_cart'

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}

function save(cart) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
}

export function useCart() {
  // cart shape: { [pharmacyId]: { pharmacyName, items: [{ medicine_id, name, price, quantity, maxQty, prescription }] } }
  const [cart, setCartState] = useState(load)

  const setCart = useCallback((updater) => {
    setCartState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      save(next)
      return next
    })
  }, [])

  // Reload from localStorage if another tab changes it
  useEffect(() => {
    const handler = () => setCartState(load())
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const addItem = useCallback((pharmacyId, pharmacyName, medicine) => {
    setCart(prev => {
      const group = prev[pharmacyId] || { pharmacyName, items: [] }
      const existing = group.items.findIndex(i => i.medicine_id === medicine.medicine_id)
      let items
      if (existing >= 0) {
        items = group.items.map((i, idx) =>
          idx === existing
            ? { ...i, quantity: Math.min(i.quantity + 1, i.maxQty) }
            : i
        )
      } else {
        items = [...group.items, { ...medicine, quantity: 1 }]
      }
      return { ...prev, [pharmacyId]: { pharmacyName, items } }
    })
  }, [setCart])

  const removeItem = useCallback((pharmacyId, medicineId) => {
    setCart(prev => {
      const group = prev[pharmacyId]
      if (!group) return prev
      const items = group.items.filter(i => i.medicine_id !== medicineId)
      if (items.length === 0) {
        const { [pharmacyId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [pharmacyId]: { ...group, items } }
    })
  }, [setCart])

  const updateQty = useCallback((pharmacyId, medicineId, qty) => {
    setCart(prev => {
      const group = prev[pharmacyId]
      if (!group) return prev
      if (qty < 1) {
        const items = group.items.filter(i => i.medicine_id !== medicineId)
        if (items.length === 0) {
          const { [pharmacyId]: _, ...rest } = prev
          return rest
        }
        return { ...prev, [pharmacyId]: { ...group, items } }
      }
      const items = group.items.map(i =>
        i.medicine_id === medicineId ? { ...i, quantity: Math.min(qty, i.maxQty) } : i
      )
      return { ...prev, [pharmacyId]: { ...group, items } }
    })
  }, [setCart])

  const clearPharmacy = useCallback((pharmacyId) => {
    setCart(prev => {
      const { [pharmacyId]: _, ...rest } = prev
      return rest
    })
  }, [setCart])

  const clearCart = useCallback(() => setCart({}), [setCart])

  const totalCount = Object.values(cart).reduce((sum, g) => sum + g.items.length, 0)
  const grandTotal = Object.values(cart).reduce(
    (sum, g) => sum + g.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0), 0
  )

  return { cart, addItem, removeItem, updateQty, clearPharmacy, clearCart, totalCount, grandTotal }
}
