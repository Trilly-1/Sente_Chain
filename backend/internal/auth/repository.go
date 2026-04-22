package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) CreateIdentity(ctx context.Context, req *CreateIdentityRequest) (*Identity, error) {
	if req == nil {
		return nil, errors.New("CreateIdentityRequest cannot be nil")
	}

	validProvider := false
	for _, vp := range ValidProviders {
		if req.Provider == vp {
			validProvider = true
			break
		}
	}
	if !validProvider {
		return nil, fmt.Errorf("invalid provider: %s", req.Provider)
	}

	identity := &Identity{}
	query := `
		INSERT INTO auth_identities (user_id, provider, provider_user_id)
		VALUES ($1, $2, $3)
		RETURNING id, user_id, provider, provider_user_id, created_at
	`

	err := r.db.QueryRow(ctx, query, req.UserID, req.Provider, req.ProviderUserID).Scan(
		&identity.ID,
		&identity.UserID,
		&identity.Provider,
		&identity.ProviderUserID,
		&identity.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create identity: %w", err)
	}

	return identity, nil
}

func (r *Repository) GetIdentityByProvider(ctx context.Context, provider, providerUserID string) (*Identity, error) {
	validProvider := false
	for _, vp := range ValidProviders {
		if provider == vp {
			validProvider = true
			break
		}
	}
	if !validProvider {
		return nil, fmt.Errorf("invalid provider: %s", provider)
	}

	identity := &Identity{}
	query := `
		SELECT id, user_id, provider, provider_user_id, created_at
		FROM auth_identities
		WHERE provider = $1 AND provider_user_id = $2
	`

	err := r.db.QueryRow(ctx, query, provider, providerUserID).Scan(
		&identity.ID,
		&identity.UserID,
		&identity.Provider,
		&identity.ProviderUserID,
		&identity.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to get identity: %w", err)
	}

	return identity, nil
}

func (r *Repository) CreateOTP(ctx context.Context, phone, codeHash string, expiresAt time.Time) (*OTPCode, error) {
	if phone == "" {
		return nil, errors.New("phone cannot be empty")
	}
	if codeHash == "" {
		return nil, errors.New("codeHash cannot be empty")
	}

	otp := &OTPCode{}
	query := `
		INSERT INTO otp_codes (phone, code_hash, expires_at, used)
		VALUES ($1, $2, $3, false)
		RETURNING id, phone, code_hash, expires_at, used, created_at
	`

	err := r.db.QueryRow(ctx, query, phone, codeHash, expiresAt).Scan(
		&otp.ID,
		&otp.Phone,
		&otp.CodeHash,
		&otp.ExpiresAt,
		&otp.Used,
		&otp.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to create OTP: %w", err)
	}

	return otp, nil
}

func (r *Repository) GetLatestOTPByPhone(ctx context.Context, phone string) (*OTPCode, error) {
	if phone == "" {
		return nil, errors.New("phone cannot be empty")
	}

	otp := &OTPCode{}
	query := `
		SELECT id, phone, code_hash, expires_at, used, created_at
		FROM otp_codes
		WHERE phone = $1 AND used = false AND expires_at > NOW()
		ORDER BY created_at DESC
		LIMIT 1
	`

	err := r.db.QueryRow(ctx, query, phone).Scan(
		&otp.ID,
		&otp.Phone,
		&otp.CodeHash,
		&otp.ExpiresAt,
		&otp.Used,
		&otp.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to get OTP: %w", err)
	}

	return otp, nil
}

