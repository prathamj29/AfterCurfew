const FB_URL = 'https://aftercurfew-722d4-default-rtdb.asia-southeast1.firebasedatabase.app'

export async function fetchFirebaseData() {
  const res = await fetch(`${FB_URL}/.json`)
  const data = await res.json()
  return data
}

export async function updateProduct(index, updates) {
  await fetch(`${FB_URL}/products/${index}.json`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
}

export async function saveAllData(data) {
  await fetch(`${FB_URL}/.json`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function saveSiteConfig(config) {
  await fetch(`${FB_URL}/siteConfig.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
}

export async function fetchPromoCodes() {
  const res = await fetch(`${FB_URL}/promoCodes.json`)
  const data = await res.json()
  return data || {}
}

export async function savePromoCodes(codes) {
  await fetch(`${FB_URL}/promoCodes.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(codes),
  })
}

export async function incrementPromoUse(code) {
  const res = await fetch(`${FB_URL}/promoCodes/${code}/usageCount.json`)
  const current = (await res.json()) || 0
  await fetch(`${FB_URL}/promoCodes/${code}/usageCount.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(current + 1),
  })
}
