package database

import "testing"

func TestNormalizeDatabaseURL(t *testing.T) {
	raw := "postgresql://user:secret@ep-example-pooler.neon.tech/neondb?sslmode=require&channel_binding=require"
	got := normalizeDatabaseURL(raw)
	want := "postgresql://user:secret@ep-example-pooler.neon.tech/neondb?sslmode=require"
	if got != want {
		t.Fatalf("got %q, want %q", got, want)
	}
}

func TestNormalizeDatabaseURLWithoutQuery(t *testing.T) {
	raw := "postgresql://user:secret@localhost/neondb"
	if got := normalizeDatabaseURL(raw); got != raw {
		t.Fatalf("got %q, want %q", got, raw)
	}
}