func (r *Repository) MarkOTPAsUsed(ctx context.Context, otpID string) error {
	query := `
		UPDATE otp_codes
		SET used = true
		WHERE id = $1
	`

	_, err := r.db.Exec(ctx, query, otpID)
	if err != nil {
		return fmt.Errorf("failed to mark OTP as used: %w", err)
	}

	return nil
}
package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) CreateIdentity(ctx context.Context, req *CreateIdentityRequest) (*Identity, error) {
	if req == nil {
		return nil, errors.New("CreateIdentityRequest cannot be nil")
	}

	validProvider := false
	for _, vp := range ValidProviders {
		if req.Provider == vp {
			validProvider = true
			break
		}
	}
	if !validProvider {
		return nil, fmt.Errorf("invalid provider: %s", req.Provider)
	}

	identity := &Identity{}
	query := `
		INSERT INTO auth_identities (user_id, provider, provider_user_id)
		VALUES ($1, $2, $3)
		RETURNING id, user_id, provider, provider_user_id, created_at
	`

	err := r.db.QueryRow(ctx, query, req.UserID, req.Provider, req.ProviderUserID).Scan(
		&identity.ID,
		&identity.UserID,
		&identity.Provider,
		&identity.ProviderUserID,
		&identity.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create identity: %w", err)
	}

	return identity, nil
}

func (r *Repository) GetIdentityByProvider(ctx context.Context, provider, providerUserID string) (*Identity, error) {
	validProvider := false
	for _, vp := range ValidProviders {
		if provider == vp {
			validProvider = true
			break
		}
	}
	if !validProvider {
		return nil, fmt.Errorf("invalid provider: %s", provider)
	}

	identity := &Identity{}
	query := `
		SELECT id, user_id, provider, provider_user_id, created_at
		FROM auth_identities
		WHERE provider = $1 AND provider_user_id = $2
	`

	err := r.db.QueryRow(ctx, query, provider, providerUserID).Scan(
		&identity.ID,
		&identity.UserID,
		&identity.Provider,
		&identity.ProviderUserID,
		&identity.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to get identity: %w", err)
	}

	return identity, nil
}

func (r *Repository) CreateOTP(ctx context.Context, phone, codeHash string, expiresAt time.Time) (*OTPCode, error) {
	if phone == "" {
		return nil, errors.New("phone cannot be empty")
	}
	if codeHash == "" {
		return nil, errors.New("codeHash cannot be empty")
	}

	otp := &OTPCode{}
	query := `
		INSERT INTO otp_codes (phone, code_hash, expires_at, used)
		VALUES ($1, $2, $3, false)
		RETURNING id, phone, code_hash, expires_at, used, created_at
	`

	err := r.db.QueryRow(ctx, query, phone, codeHash, expiresAt).Scan(
		&otp.ID,
		&otp.Phone,
		&otp.CodeHash,
		&otp.ExpiresAt,
		&otp.Used,
		&otp.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to create OTP: %w", err)
	}

	return otp, nil
}

func (r *Repository) GetLatestOTPByPhone(ctx context.Context, phone string) (*OTPCode, error) {
	if phone == "" {
		return nil, errors.New("phone cannot be empty")
	}

	otp := &OTPCode{}
	query := `
		SELECT id, phone, code_hash, expires_at, used, created_at
		FROM otp_codes
		WHERE phone = $1 AND used = false AND expires_at > NOW()
		ORDER BY created_at DESC
		LIMIT 1
	`

	err := r.db.QueryRow(ctx, query, phone).Scan(
		&otp.ID,
		&otp.Phone,
		&otp.CodeHash,
		&otp.ExpiresAt,
		&otp.Used,
		&otp.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to get OTP: %w", err)
	}

	return otp, nil
}

func (r *Repository) MarkOTPAsUsed(ctx context.Context, otpID string) error {
	query := `
		UPDATE otp_codes
		SET used = true
		WHERE id = $1
	`

	_, err := r.db.Exec(ctx, query, otpID)
	if err != nil {
		return fmt.Errorf("failed to mark OTP as used: %w", err)
	}

	return nil
}
package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) CreateIdentity(ctx context.Context, req *CreateIdentityRequest) (*Identity, error) {
	if req == nil {
		return nil, errors.New("CreateIdentityRequest cannot be nil")
	}

	validProvider := false
	for _, vp := range ValidProviders {
		if req.Provider == vp {
			validProvider = true
			break
		}
	}
	if !validProvider {
		return nil, fmt.Errorf("invalid provider: %s", req.Provider)
	}

	identity := &Identity{}
	query := `
		INSERT INTO auth_identities (user_id, provider, provider_user_id)
		VALUES ($1, $2, $3)
		RETURNING id, user_id, provider, provider_user_id, created_at
	`

	err := r.db.QueryRow(ctx, query, req.UserID, req.Provider, req.ProviderUserID).Scan(
		&identity.ID,
		&identity.UserID,
		&identity.Provider,
		&identity.ProviderUserID,
		&identity.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create identity: %w", err)
	}

	return identity, nil
}

