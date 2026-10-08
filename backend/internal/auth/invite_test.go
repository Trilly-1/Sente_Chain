package auth

import "testing"

func TestValidMemberPIN(t *testing.T) {
	if !validMemberPIN("1234") {
		t.Fatal("expected 1234 to be a valid member PIN")
	}
	for _, pin := range []string{"", "123", "12345", "12a4", "abcd"} {
		if validMemberPIN(pin) {
			t.Fatalf("expected %q to be rejected", pin)
		}
	}
}

func TestMemberInviteTokenTypeIsAllowed(t *testing.T) {
	found := false
	for _, tokenType := range ValidEmailTokenTypes {
		if tokenType == TokenMemberInvite {
			found = true
		}
	}
	if !found {
		t.Fatal("member invite token type is missing")
	}
}
