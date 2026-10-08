package payments

import "testing"

func TestSplitGrossAmount(t *testing.T) {
	osSet := func(v string) { t.Setenv("PLATFORM_FEE_PERCENT", v) }
	osSet("1.5")
	net, fee := SplitGrossAmount(100000)
	if fee != 1500 || net != 98500 {
		t.Fatalf("got net=%v fee=%v", net, fee)
	}
	gross, topFee := GrossUpFromNet(3000)
	if topFee != 45 || gross != 3045 {
		t.Fatalf("gross-up got gross=%v fee=%v", gross, topFee)
	}
}