func (r *Repository) GetIdentityByProvider(ctx context.Context, provider, providerUserID string) (*Identity, error) {
	validProvider := false
	for _, vp := range ValidProviders {
		if provider == vp {
			validProvider = true
			break
		}
	}
	if !validProvider {
		return nil, fmt.Errorf("invalid provider: %s", provider)
	}

	identity := &Identity{}
	query := `
		SELECT id, user_id, provider, provider_user_id, created_at
		FROM auth_identities
		WHERE provider = $1 AND provider_user_id = $2
	`

	err := r.db.QueryRow(ctx, query, provider, providerUserID).Scan(
		&identity.ID,
		&identity.UserID,
		&identity.Provider,
		&identity.ProviderUserID,
		&identity.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to get identity: %w", err)
	}

	return identity, nil
}

func (r *Repository) CreateOTP(ctx context.Context, phone, codeHash string, expiresAt time.Time) (*OTPCode, error) {
	if phone == "" {
		return nil, errors.New("phone cannot be empty")
	}
	if codeHash == "" {
		return nil, errors.New("codeHash cannot be empty")
	}

	otp := &OTPCode{}
	query := `
		INSERT INTO otp_codes (phone, code_hash, expires_at, used)
		VALUES ($1, $2, $3, false)
		RETURNING id, phone, code_hash, expires_at, used, created_at
	`

	err := r.db.QueryRow(ctx, query, phone, codeHash, expiresAt).Scan(
		&otp.ID,
		&otp.Phone,
		&otp.CodeHash,
		&otp.ExpiresAt,
		&otp.Used,
		&otp.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to create OTP: %w", err)
	}

	return otp, nil
}

func (r *Repository) GetLatestOTPByPhone(ctx context.Context, phone string) (*OTPCode, error) {
	if phone == "" {
		return nil, errors.New("phone cannot be empty")
	}

	otp := &OTPCode{}
	query := `
		SELECT id, phone, code_hash, expires_at, used, created_at
		FROM otp_codes
		WHERE phone = $1 AND used = false AND expires_at > NOW()
		ORDER BY created_at DESC
		LIMIT 1
	`

	err := r.db.QueryRow(ctx, query, phone).Scan(
		&otp.ID,
		&otp.Phone,
		&otp.CodeHash,
		&otp.ExpiresAt,
		&otp.Used,
		&otp.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to get OTP: %w", err)
	}

	return otp, nil
}

func (r *Repository) MarkOTPAsUsed(ctx context.Context, otpID string) error {
	query := `
		UPDATE otp_codes
		SET used = true
		WHERE id = $1
	`

	_, err := r.db.Exec(ctx, query, otpID)
	if err != nil {
		return fmt.Errorf("failed to mark OTP as used: %w", err)
	}

	return nil
}
package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"
)

// Repository handles authentication data access
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository creates a new auth repository
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// CreateIdentity inserts a new authentication identity
func (r *Repository) CreateIdentity(ctx context.Context, req *CreateIdentityRequest) (*Identity, error) {
	if req == nil {
		return nil, errors.New("CreateIdentityRequest cannot be nil")
	}

	// Validate provider
	validProvider := false
	for _, vp := range ValidProviders {
		if req.Provider == vp {
			validProvider = true
			break
		}
	}
	if !validProvider {
		return nil, fmt.Errorf("invalid provider: %s", req.Provider)
	}

	identity := &Identity{}
	query := `
		INSERT INTO auth_identities (user_id, provider, provider_user_id)
		VALUES ($1, $2, $3)
		RETURNING id, user_id, provider, provider_user_id, created_at
	`

	err := r.db.QueryRow(ctx, query, req.UserID, req.Provider, req.ProviderUserID).Scan(
		&identity.ID,
		&identity.UserID,
		&identity.Provider,
		&identity.ProviderUserID,
		&identity.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create identity: %w", err)
	}

	return identity, nil
}

