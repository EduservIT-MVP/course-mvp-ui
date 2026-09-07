import avatar from "../assets/avatar.svg"
import { useAuthOptional } from "../auth/context"
import { roleLabel } from "../auth/permissions"

export default function Header({ title, subtitle }) {
  const auth = useAuthOptional()
  const user = auth?.user

  return (
    <header className="header">
      <div className="header-copy">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
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
    </header>
  )
}
