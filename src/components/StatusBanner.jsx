export default function StatusBanner({ tone = "info", title, message, action }) {
  return (
    <div className={`banner banner-${tone}`}>
      <div className="banner-msg">
        <div>
          {title ? <h2>{title}</h2> : null}
          {message ? <p>{message}</p> : null}
        </div>
      </div>
      {action ? <div className="actions">{action}</div> : null}
    </div>
  )
}
