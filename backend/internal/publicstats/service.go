package publicstats

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v4/pgxpool"
)

// Stats holds platform-wide public metrics.
type Stats struct {
	ApprovedSaccos       int `json:"approved_saccos"`
	TotalMembers         int `json:"total_members"`
	ActiveMembers        int `json:"active_members"`
	TotalTransactions    int `json:"total_transactions"`
	AnchoredTransactions int `json:"anchored_transactions"`
}

type Service struct {
	db *pgxpool.Pool
}

func NewService(db *pgxpool.Pool) *Service {
	return &Service{db: db}
}

func (s *Service) GetPlatformStats(ctx context.Context, country string) (*Stats, error) {
	stats := &Stats{}

	saccoQuery := `SELECT COUNT(*)::int FROM saccos WHERE status = 'approved'`
	saccoArgs := []interface{}{}
	if country != "" {
		saccoQuery += ` AND country = $1`
		saccoArgs = append(saccoArgs, country)
	}
	if err := s.db.QueryRow(ctx, saccoQuery, saccoArgs...).Scan(&stats.ApprovedSaccos); err != nil {
		return nil, fmt.Errorf("count approved saccos: %w", err)
	}

	memberQuery := `
		SELECT
			COUNT(*)::int,
			COUNT(*) FILTER (WHERE status = 'active')::int
		FROM sacco_memberships
		WHERE role = 'member'
	`
	if err := s.db.QueryRow(ctx, memberQuery).Scan(&stats.TotalMembers, &stats.ActiveMembers); err != nil {
		return nil, fmt.Errorf("count members: %w", err)
	}

	txnQuery := `
		SELECT
			COUNT(*)::int,
			COUNT(*) FILTER (WHERE status = 'blockchain_verified')::int
		FROM transactions
	`
	if err := s.db.QueryRow(ctx, txnQuery).Scan(&stats.TotalTransactions, &stats.AnchoredTransactions); err != nil {
		return nil, fmt.Errorf("count transactions: %w", err)
	}

	return stats, nil
}
