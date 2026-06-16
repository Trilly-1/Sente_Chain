// // src/components/BgCanvas.jsx
// // Rotating background images with high-opacity parallax feel.
// // Cycle through all 4 images, one per page section, or rotate every N seconds.

// import { useEffect, useState } from "react"

// const IMAGES = ["/imgst1.jpg", "/imgst2.jpg", "/imgst3.jpg", "/imgst4.jpg"]

// export default function BgCanvas({ fixed = false, image = null, opacity = 0.45 }) {
//   const [idx, setIdx] = useState(0)
//   const [fade, setFade] = useState(true)

//   // If a specific image is pinned, use it. Otherwise rotate every 8s.
//   useEffect(() => {
//     if (image) return
//     const id = setInterval(() => {
//       setFade(false)
//       setTimeout(() => {
//         setIdx(i => (i + 1) % IMAGES.length)
//         setFade(true)
//       }, 600)
//     }, 8000)
//     return () => clearInterval(id)
//   }, [image])

//   const src = image || IMAGES[idx]

//   return (
//     <>
//       {/* Background image layer */}
//       <div style={{
//         position: fixed ? "fixed" : "absolute",
//         inset: 0,
//         zIndex: 0,
//         backgroundImage: `url('${src}')`,
//         backgroundSize: "cover",
//         backgroundPosition: "center",
//         opacity: fade ? opacity : 0,
//         transition: "opacity 0.8s ease",
//         willChange: "opacity",
//       }} />
//       {/* Dark gradient scrim so text stays legible */}
//       <div style={{
//         position: fixed ? "fixed" : "absolute",
//         inset: 0,
//         zIndex: 1,
//         background: "linear-gradient(160deg, rgba(8,8,8,0.52) 0%, rgba(8,8,8,0.75) 55%, rgba(8,8,8,0.92) 100%)",
//         pointerEvents: "none",
//       }} />
//     </>
//   )
// }