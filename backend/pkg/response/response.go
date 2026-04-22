package response

// SuccessResponse is the standard success response format
type SuccessResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data"`
}

// ErrorResponse is the standard error response format
type ErrorResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

// Success returns a success response
func Success(data interface{}) SuccessResponse {
	return SuccessResponse{
		Success: true,
		Data:    data,
	}
}

// Error returns an error response
func Error(message string) ErrorResponse {
	return ErrorResponse{
		Success: false,
		Error:   message,
	}
}
