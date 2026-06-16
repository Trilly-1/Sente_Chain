import axios from "axios"

const BASE = "https://api.sentechain.app"

export async function loginUser(phone, pin) {
  const res = await axios.post(`${BASE}/auth/login`, { phone, pin })
  return res.data
}