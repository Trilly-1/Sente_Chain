// src/data/demo.js — Uganda-first demo data (UGX amounts; field names kept for compatibility)
export const ALL_SACCOS = [
  { id: "SACCO01", name: "Kampala Teachers SACCO", registration: "SACCO/UG/2019/00142", last_updated: "30 March 2026, 10:14 AM", country: "UG" },
  { id: "SACCO02", name: "Jinja Market Traders SACCO", registration: "SACCO/UG/2021/00882", last_updated: "24 April 2026, 02:22 PM", country: "UG" },
  { id: "SACCO03", name: "Mbarara Dairy Farmers SACCO", registration: "SACCO/UG/2020/00331", last_updated: "25 April 2026, 09:15 AM", country: "UG" },
  { id: "SACCO04", name: "Gulu Coffee Growers Coop", registration: "SACCO/UG/2022/01042", last_updated: "25 April 2026, 11:30 AM", country: "UG" },
]

export const SACCO_INFO = ALL_SACCOS[0]

export const DEMO_USERS = [
  { phone:"0700000001", pin:"1234", role_code:null,     role:"member",  name:"Sarah Nambi",   member_id:"MBR001", sacco_id:"SACCO01", balance_kes:2475000, status:"active",    joined:"2024-01-15" },
  { phone:"0700000002", pin:"5678", role_code:"CSH2026", role:"cashier", name:"John Okello",  member_id:"CSH001", sacco_id:"SACCO01", balance_kes:0,       status:"active",    joined:"2023-06-01" },
  { phone:"0700000003", pin:"9012", role_code:"ADM2026", role:"admin",   name:"Grace Akello", member_id:"ADM001", sacco_id:"SACCO01", balance_kes:0,       status:"active",    joined:"2023-01-01" },
  { phone:"+256700000000", pin:"1234", role_code:null, role:"member",  name:"Jackson J.K.", member_id:"MBR006", sacco_id:"SACCO01", balance_kes:1500000, status:"active",    joined:"2024-04-22" },
  { phone:"0722111222", pin:"2026", role_code:null,     role:"member",  name:"David Mugisha", member_id:"MBR007", sacco_id:"SACCO02", balance_kes:1250000, status:"active",    joined:"2026-04-25" },
  { phone:"0711222333", pin:"2026", role_code:null,     role:"member",  name:"Jane Auma",    member_id:"MBR008", sacco_id:"SACCO01", balance_kes:0,       status:"pending_kyc", joined:"2026-04-25" },
  { phone:"0711222444", pin:"2026", role_code:null,     role:"member",  name:"Mark Ssebunya", member_id:"MBR009", sacco_id:"SACCO01", balance_kes:0,       status:"under_review", joined:"2026-04-25" },
]

export const DEMO_MEMBERS = [
  { member_id:"MBR001", name:"Sarah Nambi",   phone:"0700000001", balance_kes:2475000, status:"active",    role:"member",  joined:"2024-01-15" },
  { member_id:"MBR002", name:"James Mugisha", phone:"0750000002", balance_kes:1200000, status:"active",    role:"member",  joined:"2024-02-10" },
  { member_id:"MBR003", name:"Mary Namukasa", phone:"0780000003", balance_kes:3800000, status:"active",    role:"member",  joined:"2023-11-20" },
  { member_id:"MBR004", name:"Peter Okot",    phone:"0770000004", balance_kes:950000,  status:"suspended", role:"member",  joined:"2023-08-05" },
  { member_id:"MBR005", name:"Agnes Atuhaire", phone:"0760000005", balance_kes:5100000, status:"active",    role:"member",  joined:"2023-07-14" },
  { member_id:"CSH001", name:"John Okello",   phone:"0700000002", balance_kes:0,       status:"active",    role:"cashier", joined:"2023-06-01" },
  { member_id:"ADM001", name:"Grace Akello",  phone:"0700000003", balance_kes:0,       status:"active",    role:"admin",   joined:"2023-01-01" },
  { member_id:"MBR006", name:"Jackson J.K.",  phone:"+256700000000", balance_kes:1500000, status:"active",    role:"member",  joined:"2024-04-22" },
  { member_id:"MBR007", name:"David Mugisha", phone:"0722111222", balance_kes:1250000, status:"active",    role:"member",  joined:"2026-04-25" },
]

