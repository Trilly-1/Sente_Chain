import axios from "axios"

const BASE = "https://api.sentechain.app"

export async function getMemberTransactions(memberId, token) {
  const res = await axios.get(`${BASE}/members/${memberId}/transactions`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.data
}

export async function getSACCOSummary(saccoId) {
  const res = await axios.get(`${BASE}/sacco/${saccoId}/summary`)
  return res.data
}

export async function lookupMember(phone, token) {
  const res = await axios.get(`${BASE}/members/lookup?phone=${phone}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.data
}