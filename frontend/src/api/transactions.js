import axios from "axios"

const BASE = "https://api.sentechain.app"

export async function recordLoan(data, token) {
  const res = await axios.post(`${BASE}/transactions/loan`, data, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.data
}

export async function recordRepayment(data, token) {
  const res = await axios.post(`${BASE}/transactions/repay`, data, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.data
}