// GetIdentityByProvider retrieves an identity by provider and provider user ID
func (r *Repository) GetIdentityByProvider(ctx context.Context, provider, providerUserID string) (*Identity, error) {
	// Validate provider
	validProvider := false
	for _, vp := range ValidProviders {
		if provider == vp {
			validProvider = true
			break
		}
	}
	if !validProvider {
		return nil, fmt.Errorf("invalid provider: %s", provider)
	}

	identity := &Identity{}
	query := `
		SELECT id, user_id, provider, provider_user_id, created_at
		FROM auth_identities
		WHERE provider = $1 AND provider_user_id = $2
	`

	err := r.db.QueryRow(ctx, query, provider, providerUserID).Scan(
		&identity.ID,
		&identity.UserID,
		&identity.Provider,
		&identity.ProviderUserID,
		&identity.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to get identity: %w", err)
	}

	return identity, nil
}

// CreateOTP inserts a new OTP code
func (r *Repository) CreateOTP(ctx context.Context, phone, codeHash string, expiresAt time.Time) (*OTPCode, error) {
	if phone == "" {
		return nil, errors.New("phone cannot be empty")
	}
	if codeHash == "" {
		return nil, errors.New("codeHash cannot be empty")
	}

	otp := &OTPCode{}
	query := `
		INSERT INTO otp_codes (phone, code_hash, expires_at, used)
		VALUES ($1, $2, $3, false)
		RETURNING id, phone, code_hash, expires_at, used, created_at
	`

	err := r.db.QueryRow(ctx, query, phone, codeHash, expiresAt).Scan(
		&otp.ID,
		&otp.Phone,
		&otp.CodeHash,
		&otp.ExpiresAt,
		&otp.Used,
		&otp.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to create OTP: %w", err)
	}

	return otp, nil
}

// GetLatestOTPByPhone retrieves the most recent unused OTP for a phone number
func (r *Repository) GetLatestOTPByPhone(ctx context.Context, phone string) (*OTPCode, error) {
	if phone == "" {
		return nil, errors.New("phone cannot be empty")
	}

	otp := &OTPCode{}
	query := `
		SELECT id, phone, code_hash, expires_at, used, created_at
		FROM otp_codes
		WHERE phone = $1 AND used = false AND expires_at > NOW()
		ORDER BY created_at DESC
		LIMIT 1
	`

	err := r.db.QueryRow(ctx, query, phone).Scan(
		&otp.ID,
		&otp.Phone,
		&otp.CodeHash,
		&otp.ExpiresAt,
		&otp.Used,
		&otp.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to get OTP: %w", err)
	}

	return otp, nil
}

// MarkOTPAsUsed marks an OTP as used
func (r *Repository) MarkOTPAsUsed(ctx context.Context, otpID string) error {
	query := `
		UPDATE otp_codes
		SET used = true
		WHERE id = $1
	`

	_, err := r.db.Exec(ctx, query, otpID)
	if err != nil {
		return fmt.Errorf("failed to mark OTP as used: %w", err)
	}

	return nil
}
package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"
)

// Repository handles authentication data access
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository creates a new auth repository
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// CreateIdentity inserts a new authentication identity
func (r *Repository) CreateIdentity(ctx context.Context, req *CreateIdentityRequest) (*Identity, error) {
	if req == nil {
		return nil, errors.New("CreateIdentityRequest cannot be nil")
	}

	// Validate provider
	validProvider := false
	for _, vp := range ValidProviders {
		if req.Provider == vp {
			validProvider = true
			break
		}
	}
	if !validProvider {
		return nil, fmt.Errorf("invalid provider: %s", req.Provider)
	}

	identity := &Identity{}
	query := `
		INSERT INTO auth_identities (user_id, provider, provider_user_id)
		VALUES ($1, $2, $3)
		RETURNING id, user_id, provider, provider_user_id, created_at
	`

	err := r.db.QueryRow(ctx, query, req.UserID, req.Provider, req.ProviderUserID).Scan(
		&identity.ID,
		&identity.UserID,
		&identity.Provider,
		&identity.ProviderUserID,
		&identity.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create identity: %w", err)
	}

	return identity, nil
}

