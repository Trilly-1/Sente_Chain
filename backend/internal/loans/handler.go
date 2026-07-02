package loans

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"sentechain-backend/pkg/response"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) HandleCreateProduct(c *gin.Context) {
	saccoID := c.Param("saccoId")
	var req CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("invalid request body"))
		return
	}
	product, err := h.service.CreateProduct(c.Request.Context(), saccoID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Error(err.Error()))
		return
	}
	c.JSON(http.StatusCreated, response.Success(product))
}

func (h *Handler) HandleListProducts(c *gin.Context) {
	saccoID := c.Param("saccoId")
	activeOnly := c.Query("active") == "true"
	products, err := h.service.ListProducts(c.Request.Context(), saccoID, activeOnly)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, response.Success(gin.H{"products": products}))
}

func (h *Handler) HandleUpdateProduct(c *gin.Context) {
	saccoID := c.Param("saccoId")
	productID := c.Param("productId")
	var req UpdateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("invalid request body"))
		return
	}
	product, err := h.service.UpdateProduct(c.Request.Context(), saccoID, productID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, response.Success(product))
}

func (h *Handler) HandleApply(c *gin.Context) {
	userID := c.GetString("user_id")
	saccoID := c.Param("saccoId")
	var req ApplyLoanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("invalid request body"))
		return
	}
	loan, err := h.service.Apply(c.Request.Context(), userID, saccoID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Error(err.Error()))
		return
	}
	c.JSON(http.StatusCreated, response.Success(loan))
}

func (h *Handler) HandleListBySacco(c *gin.Context) {
	saccoID := c.Param("saccoId")
	status := c.Query("status")
	loans, err := h.service.ListBySacco(c.Request.Context(), saccoID, status)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, response.Success(gin.H{"loans": loans}))
}

func (h *Handler) HandleListMine(c *gin.Context) {
	userID := c.GetString("user_id")
	saccoID := c.Query("sacco_id")
	if saccoID == "" {
		c.JSON(http.StatusBadRequest, response.Error("sacco_id query parameter is required"))
		return
	}
	loans, err := h.service.ListByMember(c.Request.Context(), userID, saccoID)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, response.Success(gin.H{"loans": loans}))
}

func (h *Handler) HandleGet(c *gin.Context) {
	loanID := c.Param("loanId")
	loan, err := h.service.GetLoan(c.Request.Context(), loanID)
	if err != nil {
		c.JSON(http.StatusNotFound, response.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, response.Success(loan))
}

func (h *Handler) HandleApprove(c *gin.Context) {
	actorUserID := c.GetString("user_id")
	saccoID := c.Param("saccoId")
	loanID := c.Param("loanId")
	loan, err := h.service.Approve(c.Request.Context(), actorUserID, saccoID, loanID)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, response.Success(loan))
}

func (h *Handler) HandleReject(c *gin.Context) {
	actorUserID := c.GetString("user_id")
	saccoID := c.Param("saccoId")
	loanID := c.Param("loanId")
	loan, err := h.service.Reject(c.Request.Context(), actorUserID, saccoID, loanID)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, response.Success(loan))
}

func (h *Handler) HandleRepay(c *gin.Context) {
	actorUserID := c.GetString("user_id")
	loanID := c.Param("loanId")
	var req RepaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.Error("invalid request body"))
		return
	}
	loan, err := h.service.Repay(c.Request.Context(), actorUserID, loanID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Error(err.Error()))
		return
	}
	c.JSON(http.StatusOK, response.Success(loan))
}
