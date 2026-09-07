import Header from "../components/Header"
import Sidebar from "../components/Sidebar"
import Button from "../components/Button"
import { Link } from "react-router-dom"

export default function Forbidden() {
  return (
    <div className="app">
      <Sidebar mode="dashboard" />
      <div className="workspace">
        <Header title="Access denied" subtitle="This action isn’t available for your role" />
        <main className="content">
          <section className="brief">
            <div className="brief-intro">
              <h2>You don’t have access</h2>
              <p>
                This action isn’t available for your role. Return to your courses or sign in with an
                account that has permission.
              </p>
            </div>
            <div className="brief-actions">
              <span />
              <Link to="/">
                <Button>Back to courses</Button>
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
