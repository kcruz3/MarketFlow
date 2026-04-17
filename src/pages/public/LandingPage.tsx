import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";
import { IconCalendar, IconLeaf, IconShoppingCart, IconStore } from "../../components/Icons";

const featureCards = [
  {
    icon: <IconLeaf size={20} color="var(--forest-mid)" />,
    title: "Browse local vendors",
    copy: "Explore produce, pantry goods, prepared food, and more before market day.",
  },
  {
    icon: <IconShoppingCart size={20} color="var(--forest-mid)" />,
    title: "Pre-order for pickup",
    copy: "Reserve popular items early, then pick them up with your order number at the booth.",
  },
  {
    icon: <IconCalendar size={20} color="var(--forest-mid)" />,
    title: "Plan your market visit",
    copy: "Check upcoming market days and quickly decide which vendors you want to visit.",
  },
];

export default function LandingPage() {
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/welcome");
  };

  return (
    <div className="landing-root">
      <div className="landing-shell">
        <header className="landing-nav">
          <div>
            <div className="landing-brand">MarketFlow</div>
            <div className="landing-sub">South Bend Farmers Market</div>
          </div>

          <div className="landing-auth">
            {user ? (
              <button className="btn btn-secondary" onClick={handleLogout}>
                Log out
              </button>
            ) : (
              <>
                <Link className="btn btn-secondary" to="/login">
                  Sign in
                </Link>
                <Link className="btn btn-primary" to="/signup">
                  Create account
                </Link>
              </>
            )}
          </div>
        </header>

        <section className="landing-hero">
          <div className="landing-hero-copy">
            <div className="landing-kicker">Smart local shopping</div>
            <h1>
              Plan market day faster, place pre-orders confidently, and pick up without confusion.
            </h1>
            <p>
              MarketFlow keeps vendors, menus, pickup windows, and order numbers in one clear flow so customers,
              vendors, and market staff all stay in sync.
            </p>
            <div className="landing-cta">
              {user ? (
                <Link className="btn btn-primary" to="/">
                  Open MarketFlow
                </Link>
              ) : (
                <>
                  <Link className="btn btn-primary" to="/signup">
                    Get started
                  </Link>
                  <Link className="btn btn-secondary" to="/login">
                    I already have an account
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="landing-hero-panel">
            <div className="landing-panel-title">Today at the market</div>
            <div className="landing-order-chip">
              <span>Order number</span>
              <strong>ORD-842311</strong>
            </div>
            <div className="landing-panel-list">
              <div>
                <span>Vendor</span>
                <strong>Fresh Fields Produce</strong>
              </div>
              <div>
                <span>Pickup</span>
                <strong>10:30 - 11:00 AM</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>Ready for pickup</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-feature-grid">
          {featureCards.map((card) => (
            <article key={card.title} className="landing-feature-card">
              <div className="landing-feature-head">
                <div className="landing-feature-icon">{card.icon}</div>
                <h3>{card.title}</h3>
              </div>
              <p>{card.copy}</p>
            </article>
          ))}
        </section>

        <section className="landing-audience-grid">
          <article className="landing-audience-card">
            <div className="landing-kicker">Customers</div>
            <h3>Find what you want before you arrive</h3>
            <p>Filter vendors, compare options, and keep your pickup details in one place.</p>
          </article>
          <article className="landing-audience-card">
            <div className="landing-kicker">Vendors</div>
            <h3>Manage inventory with fewer surprises</h3>
            <p>Track stock, fulfill pickup orders, and keep your menu accurate through market close.</p>
          </article>
          <article className="landing-audience-card">
            <div className="landing-kicker">Market staff</div>
            <h3>Coordinate operations more clearly</h3>
            <p>Monitor vendor activity and keep pickup flow organized across the whole floor.</p>
          </article>
        </section>

        <footer className="landing-footer">
          <div>
            <IconStore size={14} color="var(--ink-muted)" /> Built for real market operations.
          </div>
          <div className="landing-footer-actions">
            {user ? (
              <Link className="btn btn-primary" to="/">
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link className="btn btn-secondary" to="/login">
                  Sign in
                </Link>
                <Link className="btn btn-primary" to="/signup">
                  Join MarketFlow
                </Link>
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