// GetIdentityByProvider retrieves an identity by provider and provider user ID
func (r *Repository) GetIdentityByProvider(ctx context.Context, provider, providerUserID string) (*Identity, error) {
	// Validate provider
	validProvider := false
	for _, vp := range ValidProviders {
		if provider == vp {
			validProvider = true
			break
		}
	}
	if !validProvider {
		return nil, fmt.Errorf("invalid provider: %s", provider)
	}

	identity := &Identity{}
	query := `
		SELECT id, user_id, provider, provider_user_id, created_at
		FROM auth_identities
		WHERE provider = $1 AND provider_user_id = $2
	`

	err := r.db.QueryRow(ctx, query, provider, providerUserID).Scan(
		&identity.ID,
		&identity.UserID,
		&identity.Provider,
		&identity.ProviderUserID,
		&identity.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to get identity: %w", err)
	}

	return identity, nil
}

// CreateOTP inserts a new OTP code
func (r *Repository) CreateOTP(ctx context.Context, phone, codeHash string, expiresAt time.Time) (*OTPCode, error) {
	if phone == "" {
		return nil, errors.New("phone cannot be empty")
	}
	if codeHash == "" {
		return nil, errors.New("codeHash cannot be empty")
	}

	otp := &OTPCode{}
	query := `
		INSERT INTO otp_codes (phone, code_hash, expires_at, used)
		VALUES ($1, $2, $3, false)
		RETURNING id, phone, code_hash, expires_at, used, created_at
	`

	err := r.db.QueryRow(ctx, query, phone, codeHash, expiresAt).Scan(
		&otp.ID,
		&otp.Phone,
		&otp.CodeHash,
		&otp.ExpiresAt,
		&otp.Used,
		&otp.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to create OTP: %w", err)
	}

	return otp, nil
}

// GetLatestOTPByPhone retrieves the most recent unused OTP for a phone number
func (r *Repository) GetLatestOTPByPhone(ctx context.Context, phone string) (*OTPCode, error) {
	if phone == "" {
		return nil, errors.New("phone cannot be empty")
	}

	otp := &OTPCode{}
	query := `
		SELECT id, phone, code_hash, expires_at, used, created_at
		FROM otp_codes
		WHERE phone = $1 AND used = false AND expires_at > NOW()
		ORDER BY created_at DESC
		LIMIT 1
	`

	err := r.db.QueryRow(ctx, query, phone).Scan(
		&otp.ID,
		&otp.Phone,
		&otp.CodeHash,
		&otp.ExpiresAt,
		&otp.Used,
		&otp.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to get OTP: %w", err)
	}

	return otp, nil
}

// MarkOTPAsUsed marks an OTP as used
func (r *Repository) MarkOTPAsUsed(ctx context.Context, otpID string) error {
	query := `
		UPDATE otp_codes
		SET used = true
		WHERE id = $1
	`

	_, err := r.db.Exec(ctx, query, otpID)
	if err != nil {
		return fmt.Errorf("failed to mark OTP as used: %w", err)
	}

	return nil
}
package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"
)

// Repository handles authentication data access
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository creates a new auth repository
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// CreateIdentity inserts a new authentication identity
func (r *Repository) CreateIdentity(ctx context.Context, req *CreateIdentityRequest) (*Identity, error) {
	if req == nil {
		return nil, errors.New("CreateIdentityRequest cannot be nil")
	}

	// Validate provider
	validProvider := false
	for _, vp := range ValidProviders {
		if req.Provider == vp {
			validProvider = true
			break
		}
	}
	if !validProvider {
		return nil, fmt.Errorf("invalid provider: %s", req.Provider)
	}

	identity := &Identity{}
	query := `
		INSERT INTO auth_identities (user_id, provider, provider_user_id)
		VALUES ($1, $2, $3)
		RETURNING id, user_id, provider, provider_user_id, created_at
	`

	err := r.db.QueryRow(ctx, query, req.UserID, req.Provider, req.ProviderUserID).Scan(
		&identity.ID,
		&identity.UserID,
		&identity.Provider,
		&identity.ProviderUserID,
		&identity.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create identity: %w", err)
	}

	return identity, nil
}

