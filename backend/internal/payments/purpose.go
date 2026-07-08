package payments

import (
	"regexp"
	"strings"
)

const (
	PurposeSavings        = "savings"
	PurposeLoanRepayment  = "loan_repayment"
	PurposeInterest       = "interest"
)

// EncodeReference builds a USSD/MoMo reference: {purposeCode}-{memberRef}
// e.g. S-A1B2C3D4 savings, L-A1B2C3D4 loan repayment, I-A1B2C3D4 interest
func EncodeReference(purpose, memberRef string) string {
	code := "S"
	switch purpose {
	case PurposeLoanRepayment:
		code = "L"
	case PurposeInterest:
		code = "I"
	}
	return code + "-" + strings.ToUpper(memberRef)
}

// ParseReference extracts purpose and member ref from payment reference text.
func ParseReference(ref string) (purpose, memberRef string) {
	ref = strings.TrimSpace(strings.ToUpper(ref))
	if ref == "" {
		return PurposeSavings, ""
	}
	// Find encoded token anywhere in payer message (e.g. "PAY L-ABC12345 DONE")
	re := regexp.MustCompile(`([SLI])-([A-Z0-9]{4,})`)
	if m := re.FindStringSubmatch(ref); len(m) == 3 {
		switch m[1] {
		case "L":
			return PurposeLoanRepayment, m[2]
		case "I":
			return PurposeInterest, m[2]
		case "S":
			return PurposeSavings, m[2]
		}
	}
	if len(ref) >= 3 && ref[1] == '-' {
		switch ref[0] {
		case 'L':
			return PurposeLoanRepayment, ref[2:]
		case 'I':
			return PurposeInterest, ref[2:]
		case 'S':
			return PurposeSavings, ref[2:]
		}
	}
	return PurposeSavings, strings.ReplaceAll(ref, "-", "")
}
