#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, Map, String, Symbol, Vec,
    log,
};

// ─── Storage Keys ────────────────────────────────────────────────────────────

const CONFIG_KEY: Symbol = symbol_short!("CONFIG");
const MEMBERS_KEY: Symbol = symbol_short!("MEMBERS");
const LOANS_KEY: Symbol = symbol_short!("LOANS");
const LOAN_CTR: Symbol = symbol_short!("LOAN_CTR");
const PROPOSALS_KEY: Symbol = symbol_short!("PROPOSALS");
const PROPOSAL_CTR: Symbol = symbol_short!("PROP_CTR");
const TREASURY_KEY: Symbol = symbol_short!("TREASURY");

// ─── Data Types ──────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug)]
pub struct SaccoConfig {
    pub admin: Address,
    pub sacco_name: String,
    /// Annual interest rate in basis points (1500 = 15%)
    pub interest_rate_bps: u64,
    /// Max loan = multiplier × savings (300 = 3×)
    pub loan_multiplier: u64,
    /// Minimum months of saving before loan eligibility
    pub min_saving_months: u64,
    pub total_members: u64,
    pub total_deposits: u64,
    pub total_loans_disbursed: u64,
    pub initialized: bool,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum MemberStatus {
    Active,
    Suspended,
    Exited,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Member {
    pub address: Address,
    pub name: String,
    pub phone: String,
    pub total_savings: u64,
    pub saving_months: u64,
    pub active_loans: u64,
    pub total_borrowed: u64,
    pub total_repaid: u64,
    pub status: MemberStatus,
    pub joined_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum LoanStatus {
    Pending,
    Approved,
    Disbursed,
    Repaid,
    Defaulted,
    Rejected,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Loan {
    pub id: u64,
    pub borrower: Address,
    pub principal: u64,
    pub interest: u64,
    pub total_due: u64,
    pub total_repaid: u64,
    pub term_months: u64,
    pub purpose: String,
    pub status: LoanStatus,
    pub requested_at: u64,
    pub approved_at: u64,
    pub disbursed_at: u64,
    pub mobile_money_ref: String,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum ProposalType {
    ChangeInterestRate,
    ChangeLoanMultiplier,
    ChangeMinSavingMonths,
    General,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum ProposalStatus {
    Active,
    Passed,
    Rejected,
    Executed,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Proposal {
    pub id: u64,
    pub proposer: Address,
    pub proposal_type: ProposalType,
    pub description: String,
    pub new_value: u64,
    pub votes_for: u64,
    pub votes_against: u64,
    pub status: ProposalStatus,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct EligibilityResult {
    pub eligible: bool,
    pub max_loan_amount: u64,
    pub reason: String,
}

// ─── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct SaccoContract;

#[contractimpl]
impl SaccoContract {

    // ── Initialize ────────────────────────────────────────────────────────────

    pub fn initialize(
        env: Env,
        admin: Address,
        sacco_name: String,
    ) {
        if env.storage().instance().has(&CONFIG_KEY) {
            panic!("Already initialized");
        }

        admin.require_auth();

        let config = SaccoConfig {
            admin,
            sacco_name,
            interest_rate_bps: 1500, // 15% annual
            loan_multiplier: 300,    // 3× savings
            min_saving_months: 3,
            total_members: 0,
            total_deposits: 0,
            total_loans_disbursed: 0,
            initialized: true,
        };

        env.storage().instance().set(&CONFIG_KEY, &config);
        env.storage().instance().set(&TREASURY_KEY, &0u64);
        env.storage().instance().set(&LOAN_CTR, &0u64);
        env.storage().instance().set(&PROPOSAL_CTR, &0u64);

        log!(&env, "SenteChain SACCO initialized");
    }

    // ── Admin: Register Member ────────────────────────────────────────────────

    pub fn register_member(
        env: Env,
        admin: Address,
        member_address: Address,
        name: String,
        phone: String,
    ) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);

        let mut members: Map<Address, Member> = env
            .storage()
            .instance()
            .get(&MEMBERS_KEY)
            .unwrap_or(Map::new(&env));

        if members.contains_key(member_address.clone()) {
            panic!("Member already registered");
        }

        let member = Member {
            address: member_address.clone(),
            name,
            phone,
            total_savings: 0,
            saving_months: 0,
            active_loans: 0,
            total_borrowed: 0,
            total_repaid: 0,
            status: MemberStatus::Active,
            joined_at: env.ledger().timestamp(),
        };

        members.set(member_address, member);
        env.storage().instance().set(&MEMBERS_KEY, &members);

        let mut config: SaccoConfig = env.storage().instance().get(&CONFIG_KEY).unwrap();
        config.total_members += 1;
        env.storage().instance().set(&CONFIG_KEY, &config);
    }

    // ── Admin: Record Deposit ─────────────────────────────────────────────────

    pub fn record_deposit(
        env: Env,
        admin: Address,
        member_address: Address,
        amount: u64,
        mobile_money_ref: String,
        month_key: u64,
    ) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);

        if amount == 0 {
            panic!("Deposit amount must be greater than zero");
        }

        let mut members: Map<Address, Member> = env
            .storage()
            .instance()
            .get(&MEMBERS_KEY)
            .unwrap_or(Map::new(&env));

        let mut member = members.get(member_address.clone()).expect("Member not found");

        if member.status != MemberStatus::Active {
            panic!("Member is not active");
        }

        member.total_savings += amount;
        // Track unique saving months via month_key
        // Simple approach: increment if this month hasn't been counted
        // In production, you'd track a set of month_keys per member
        member.saving_months += 1;

        members.set(member_address, member);
        env.storage().instance().set(&MEMBERS_KEY, &members);

        // Update treasury
        let mut treasury: u64 = env.storage().instance().get(&TREASURY_KEY).unwrap_or(0);
        treasury += amount;
        env.storage().instance().set(&TREASURY_KEY, &treasury);

        // Update config totals
        let mut config: SaccoConfig = env.storage().instance().get(&CONFIG_KEY).unwrap();
        config.total_deposits += amount;
        env.storage().instance().set(&CONFIG_KEY, &config);

        log!(&env, "Deposit recorded: {} ref:{} month:{}", amount, mobile_money_ref, month_key);
    }

    // ── Member: Check Loan Eligibility ────────────────────────────────────────

    pub fn check_loan_eligibility(env: Env, member_address: Address) -> EligibilityResult {
        let config: SaccoConfig = env.storage().instance().get(&CONFIG_KEY).unwrap();
        let members: Map<Address, Member> = env
            .storage()
            .instance()
            .get(&MEMBERS_KEY)
            .unwrap_or(Map::new(&env));

        let member = match members.get(member_address) {
            Some(m) => m,
            None => return EligibilityResult {
                eligible: false,
                max_loan_amount: 0,
                reason: String::from_str(&env, "Member not found"),
            },
        };

        if member.status != MemberStatus::Active {
            return EligibilityResult {
                eligible: false,
                max_loan_amount: 0,
                reason: String::from_str(&env, "Member account is not active"),
            };
        }

        if member.saving_months < config.min_saving_months {
            return EligibilityResult {
                eligible: false,
                max_loan_amount: 0,
                reason: String::from_str(&env, "Insufficient saving history (min 3 months required)"),
            };
        }

        if member.active_loans >= 2 {
            return EligibilityResult {
                eligible: false,
                max_loan_amount: 0,
                reason: String::from_str(&env, "Maximum active loans reached (limit: 2)"),
            };
        }

        let treasury: u64 = env.storage().instance().get(&TREASURY_KEY).unwrap_or(0);
        let max_loan = (member.total_savings * config.loan_multiplier) / 100;

        if treasury < max_loan {
            return EligibilityResult {
                eligible: false,
                max_loan_amount: treasury,
                reason: String::from_str(&env, "Insufficient treasury funds"),
            };
        }

        EligibilityResult {
            eligible: true,
            max_loan_amount: max_loan,
            reason: String::from_str(&env, "Eligible for loan"),
        }
    }

    // ── Member: Request Loan ──────────────────────────────────────────────────

    pub fn request_loan(
        env: Env,
        member_address: Address,
        amount: u64,
        term_months: u64,
        purpose: String,
    ) -> u64 {
        member_address.require_auth();

        if amount == 0 {
            panic!("Loan amount must be greater than zero");
        }
        if term_months == 0 || term_months > 24 {
            panic!("Term must be between 1 and 24 months");
        }

        let eligibility = Self::check_loan_eligibility(env.clone(), member_address.clone());
        if !eligibility.eligible {
            panic!("Not eligible for loan");
        }
        if amount > eligibility.max_loan_amount {
            panic!("Amount exceeds maximum eligible loan");
        }

        let config: SaccoConfig = env.storage().instance().get(&CONFIG_KEY).unwrap();

        // Interest = Principal × Rate × Term / (10000 × 12)
        let interest = (amount * config.interest_rate_bps * term_months) / (10000 * 12);
        let total_due = amount + interest;

        let mut loan_counter: u64 = env.storage().instance().get(&LOAN_CTR).unwrap_or(0);
        loan_counter += 1;

        let loan = Loan {
            id: loan_counter,
            borrower: member_address.clone(),
            principal: amount,
            interest,
            total_due,
            total_repaid: 0,
            term_months,
            purpose,
            status: LoanStatus::Pending,
            requested_at: env.ledger().timestamp(),
            approved_at: 0,
            disbursed_at: 0,
            mobile_money_ref: String::from_str(&env, ""),
        };

        let mut loans: Map<u64, Loan> = env
            .storage()
            .instance()
            .get(&LOANS_KEY)
            .unwrap_or(Map::new(&env));

        loans.set(loan_counter, loan);
        env.storage().instance().set(&LOANS_KEY, &loans);
        env.storage().instance().set(&LOAN_CTR, &loan_counter);

        log!(&env, "Loan requested: id={} amount={} term={}", loan_counter, amount, term_months);
        loan_counter
    }

    // ── Admin: Approve Loan ───────────────────────────────────────────────────

    pub fn approve_loan(env: Env, admin: Address, loan_id: u64) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);

        let mut loans: Map<u64, Loan> = env
            .storage()
            .instance()
            .get(&LOANS_KEY)
            .unwrap_or(Map::new(&env));

        let mut loan = loans.get(loan_id).expect("Loan not found");

        if loan.status != LoanStatus::Pending {
            panic!("Loan is not in pending state");
        }

        loan.status = LoanStatus::Approved;
        loan.approved_at = env.ledger().timestamp();

        loans.set(loan_id, loan);
        env.storage().instance().set(&LOANS_KEY, &loans);

        log!(&env, "Loan approved: id={}", loan_id);
    }

    // ── Admin: Reject Loan ────────────────────────────────────────────────────

    pub fn reject_loan(env: Env, admin: Address, loan_id: u64) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);

        let mut loans: Map<u64, Loan> = env
            .storage()
            .instance()
            .get(&LOANS_KEY)
            .unwrap_or(Map::new(&env));

        let mut loan = loans.get(loan_id).expect("Loan not found");

        if loan.status != LoanStatus::Pending {
            panic!("Loan is not in pending state");
        }

        loan.status = LoanStatus::Rejected;
        loans.set(loan_id, loan);
        env.storage().instance().set(&LOANS_KEY, &loans);
    }

