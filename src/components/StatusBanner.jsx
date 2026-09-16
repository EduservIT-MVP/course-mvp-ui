export default function StatusBanner({ tone = "info", title, message, action }) {
  return (
    <div className={`banner banner-${tone}`} role={tone === "error" ? "alert" : "status"}>
      <div className="banner-msg">
        {tone === "busy" ? <span className="pptx-spinner banner-spinner" aria-hidden="true" /> : null}
        <div>
          {title ? <h2>{title}</h2> : null}
          {message ? <p>{message}</p> : null}
        </div>
      </div>
      {action ? <div className="actions">{action}</div> : null}
    </div>
  ) 
}
