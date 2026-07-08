package payments

import "testing"

func TestEncodeParseReference(t *testing.T) {
	ref := EncodeReference(PurposeLoanRepayment, "abc12345")
	if ref != "L-ABC12345" {
		t.Fatalf("encode: got %s", ref)
	}
	purpose, member := ParseReference("pay L-ABC12345 done")
	if purpose != PurposeLoanRepayment || member != "ABC12345" {
		t.Fatalf("parse: got %s %s", purpose, member)
	}
}
