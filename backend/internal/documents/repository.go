package documents

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v4/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(ctx context.Context, ownerType string, ownerID, uploadedBy string, input Input) (*Document, error) {
	doc := &Document{}
	query := `
		INSERT INTO documents (owner_type, owner_id, document_type, file_url, file_name, mime_type, uploaded_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, owner_type, owner_id, document_type, file_url, file_name, mime_type, uploaded_by, created_at
	`

	err := r.db.QueryRow(ctx, query,
		ownerType, ownerID, input.DocumentType, input.FileURL, input.FileName, input.MimeType, uploadedBy,
	).Scan(
		&doc.ID,
		&doc.OwnerType,
		&doc.OwnerID,
		&doc.DocumentType,
		&doc.FileURL,
		&doc.FileName,
		&doc.MimeType,
		&doc.UploadedBy,
		&doc.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create document: %w", err)
	}

	return doc, nil
}

func (r *Repository) ListByOwner(ctx context.Context, ownerType, ownerID string) ([]*Document, error) {
	query := `
		SELECT id, owner_type, owner_id, document_type, file_url, file_name, mime_type, uploaded_by, created_at
		FROM documents
		WHERE owner_type = $1 AND owner_id = $2
		ORDER BY created_at ASC
	`

	rows, err := r.db.Query(ctx, query, ownerType, ownerID)
	if err != nil {
		return nil, fmt.Errorf("failed to list documents: %w", err)
	}
	defer rows.Close()

	var docs []*Document
	for rows.Next() {
		doc := &Document{}
		err := rows.Scan(
			&doc.ID,
			&doc.OwnerType,
			&doc.OwnerID,
			&doc.DocumentType,
			&doc.FileURL,
			&doc.FileName,
			&doc.MimeType,
			&doc.UploadedBy,
			&doc.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan document: %w", err)
		}
		docs = append(docs, doc)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating documents: %w", err)
	}

	return docs, nil
}
