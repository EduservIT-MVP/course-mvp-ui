import avatar from "../assets/avatar.svg"
import { useAuthOptional } from "../auth/context"
import { roleLabel } from "../auth/permissions"

export default function Header({ title, subtitle, actions = null }) {
  const auth = useAuthOptional()
  const user = auth?.user

  return (
    <header className="header">
      <div className="header-copy">
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <div className="header-right">
        {actions ? <div className="header-actions">{actions}</div> : null}
        <div className="profile">
          <img src={avatar} alt="" width={32} height={32} />
          <div className="profile-meta">
            <span>{user?.name || "Signed in"}</span>
            {user?.role ? <small>{roleLabel(user.role)}</small> : null}
          </div>
          {auth?.user ? (
            <button type="button" className="text-btn" onClick={auth.logout}>
              Log out
            </button>
          ) : null}
        </div>
      </div>
    </header>
  )
}
