package audit

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v4/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(ctx context.Context, req *CreateRequest) (*Log, error) {
	if req == nil {
		return nil, fmt.Errorf("audit CreateRequest cannot be nil")
	}

	details := req.Details
	if details == nil {
		details = map[string]interface{}{}
	}
	detailsJSON, err := json.Marshal(details)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal audit details: %w", err)
	}

	log := &Log{}
	query := `
		INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, actor_user_id, action, entity_type, entity_id, details, created_at
	`

	err = r.db.QueryRow(ctx, query,
		req.ActorUserID, req.Action, req.EntityType, req.EntityID, detailsJSON,
	).Scan(
		&log.ID,
		&log.ActorUserID,
		&log.Action,
		&log.EntityType,
		&log.EntityID,
		&log.Details,
		&log.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create audit log: %w", err)
	}

	return log, nil
}

func (r *Repository) List(ctx context.Context, limit, offset int) ([]*Log, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}

	query := `
		SELECT id, actor_user_id, action, entity_type, entity_id, details, created_at
		FROM audit_logs
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := r.db.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list audit logs: %w", err)
	}
	defer rows.Close()

	var logs []*Log
	for rows.Next() {
		log := &Log{}
		err := rows.Scan(
			&log.ID,
			&log.ActorUserID,
			&log.Action,
			&log.EntityType,
			&log.EntityID,
			&log.Details,
			&log.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan audit log: %w", err)
		}
		logs = append(logs, log)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating audit logs: %w", err)
	}

	return logs, nil
}

func (r *Repository) Count(ctx context.Context) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM audit_logs`).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count audit logs: %w", err)
	}
	return count, nil
}
