export default function Icon({ src, alt = "", size }) {
  return (
    <span className="icon" style={{ width: size, height: size }}>
      <img src={src} alt={alt} width={size} height={size} />
    </span>
  )
}