export const DEMO_TRANSACTIONS = {
  MBR001: [
    { id:"TX001", member_id:"MBR001", type:"Deposit",   amount_kes:800000,  entry_type:"MOMO", status:"confirmed", stellar_tx_hash:"a3f8c2d19e7b4056", recorded_at:"2026-03-20T10:23:00Z" },
    { id:"TX002", member_id:"MBR001", type:"Deposit",   amount_kes:500000,  entry_type:"MOMO", status:"confirmed", stellar_tx_hash:"b7d4e19845ac3102", recorded_at:"2026-03-14T08:11:00Z" },
    { id:"TX003", member_id:"MBR001", type:"Deposit",   amount_kes:300000,  entry_type:"MOMO", status:"confirmed", stellar_tx_hash:"c9e2f311ab023456", recorded_at:"2026-03-10T14:45:00Z" },
    { id:"TX004", member_id:"MBR001", type:"Loan",      amount_kes:2000000, entry_type:"ADMIN", status:"confirmed", stellar_tx_hash:"d4a7b20912ef5678", recorded_at:"2026-03-01T09:00:00Z" },
    { id:"TX005", member_id:"MBR001", type:"Repayment", amount_kes:500000,  entry_type:"MOMO", status:"confirmed", stellar_tx_hash:"e2b9a4f067cd8901", recorded_at:"2026-03-05T11:30:00Z" },
  ],
  MBR002: [
    { id:"TX006", member_id:"MBR002", type:"Deposit",   amount_kes:600000,  entry_type:"MOMO", status:"confirmed", stellar_tx_hash:"f3c8d10234ab5678", recorded_at:"2026-03-18T09:00:00Z" },
    { id:"TX007", member_id:"MBR002", type:"Deposit",   amount_kes:400000,  entry_type:"MOMO", status:"confirmed", stellar_tx_hash:"g4d9e21345bc6789", recorded_at:"2026-03-12T10:00:00Z" },
    { id:"TX008", member_id:"MBR002", type:"Loan",      amount_kes:1500000, entry_type:"ADMIN", status:"confirmed", stellar_tx_hash:"h5e0f32456cd7890", recorded_at:"2026-02-20T08:00:00Z" },
  ],
  MBR003: [
    { id:"TX009", member_id:"MBR003", type:"Deposit",   amount_kes:2000000, entry_type:"MOMO", status:"confirmed", stellar_tx_hash:"i6f1a43567de8901", recorded_at:"2026-03-19T12:00:00Z" },
    { id:"TX010", member_id:"MBR003", type:"Deposit",   amount_kes:1800000, entry_type:"MOMO", status:"confirmed", stellar_tx_hash:"j7a2b54678ef9012", recorded_at:"2026-03-08T15:00:00Z" },
    { id:"TX011", member_id:"MBR003", type:"Repayment", amount_kes:1000000, entry_type:"MOMO", status:"confirmed", stellar_tx_hash:"k8b3c65789f00123", recorded_at:"2026-03-03T07:00:00Z" },
  ],
  MBR004: [
    { id:"TX012", member_id:"MBR004", type:"Deposit",   amount_kes:450000,  entry_type:"MOMO", status:"confirmed", stellar_tx_hash:"l9c4d76890a01234", recorded_at:"2026-02-28T11:00:00Z" },
    { id:"TX013", member_id:"MBR004", type:"Loan",      amount_kes:1000000, entry_type:"ADMIN", status:"confirmed", stellar_tx_hash:"m0d5e87901b12345", recorded_at:"2026-02-15T09:00:00Z" },
  ],
  MBR005: [
    { id:"TX014", member_id:"MBR005", type:"Deposit",   amount_kes:3000000, entry_type:"MOMO", status:"confirmed", stellar_tx_hash:"n1e6f98012c23456", recorded_at:"2026-03-21T08:00:00Z" },
    { id:"TX015", member_id:"MBR005", type:"Deposit",   amount_kes:2100000, entry_type:"MOMO", status:"confirmed", stellar_tx_hash:"o2f7a09123d34567", recorded_at:"2026-03-11T16:00:00Z" },
    { id:"TX016", member_id:"MBR005", type:"Repayment", amount_kes:800000,  entry_type:"MOMO", status:"confirmed", stellar_tx_hash:"p3a8b10234e45678", recorded_at:"2026-02-25T13:00:00Z" },
  ],
  MBR007: [
    { id:"TX017", member_id:"MBR007", type:"Deposit",   amount_kes:500000,  entry_type:"MOMO", status:"confirmed", stellar_tx_hash:"q4b9c21345f56789", recorded_at:"2026-04-25T10:00:00Z" },
    { id:"TX018", member_id:"MBR007", type:"Deposit",   amount_kes:750000,  entry_type:"MOMO", status:"confirmed", stellar_tx_hash:"r5c0d32456g67890", recorded_at:"2026-04-25T12:30:00Z" },
  ],
}

