const STORAGE_KEY = 'aftercurfew-cart'

let cart = []
let listeners = []

function load() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) cart = JSON.parse(saved)
  } catch (e) {
    console.warn('Failed to load cart', e)
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
  listeners.forEach(fn => fn([...cart]))
}

load()

export function getCart() {
  return [...cart]
}

export function addItem(name, price, quantity = 1) {
  const existing = cart.find(i => i.name === name)
  if (existing) {
    existing.quantity += quantity
  } else {
    cart.push({ name, price: parseFloat(price), quantity })
  }
  save()
  return [...cart]
}

export function removeItem(index) {
  if (index >= 0 && index < cart.length) {
    cart.splice(index, 1)
    save()
  }
  return [...cart]
}

export function updateQuantity(index, qty) {
  if (index < 0 || index >= cart.length) return [...cart]
  if (qty <= 0) {
    cart.splice(index, 1)
  } else {
    cart[index].quantity = qty
  }
  save()
  return [...cart]
}

export function clearCart() {
  cart = []
  save()
  return []
}

export function getItemCount() {
  return cart.reduce((sum, item) => sum + item.quantity, 0)
}

export function getSubtotal() {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

export function onChange(fn) {
  listeners.push(fn)
  return () => {
    listeners = listeners.filter(l => l !== fn)
  }
}
