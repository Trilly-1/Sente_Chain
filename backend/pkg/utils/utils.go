package utils

import (
	"github.com/google/uuid"
)

func GenerateID() string {
	return uuid.New().String()
}

func IsValidUUID(id string) bool {
	_, err := uuid.Parse(id)
	return err == nil
}