export const LOAN_APPLICATIONS = [
  { id:"LNR001", member_id:"MBR002", member_name:"James Mugisha", phone:"0750000002", amount_requested:5000000,  purpose:"School fees Kampala Parents School", status:"pending",   applied_on:"2026-03-28", interest_rate:12, term_months:6,  monthly_installment:908300,  total_repayable:5450000,  total_interest:450000,  disbursed_on:null, first_payment_due:null, final_payment_due:null, collateral:"Land title Wakiso", guarantor:"Agnes Atuhaire (MBR005)", savings_balance:1200000, repaid_so_far:0, balance_remaining:0, payments_made:0, payments_total:6, next_payment_date:null, next_payment_amount:null, payments_schedule:[] },
  { id:"LNR002", member_id:"MBR005", member_name:"Agnes Atuhaire", phone:"0760000005", amount_requested:12000000, purpose:"Wholesale business expansion", status:"pending", applied_on:"2026-03-29", interest_rate:12, term_months:12, monthly_installment:1060000, total_repayable:12720000, total_interest:720000, disbursed_on:null, first_payment_due:null, final_payment_due:null, collateral:"Motor vehicle UBJ 234C", guarantor:"Sarah Nambi (MBR001)", savings_balance:5100000, repaid_so_far:0, balance_remaining:0, payments_made:0, payments_total:12, next_payment_date:null, next_payment_amount:null, payments_schedule:[] },
  { id:"LNR003", member_id:"MBR001", member_name:"Sarah Nambi", phone:"0700000001", amount_requested:2000000, purpose:"Medical expenses", status:"active", applied_on:"2026-02-15", interest_rate:12, term_months:6, monthly_installment:353300, total_repayable:2120000, total_interest:120000, disbursed_on:"2026-03-01", first_payment_due:"2026-04-01", final_payment_due:"2026-09-01", collateral:"None", guarantor:"James Mugisha (MBR002)", savings_balance:2475000, repaid_so_far:500000, balance_remaining:1620000, payments_made:1, payments_total:6, next_payment_date:"2026-04-01", next_payment_amount:353300, payments_schedule:[
    {month:1,due_date:"2026-04-01",principal:333300,interest:20000,total:353300,status:"upcoming"},
    {month:2,due_date:"2026-05-01",principal:333300,interest:20000,total:353300,status:"upcoming"},
    {month:3,due_date:"2026-06-01",principal:333300,interest:20000,total:353300,status:"upcoming"},
    {month:4,due_date:"2026-07-01",principal:333300,interest:20000,total:353300,status:"upcoming"},
    {month:5,due_date:"2026-08-01",principal:333300,interest:20000,total:353300,status:"upcoming"},
    {month:6,due_date:"2026-09-01",principal:333500,interest:0,total:333500,status:"upcoming"},
  ]},
  { id:"LNR004", member_id:"MBR002", member_name:"James Mugisha", phone:"0750000002", amount_requested:1500000, purpose:"Home repairs", status:"active", applied_on:"2026-01-10", interest_rate:12, term_months:3, monthly_installment:515000, total_repayable:1545000, total_interest:45000, disbursed_on:"2026-02-20", first_payment_due:"2026-03-20", final_payment_due:"2026-05-20", collateral:"None", guarantor:"Mary Namukasa (MBR003)", savings_balance:1200000, repaid_so_far:515000, balance_remaining:1030000, payments_made:1, payments_total:3, next_payment_date:"2026-04-20", next_payment_amount:515000, payments_schedule:[
    {month:1,due_date:"2026-03-20",principal:500000,interest:15000,total:515000,status:"paid"},
    {month:2,due_date:"2026-04-20",principal:500000,interest:15000,total:515000,status:"upcoming"},
    {month:3,due_date:"2026-05-20",principal:500000,interest:15000,total:515000,status:"upcoming"},
  ]},
  { id:"LNR005", member_id:"MBR003", member_name:"Mary Namukasa", phone:"0780000003", amount_requested:3000000, purpose:"Agricultural inputs maize farming", status:"completed", applied_on:"2025-09-01", interest_rate:12, term_months:4, monthly_installment:795000, total_repayable:3180000, total_interest:180000, disbursed_on:"2025-09-10", first_payment_due:"2025-10-10", final_payment_due:"2026-01-10", collateral:"Produce store Mbarara", guarantor:"Sarah Nambi (MBR001)", savings_balance:3800000, repaid_so_far:3180000, balance_remaining:0, payments_made:4, payments_total:4, next_payment_date:null, next_payment_amount:null, payments_schedule:[
    {month:1,due_date:"2025-10-10",principal:750000,interest:45000,total:795000,status:"paid"},
    {month:2,due_date:"2025-11-10",principal:750000,interest:45000,total:795000,status:"paid"},
    {month:3,due_date:"2025-12-10",principal:750000,interest:45000,total:795000,status:"paid"},
    {month:4,due_date:"2026-01-10",principal:750000,interest:45000,total:795000,status:"paid"},
  ]},
]

