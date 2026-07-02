package loans

import (
	"fmt"
	"math"
	"time"
)

type ScheduleRow struct {
	InstallmentNumber int
	DueDate           time.Time
	PrincipalDue      float64
	InterestDue       float64
	TotalDue          float64
}

type AmortizationSummary struct {
	MonthlyInstallment float64
	TotalInterest      float64
	TotalRepayable     float64
	Rows               []ScheduleRow
}

func roundMoney(v float64) float64 {
	return math.Round(v*100) / 100
}

func BuildSchedule(principal float64, termMonths int, annualRate float64, method string, startDate time.Time) (*AmortizationSummary, error) {
	if principal <= 0 {
		return nil, fmt.Errorf("principal must be positive")
	}
	if termMonths < 1 {
		return nil, fmt.Errorf("term_months must be at least 1")
	}
	if method != MethodFlat && method != MethodReducingBalance {
		return nil, fmt.Errorf("invalid interest_method")
	}

	switch method {
	case MethodFlat:
		return buildFlatSchedule(principal, termMonths, annualRate, startDate)
	default:
		return buildReducingSchedule(principal, termMonths, annualRate, startDate)
	}
}

func buildFlatSchedule(principal float64, termMonths int, annualRate float64, startDate time.Time) (*AmortizationSummary, error) {
	totalInterest := roundMoney(principal * (annualRate / 100) * (float64(termMonths) / 12))
	totalRepayable := roundMoney(principal + totalInterest)
	monthly := roundMoney(totalRepayable / float64(termMonths))
	principalPart := roundMoney(principal / float64(termMonths))
	interestPart := roundMoney(totalInterest / float64(termMonths))

	rows := make([]ScheduleRow, termMonths)
	for i := 0; i < termMonths; i++ {
		p := principalPart
		in := interestPart
		if i == termMonths-1 {
			p = roundMoney(principal - principalPart*float64(termMonths-1))
			in = roundMoney(totalInterest - interestPart*float64(termMonths-1))
		}
		rows[i] = ScheduleRow{
			InstallmentNumber: i + 1,
			DueDate:           startDate.AddDate(0, i+1, 0),
			PrincipalDue:      p,
			InterestDue:       in,
			TotalDue:          roundMoney(p + in),
		}
	}

	return &AmortizationSummary{
		MonthlyInstallment: monthly,
		TotalInterest:      totalInterest,
		TotalRepayable:     totalRepayable,
		Rows:               rows,
	}, nil
}

func buildReducingSchedule(principal float64, termMonths int, annualRate float64, startDate time.Time) (*AmortizationSummary, error) {
	monthlyRate := (annualRate / 100) / 12
	var monthlyPayment float64
	if monthlyRate == 0 {
		monthlyPayment = roundMoney(principal / float64(termMonths))
	} else {
		pow := math.Pow(1+monthlyRate, float64(termMonths))
		monthlyPayment = roundMoney(principal * monthlyRate * pow / (pow - 1))
	}

	remaining := principal
	totalInterest := 0.0
	rows := make([]ScheduleRow, termMonths)

	for i := 0; i < termMonths; i++ {
		interest := roundMoney(remaining * monthlyRate)
		principalPart := roundMoney(monthlyPayment - interest)
		if i == termMonths-1 {
			principalPart = roundMoney(remaining)
			monthlyPayment = roundMoney(principalPart + interest)
		}
		remaining = roundMoney(remaining - principalPart)
		if remaining < 0 {
			remaining = 0
		}
		totalInterest += interest
		rows[i] = ScheduleRow{
			InstallmentNumber: i + 1,
			DueDate:           startDate.AddDate(0, i+1, 0),
			PrincipalDue:      principalPart,
			InterestDue:       interest,
			TotalDue:          roundMoney(principalPart + interest),
		}
	}

	return &AmortizationSummary{
		MonthlyInstallment: monthlyPayment,
		TotalInterest:      roundMoney(totalInterest),
		TotalRepayable:     roundMoney(principal + roundMoney(totalInterest)),
		Rows:               rows,
	}, nil
}

func FormatAmount(v float64) string {
	return fmt.Sprintf("%.2f", roundMoney(v))
}

func ParseAmount(s string) (float64, error) {
	var v float64
	_, err := fmt.Sscanf(s, "%f", &v)
	if err != nil {
		return 0, err
	}
	return v, nil
}