// GetIdentityByProvider retrieves an identity by provider and provider user ID
func (r *Repository) GetIdentityByProvider(ctx context.Context, provider, providerUserID string) (*Identity, error) {
	// Validate provider
	validProvider := false
	for _, vp := range ValidProviders {
		if provider == vp {
			validProvider = true
			break
		}
	}
	if !validProvider {
		return nil, fmt.Errorf("invalid provider: %s", provider)
	}

	identity := &Identity{}
	query := `
		SELECT id, user_id, provider, provider_user_id, created_at
		FROM auth_identities
		WHERE provider = $1 AND provider_user_id = $2
	`

	err := r.db.QueryRow(ctx, query, provider, providerUserID).Scan(
		&identity.ID,
		&identity.UserID,
		&identity.Provider,
		&identity.ProviderUserID,
		&identity.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to get identity: %w", err)
	}

	return identity, nil
}

// CreateOTP inserts a new OTP code
func (r *Repository) CreateOTP(ctx context.Context, phone, codeHash string, expiresAt time.Time) (*OTPCode, error) {
	if phone == "" {
		return nil, errors.New("phone cannot be empty")
	}
	if codeHash == "" {
		return nil, errors.New("codeHash cannot be empty")
	}

	otp := &OTPCode{}
	query := `
		INSERT INTO otp_codes (phone, code_hash, expires_at, used)
		VALUES ($1, $2, $3, false)
		RETURNING id, phone, code_hash, expires_at, used, created_at
	`

	err := r.db.QueryRow(ctx, query, phone, codeHash, expiresAt).Scan(
		&otp.ID,
		&otp.Phone,
		&otp.CodeHash,
		&otp.ExpiresAt,
		&otp.Used,
		&otp.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to create OTP: %w", err)
	}

	return otp, nil
}

// GetLatestOTPByPhone retrieves the most recent unused OTP for a phone number
func (r *Repository) GetLatestOTPByPhone(ctx context.Context, phone string) (*OTPCode, error) {
	if phone == "" {
		return nil, errors.New("phone cannot be empty")
	}

	otp := &OTPCode{}
	query := `
		SELECT id, phone, code_hash, expires_at, used, created_at
		FROM otp_codes
		WHERE phone = $1 AND used = false AND expires_at > NOW()
		ORDER BY created_at DESC
		LIMIT 1
	`

	err := r.db.QueryRow(ctx, query, phone).Scan(
		&otp.ID,
		&otp.Phone,
		&otp.CodeHash,
		&otp.ExpiresAt,
		&otp.Used,
		&otp.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to get OTP: %w", err)
	}

	return otp, nil
}

// MarkOTPAsUsed marks an OTP as used
func (r *Repository) MarkOTPAsUsed(ctx context.Context, otpID string) error {
	query := `
		UPDATE otp_codes
		SET used = true
		WHERE id = $1
	`

	_, err := r.db.Exec(ctx, query, otpID)
	if err != nil {
		return fmt.Errorf("failed to mark OTP as used: %w", err)
	}

	return nil
}
package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"
)

// Repository handles authentication data access
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository creates a new auth repository
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// CreateIdentity inserts a new authentication identity
func (r *Repository) CreateIdentity(ctx context.Context, req *CreateIdentityRequest) (*Identity, error) {
	if req == nil {
		return nil, errors.New("CreateIdentityRequest cannot be nil")
	}

	// Validate provider
	validProvider := false
	for _, vp := range ValidProviders {
		if req.Provider == vp {
			validProvider = true
			break
		}
	}
	if !validProvider {
		return nil, fmt.Errorf("invalid provider: %s", req.Provider)
	}

	identity := &Identity{}
	query := `
		INSERT INTO auth_identities (user_id, provider, provider_user_id)
		VALUES ($1, $2, $3)
		RETURNING id, user_id, provider, provider_user_id, created_at
	`

	err := r.db.QueryRow(ctx, query, req.UserID, req.Provider, req.ProviderUserID).Scan(
		&identity.ID,
		&identity.UserID,
		&identity.Provider,
		&identity.ProviderUserID,
		&identity.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create identity: %w", err)
	}

	return identity, nil
}