const allTxs = Object.values(DEMO_TRANSACTIONS).flat()
export const SACCO_TOTALS = {
  total_deposits:    allTxs.filter(t=>t.type==="Deposit").reduce((s,t)=>s+t.amount_kes,0),
  total_loans:       allTxs.filter(t=>t.type==="Loan").reduce((s,t)=>s+t.amount_kes,0),
  total_repayments:  allTxs.filter(t=>t.type==="Repayment").reduce((s,t)=>s+t.amount_kes,0),
  active_members:    DEMO_MEMBERS.filter(m=>m.role==="member"&&m.status==="active").length,
  total_members:     DEMO_MEMBERS.filter(m=>m.role==="member").length,
  total_txs:         allTxs.length,
  active_loans:      LOAN_APPLICATIONS.filter(l=>l.status==="active").length,
  pending_loans:     LOAN_APPLICATIONS.filter(l=>l.status==="pending").length,
  loans_outstanding: LOAN_APPLICATIONS.filter(l=>l.status==="active").reduce((s,l)=>s+l.balance_remaining,0),
}

export const AUDIT_LOG = [
  { id:"AL001", admin:"Grace Akello", action:"Registered new member",      target:"Agnes Atuhaire (MBR005)", time:"2026-03-21T08:30:00Z" },
  { id:"AL002", admin:"Grace Akello", action:"Suspended member",           target:"Peter Okot (MBR004)",     time:"2026-03-15T10:00:00Z" },
  { id:"AL003", admin:"John Okello",  action:"Approved loan disbursement", target:"MBR001 UGX 2,000,000",    time:"2026-03-01T09:00:00Z" },
  { id:"AL004", admin:"Grace Akello", action:"Changed role",               target:"John Okello to cashier",  time:"2026-02-01T11:00:00Z" },
  { id:"AL005", admin:"John Okello",  action:"Approved loan disbursement", target:"MBR002 UGX 1,500,000",    time:"2026-02-20T08:00:00Z" },
  { id:"AL006", admin:"Grace Akello", action:"Registered new member",      target:"Peter Okot (MBR004)",     time:"2026-02-10T09:00:00Z" },
]
