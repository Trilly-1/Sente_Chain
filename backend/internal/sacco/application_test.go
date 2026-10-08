package sacco

import "testing"

func TestMissingApplicationFieldsRequiresSetupSteps(t *testing.T) {
	msg := missingApplicationFields(map[string]interface{}{})
	if msg != "SACCO type is required before submitting" {
		t.Fatalf("got %q", msg)
	}

	profile := map[string]interface{}{
		"type":           "Deposit-taking",
		"address":        "Kampala Road",
		"phone":          "+256700000000",
		"email":          "info@sacco.com",
		"chairman_name":  "Amina",
		"chairman_id":    "CM123",
		"secretary_name": "Brian",
		"secretary_id":   "SC456",
	}
	if msg = missingApplicationFields(profile); msg != "" {
		t.Fatalf("complete application should pass, got %q", msg)
	}
}