// GetIdentityByProvider retrieves an identity by provider and provider user ID
func (r *Repository) GetIdentityByProvider(ctx context.Context, provider, providerUserID string) (*Identity, error) {
	// Validate provider
	validProvider := false
	for _, vp := range ValidProviders {
		if provider == vp {
			validProvider = true
			break
		}
	}
	if !validProvider {
		return nil, fmt.Errorf("invalid provider: %s", provider)
	}

	identity := &Identity{}
	query := `
		SELECT id, user_id, provider, provider_user_id, created_at
		FROM auth_identities
		WHERE provider = $1 AND provider_user_id = $2
	`

	err := r.db.QueryRow(ctx, query, provider, providerUserID).Scan(
		&identity.ID,
		&identity.UserID,
		&identity.Provider,
		&identity.ProviderUserID,
		&identity.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to get identity: %w", err)
	}

	return identity, nil
}

// CreateOTP inserts a new OTP code
func (r *Repository) CreateOTP(ctx context.Context, phone, codeHash string, expiresAt time.Time) (*OTPCode, error) {
	if phone == "" {
		return nil, errors.New("phone cannot be empty")
	}
	if codeHash == "" {
		return nil, errors.New("codeHash cannot be empty")
	}

	otp := &OTPCode{}
	query := `
		INSERT INTO otp_codes (phone, code_hash, expires_at, used)
		VALUES ($1, $2, $3, false)
		RETURNING id, phone, code_hash, expires_at, used, created_at
	`

	err := r.db.QueryRow(ctx, query, phone, codeHash, expiresAt).Scan(
		&otp.ID,
		&otp.Phone,
		&otp.CodeHash,
		&otp.ExpiresAt,
		&otp.Used,
		&otp.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to get OTP: %w", err)
	}

	return otp, nil
}

// MarkOTPAsUsed marks an OTP as used
func (r *Repository) MarkOTPAsUsed(ctx context.Context, otpID string) error {
	query := `
		UPDATE otp_codes
		SET used = true
		WHERE id = $1
	`

	_, err := r.db.Exec(ctx, query, otpID)
	if err != nil {
		return fmt.Errorf("failed to mark OTP as used: %w", err)
	}

	return nil
}

// GetLatestOTPByPhone retrieves the most recent unused OTP for a phone number
func (r *Repository) GetLatestOTPByPhone(ctx context.Context, phone string) (*OTPCode, error) {
	if phone == "" {
		return nil, errors.New("phone cannot be empty")
	}

	otp := &OTPCode{}
	query := `
		SELECT id, phone, code_hash, expires_at, used, created_at
		FROM otp_codes
		WHERE phone = $1 AND used = false AND expires_at > NOW()
		ORDER BY created_at DESC
		LIMIT 1
	`

	err := r.db.QueryRow(ctx, query, phone).Scan(
		&otp.ID,
		&otp.Phone,
		&otp.CodeHash,
		&otp.ExpiresAt,
		&otp.Used,
		&otp.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to get OTP: %w", err)
	}

	return otp, nil
}

	otp := &OTPCode{}
	query := `
		SELECT id, phone, code_hash, expires_at, used, created_at
		FROM otp_codes
		WHERE phone = $1 AND used = false AND expires_at > NOW()
		ORDER BY created_at DESC
		LIMIT 1
	`

	err := r.db.QueryRow(ctx, query, phone).Scan(
		&otp.ID,
		&otp.Phone,
		&otp.CodeHash,
		&otp.ExpiresAt,
		&otp.Used,
		&otp.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to get OTP: %w", err)
	}

	return otp, nil
}
