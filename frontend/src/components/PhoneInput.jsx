// Shared phone field: active +256 prefix, accepts paste of full international numbers.
import { UGANDA } from "../data/countries"

/** Strip to local digits (no leading 0 / country code). */
export function toLocalPhone(raw) {
  let digits = String(raw || "").replace(/[^0-9+]/g, "")
  if (digits.startsWith("+")) digits = digits.slice(1)
  if (digits.startsWith("256")) digits = digits.slice(3)
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "")
  return digits.slice(0, 9)
}

export function toFullPhone(localOrFull) {
  const local = toLocalPhone(localOrFull)
  return UGANDA.prefix + local
}

export default function PhoneInput({
  value,
  onChange,
  placeholder = "700 123 456",
  required = false,
  disabled = false,
  style = {},
  onFocus,
  onBlur,
}) {
  const local = toLocalPhone(value)

  return (
    <div style={{ display: "flex", gap: "8px", width: "100%", ...style }}>
      <div
        aria-label="Country code Uganda"
        title="Uganda country code"
        style={{
          background: "#ffffff",
          border: "1.5px solid #e5e7eb",
          color: "#111827",
          borderRadius: "10px",
          padding: "13px 14px",
          fontWeight: 700,
          fontSize: "15px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: "88px",
          flexShrink: 0,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {UGANDA.prefix}
      </div>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={local}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(toLocalPhone(e.target.value))}
        onPaste={(e) => {
          e.preventDefault()
          const pasted = e.clipboardData.getData("text")
          onChange(toLocalPhone(pasted))
        }}
        onFocus={onFocus}
        onBlur={onBlur}
        style={{
          background: "#ffffff",
          border: "1.5px solid #e5e7eb",
          color: "#0a0a0a",
          borderRadius: "10px",
          padding: "13px 16px",
          flex: 1,
          outline: "none",
          fontSize: "15px",
          fontFamily: "'Inter', sans-serif",
          fontWeight: 500,
          minWidth: 0,
        }}
      />
    </div>
  )
}
