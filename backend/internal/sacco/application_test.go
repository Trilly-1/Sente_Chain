package sacco

import (
	"testing"

	"sentechain-backend/internal/documents"
)

func TestMissingApplicationFieldsRequiresEveryStep(t *testing.T) {
	msg := missingApplicationFields(map[string]interface{}{}, nil)
	if msg != "SACCO type is required before submitting" {
		t.Fatalf("got %q", msg)
	}

	profile := map[string]interface{}{
		"type":            "Deposit-taking",
		"address":         "Kampala Road",
		"phone":           "+256700000000",
		"email":           "info@sacco.com",
		"chairman_name":   "Amina",
		"chairman_id":     "CM123",
		"chairman_image":  "data:image/jpeg;base64,abc",
		"secretary_name":  "Brian",
		"secretary_id":    "SC456",
		"secretary_image": "data:image/jpeg;base64,def",
	}
	docs := []*documents.Document{
		{DocumentType: "registration_certificate", FileURL: "https://files/reg.pdf"},
		{DocumentType: "operational_license", FileURL: "https://files/lic.pdf"},
	}
	msg = missingApplicationFields(profile, docs)
	if msg != "upload the TIN certificate before submitting" {
		t.Fatalf("got %q", msg)
	}

	docs = append(docs, &documents.Document{DocumentType: "tin_certificate", FileURL: "https://files/tin.pdf"})
	if msg = missingApplicationFields(profile, docs); msg != "" {
		t.Fatalf("complete application should pass, got %q", msg)
	}
}
