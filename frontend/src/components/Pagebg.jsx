// src/components/PageBg.jsx
// Fixed background image — no rotation, no sliding
import { T } from "../styles/theme"

export default function PageBg({ src }) {
  return (
    <>
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage: `url('${src}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        opacity: 0.62,
      }} />
      <div style={{
        position: "fixed", inset: 0, zIndex: 1,
        background: "linear-gradient(145deg, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.44) 100%)",
        pointerEvents: "none",
      }} />
    </>
  )
}