    // ── Admin: Disburse Loan ──────────────────────────────────────────────────

    pub fn disburse_loan(
        env: Env,
        admin: Address,
        loan_id: u64,
        mobile_money_ref: String,
    ) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);

        let mut loans: Map<u64, Loan> = env
            .storage()
            .instance()
            .get(&LOANS_KEY)
            .unwrap_or(Map::new(&env));

        let mut loan = loans.get(loan_id).expect("Loan not found");

        if loan.status != LoanStatus::Approved {
            panic!("Loan must be approved before disbursement");
        }

        // Deduct from treasury
        let mut treasury: u64 = env.storage().instance().get(&TREASURY_KEY).unwrap_or(0);
        if treasury < loan.principal {
            panic!("Insufficient treasury funds");
        }
        treasury -= loan.principal;
        env.storage().instance().set(&TREASURY_KEY, &treasury);

        loan.status = LoanStatus::Disbursed;
        loan.disbursed_at = env.ledger().timestamp();
        loan.mobile_money_ref = mobile_money_ref;

        // Update member active loans
        let mut members: Map<Address, Member> = env
            .storage()
            .instance()
            .get(&MEMBERS_KEY)
            .unwrap_or(Map::new(&env));

        let mut member = members.get(loan.borrower.clone()).expect("Member not found");
        member.active_loans += 1;
        member.total_borrowed += loan.principal;
        members.set(loan.borrower.clone(), member);
        env.storage().instance().set(&MEMBERS_KEY, &members);

        loans.set(loan_id, loan.clone());
        env.storage().instance().set(&LOANS_KEY, &loans);

        // Update config
        let mut config: SaccoConfig = env.storage().instance().get(&CONFIG_KEY).unwrap();
        config.total_loans_disbursed += loan.principal;
        env.storage().instance().set(&CONFIG_KEY, &config);

        log!(&env, "Loan disbursed: id={}", loan_id);
    }

    // ── Member: Repay Loan ────────────────────────────────────────────────────

    pub fn repay_loan(
        env: Env,
        member_address: Address,
        loan_id: u64,
        amount: u64,
        mobile_money_ref: String,
    ) {
        member_address.require_auth();

        if amount == 0 {
            panic!("Repayment amount must be greater than zero");
        }

        let mut loans: Map<u64, Loan> = env
            .storage()
            .instance()
            .get(&LOANS_KEY)
            .unwrap_or(Map::new(&env));

        let mut loan = loans.get(loan_id).expect("Loan not found");

        if loan.borrower != member_address {
            panic!("Not the loan borrower");
        }

        if loan.status != LoanStatus::Disbursed {
            panic!("Loan is not active for repayment");
        }

        let remaining = loan.total_due - loan.total_repaid;
        let actual_payment = if amount > remaining { remaining } else { amount };

        loan.total_repaid += actual_payment;

        // Add repayment back to treasury
        let mut treasury: u64 = env.storage().instance().get(&TREASURY_KEY).unwrap_or(0);
        treasury += actual_payment;
        env.storage().instance().set(&TREASURY_KEY, &treasury);

        // Check if fully repaid
        if loan.total_repaid >= loan.total_due {
            loan.status = LoanStatus::Repaid;

            // Update member
            let mut members: Map<Address, Member> = env
                .storage()
                .instance()
                .get(&MEMBERS_KEY)
                .unwrap_or(Map::new(&env));

            let mut member = members.get(member_address.clone()).expect("Member not found");
            if member.active_loans > 0 {
                member.active_loans -= 1;
            }
            member.total_repaid += loan.total_repaid;
            members.set(member_address, member);
            env.storage().instance().set(&MEMBERS_KEY, &members);
        }

        loans.set(loan_id, loan);
        env.storage().instance().set(&LOANS_KEY, &loans);

        log!(&env, "Repayment recorded: loan_id={} amount={} ref={}", loan_id, actual_payment, mobile_money_ref);
    }

    // ── Governance: Create Proposal ───────────────────────────────────────────

    pub fn create_proposal(
        env: Env,
        proposer: Address,
        proposal_type: ProposalType,
        description: String,
        new_value: u64,
    ) -> u64 {
        proposer.require_auth();
        Self::assert_active_member(&env, &proposer);

        let mut prop_counter: u64 = env.storage().instance().get(&PROPOSAL_CTR).unwrap_or(0);
        prop_counter += 1;

        let proposal = Proposal {
            id: prop_counter,
            proposer,
            proposal_type,
            description,
            new_value,
            votes_for: 0,
            votes_against: 0,
            status: ProposalStatus::Active,
            created_at: env.ledger().timestamp(),
        };

        let mut proposals: Map<u64, Proposal> = env
            .storage()
            .instance()
            .get(&PROPOSALS_KEY)
            .unwrap_or(Map::new(&env));

        proposals.set(prop_counter, proposal);
        env.storage().instance().set(&PROPOSALS_KEY, &proposals);
        env.storage().instance().set(&PROPOSAL_CTR, &prop_counter);

        prop_counter
    }

    // ── Governance: Vote ──────────────────────────────────────────────────────

    pub fn vote(
        env: Env,
        voter: Address,
        proposal_id: u64,
        vote_for: bool,
    ) {
        voter.require_auth();
        Self::assert_active_member(&env, &voter);

        let mut proposals: Map<u64, Proposal> = env
            .storage()
            .instance()
            .get(&PROPOSALS_KEY)
            .unwrap_or(Map::new(&env));

        let mut proposal = proposals.get(proposal_id).expect("Proposal not found");

        if proposal.status != ProposalStatus::Active {
            panic!("Proposal is not active");
        }

        if vote_for {
            proposal.votes_for += 1;
        } else {
            proposal.votes_against += 1;
        }

        // Check quorum: 51% of total members
        let config: SaccoConfig = env.storage().instance().get(&CONFIG_KEY).unwrap();
        let total_votes = proposal.votes_for + proposal.votes_against;
        let quorum = (config.total_members * 51) / 100;

        if total_votes >= config.total_members && proposal.votes_for > quorum {
            proposal.status = ProposalStatus::Passed;
        } else if total_votes >= config.total_members && proposal.votes_for <= quorum {
            proposal.status = ProposalStatus::Rejected;
        }

        proposals.set(proposal_id, proposal);
        env.storage().instance().set(&PROPOSALS_KEY, &proposals);
    }

    // ── Governance: Execute Proposal ──────────────────────────────────────────

    pub fn execute_proposal(env: Env, admin: Address, proposal_id: u64) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);

        let mut proposals: Map<u64, Proposal> = env
            .storage()
            .instance()
            .get(&PROPOSALS_KEY)
            .unwrap_or(Map::new(&env));

        let mut proposal = proposals.get(proposal_id).expect("Proposal not found");

        if proposal.status != ProposalStatus::Passed {
            panic!("Proposal has not passed");
        }

        let mut config: SaccoConfig = env.storage().instance().get(&CONFIG_KEY).unwrap();

        match proposal.proposal_type {
            ProposalType::ChangeInterestRate => {
                config.interest_rate_bps = proposal.new_value;
            }
            ProposalType::ChangeLoanMultiplier => {
                config.loan_multiplier = proposal.new_value;
            }
            ProposalType::ChangeMinSavingMonths => {
                config.min_saving_months = proposal.new_value;
            }
            ProposalType::General => {
                // General motions — no config change, just mark executed
            }
        }

        env.storage().instance().set(&CONFIG_KEY, &config);
        proposal.status = ProposalStatus::Executed;
        proposals.set(proposal_id, proposal);
        env.storage().instance().set(&PROPOSALS_KEY, &proposals);
    }

    // ── View: Get SACCO Config ────────────────────────────────────────────────

    pub fn get_sacco_config(env: Env) -> SaccoConfig {
        env.storage().instance().get(&CONFIG_KEY).expect("Not initialized")
    }

    // ── View: Get Member Info ─────────────────────────────────────────────────

    pub fn get_member_info(env: Env, member_address: Address) -> Member {
        let members: Map<Address, Member> = env
            .storage()
            .instance()
            .get(&MEMBERS_KEY)
            .unwrap_or(Map::new(&env));
        members.get(member_address).expect("Member not found")
    }

    // ── View: Get Loan Info ───────────────────────────────────────────────────

    pub fn get_loan_info(env: Env, loan_id: u64) -> Loan {
        let loans: Map<u64, Loan> = env
            .storage()
            .instance()
            .get(&LOANS_KEY)
            .unwrap_or(Map::new(&env));
        loans.get(loan_id).expect("Loan not found")
    }

    // ── View: Get Treasury Balance ────────────────────────────────────────────

    pub fn get_treasury_balance(env: Env) -> u64 {
        env.storage().instance().get(&TREASURY_KEY).unwrap_or(0)
    }

    // ── View: Get Proposal ────────────────────────────────────────────────────

    pub fn get_proposal(env: Env, proposal_id: u64) -> Proposal {
        let proposals: Map<u64, Proposal> = env
            .storage()
            .instance()
            .get(&PROPOSALS_KEY)
            .unwrap_or(Map::new(&env));
        proposals.get(proposal_id).expect("Proposal not found")
    }

    // ── Admin: Suspend Member ─────────────────────────────────────────────────

    pub fn suspend_member(env: Env, admin: Address, member_address: Address) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);

        let mut members: Map<Address, Member> = env
            .storage()
            .instance()
            .get(&MEMBERS_KEY)
            .unwrap_or(Map::new(&env));

        let mut member = members.get(member_address.clone()).expect("Member not found");
        member.status = MemberStatus::Suspended;
        members.set(member_address, member);
        env.storage().instance().set(&MEMBERS_KEY, &members);
    }

    // ── Admin: Reactivate Member ──────────────────────────────────────────────

    pub fn reactivate_member(env: Env, admin: Address, member_address: Address) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);

        let mut members: Map<Address, Member> = env
            .storage()
            .instance()
            .get(&MEMBERS_KEY)
            .unwrap_or(Map::new(&env));

        let mut member = members.get(member_address.clone()).expect("Member not found");
        member.status = MemberStatus::Active;
        members.set(member_address, member);
        env.storage().instance().set(&MEMBERS_KEY, &members);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    fn assert_admin(env: &Env, caller: &Address) {
        let config: SaccoConfig = env.storage().instance().get(&CONFIG_KEY).expect("Not initialized");
        if config.admin != *caller {
            panic!("Caller is not the admin");
        }
    }

    fn assert_active_member(env: &Env, caller: &Address) {
        let members: Map<Address, Member> = env
            .storage()
            .instance()
            .get(&MEMBERS_KEY)
            .unwrap_or(Map::new(env));
        let member = members.get(caller.clone()).expect("Member not found");
        if member.status != MemberStatus::Active {
            panic!("Member is not active");
        }
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    fn setup() -> (Env, SaccoContractClient<'static>, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, SaccoContract);
        let client = SaccoContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        client.initialize(&admin, &String::from_str(&env, "Kampala Teachers SACCO"));
        (env, client, admin)
    }

    #[test]
    fn test_initialize() {
        let (env, client, _admin) = setup();
        let config = client.get_sacco_config();
        assert_eq!(config.sacco_name, String::from_str(&env, "Kampala Teachers SACCO"));
        assert_eq!(config.interest_rate_bps, 1500);
        assert_eq!(config.loan_multiplier, 300);
        assert_eq!(config.min_saving_months, 3);
    }

    #[test]
    fn test_register_member() {
        let (env, client, admin) = setup();
        let member = Address::generate(&env);
        client.register_member(
            &admin,
            &member,
            &String::from_str(&env, "Alice Nakato"),
            &String::from_str(&env, "+256700000001"),
        );
        let info = client.get_member_info(&member);
        assert_eq!(info.name, String::from_str(&env, "Alice Nakato"));
        assert_eq!(info.total_savings, 0);
    }

    #[test]
    fn test_deposit_and_eligibility() {
        let (env, client, admin) = setup();
        let member = Address::generate(&env);

        client.register_member(
            &admin,
            &member,
            &String::from_str(&env, "Bob Mukasa"),
            &String::from_str(&env, "+256700000002"),
        );

        // Deposit for 3 months
        for month in 1u64..=3 {
            client.record_deposit(
                &admin,
                &member,
                &100_000u64,
                &String::from_str(&env, "MTN-TXN"),
                &(202400 + month),
            );
        }

        let info = client.get_member_info(&member);
        assert_eq!(info.total_savings, 300_000);
        assert_eq!(info.saving_months, 3);

        let eligibility = client.check_loan_eligibility(&member);
        assert!(eligibility.eligible);
        assert_eq!(eligibility.max_loan_amount, 900_000); // 3× savings
    }

    #[test]
    fn test_full_loan_lifecycle() {
        let (env, client, admin) = setup();
        let member = Address::generate(&env);

        client.register_member(
            &admin,
            &member,
            &String::from_str(&env, "Carol Atim"),
            &String::from_str(&env, "+256700000003"),
        );

        // 3 months deposits of 200k each
        for month in 1u64..=3 {
            client.record_deposit(
                &admin,
                &member,
                &200_000u64,
                &String::from_str(&env, "MTN-TXN"),
                &(202400 + month),
            );
        }

        // Request loan
        let loan_id = client.request_loan(
            &member,
            &300_000u64,
            &6u64,
            &String::from_str(&env, "School fees"),
        );
        assert_eq!(loan_id, 1);

        // Approve
        client.approve_loan(&admin, &loan_id);
        let loan = client.get_loan_info(&loan_id);
        assert_eq!(loan.status, LoanStatus::Approved);

        // Disburse
        client.disburse_loan(&admin, &loan_id, &String::from_str(&env, "MTN-DISB-001"));
        let loan = client.get_loan_info(&loan_id);
        assert_eq!(loan.status, LoanStatus::Disbursed);

        // Repay full amount
        client.repay_loan(
            &member,
            &loan_id,
            &loan.total_due,
            &String::from_str(&env, "MTN-REPAY-001"),
        );
        let loan = client.get_loan_info(&loan_id);
        assert_eq!(loan.status, LoanStatus::Repaid);
    }

    #[test]
    #[should_panic(expected = "Not eligible for loan")]
    fn test_ineligible_loan_request() {
        let (env, client, admin) = setup();
        let member = Address::generate(&env);

        client.register_member(
            &admin,
            &member,
            &String::from_str(&env, "Dan Okello"),
            &String::from_str(&env, "+256700000004"),
        );

        // Only 1 month of savings — not enough
        client.record_deposit(
            &admin,
            &member,
            &100_000u64,
            &String::from_str(&env, "MTN-TXN"),
            &202401u64,
        );

        client.request_loan(
            &member,
            &100_000u64,
            &3u64,
            &String::from_str(&env, "Business"),
        );
    }
}