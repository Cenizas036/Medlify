import { useState, useCallback } from 'react'

const STORAGE_KEY = 'medlify_orders'

function loadIds() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

function saveIds(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
}

export function useOrders() {
  const [orderIds, setOrderIds] = useState(loadIds)

  const addOrderId = useCallback((id) => {
    setOrderIds(prev => {
      const next = [id, ...prev.filter(x => x !== id)]
      saveIds(next)
      return next
    })
  }, [])

  return { orderIds, addOrderId }
}
