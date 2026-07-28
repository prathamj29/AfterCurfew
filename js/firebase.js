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
