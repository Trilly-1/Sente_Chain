package documents

import (
	"time"

	"github.com/google/uuid"
)

const (
	OwnerTypeMembership = "membership"
	OwnerTypeSacco      = "sacco"
)

// Document stores KYC/compliance file metadata (not binary content)
type Document struct {
	ID           uuid.UUID `json:"id"`
	OwnerType    string    `json:"owner_type"`
	OwnerID      uuid.UUID `json:"owner_id"`
	DocumentType string    `json:"document_type"`
	FileURL      string    `json:"-"` // withheld from member-facing responses unless authorized
	FileName     *string   `json:"file_name,omitempty"`
	MimeType     *string   `json:"mime_type,omitempty"`
	UploadedBy   uuid.UUID `json:"uploaded_by"`
	CreatedAt    time.Time `json:"created_at"`
}

// PublicView is a safe document representation without file URL
type PublicView struct {
	ID           string  `json:"id"`
	DocumentType string  `json:"document_type"`
	FileName     *string `json:"file_name,omitempty"`
	MimeType     *string `json:"mime_type,omitempty"`
	CreatedAt    string  `json:"created_at"`
}

// AdminView includes file URL for project admin review
type AdminView struct {
	PublicView
	FileURL string `json:"file_url"`
}

// Input is the payload for creating a document record
type Input struct {
	DocumentType string  `json:"document_type"`
	FileURL      string  `json:"file_url"`
	FileName     *string `json:"file_name,omitempty"`
	MimeType     *string `json:"mime_type,omitempty"`
}

// UploadRequest wraps multiple document inputs
type UploadRequest struct {
	Documents []Input `json:"documents"`
}

func ToPublicView(doc *Document) PublicView {
	return PublicView{
		ID:           doc.ID.String(),
		DocumentType: doc.DocumentType,
		FileName:     doc.FileName,
		MimeType:     doc.MimeType,
		CreatedAt:    doc.CreatedAt.Format(time.RFC3339),
	}
}

func ToAdminView(doc *Document) AdminView {
	return AdminView{
		PublicView: ToPublicView(doc),
		FileURL:    doc.FileURL,
	}
}
