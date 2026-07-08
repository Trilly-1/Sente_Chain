package memberships

import (
	"os"
	"strings"
)

// SkipKYC is true when SKIP_KYC=true|1|yes.
// TESTING ONLY — set false (or unset) before pilot so document KYC is enforced again.
func SkipKYC() bool {
	v := strings.ToLower(strings.TrimSpace(os.Getenv("SKIP_KYC")))
	return v == "true" || v == "1" || v == "yes"
}
