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
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(179,208,188,0.22), transparent 24%), radial-gradient(circle at bottom right, rgba(202,155,85,0.18), transparent 18%), var(--cream)",
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "24px 24px 56px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 18,
            marginBottom: 28,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "Playfair Display, serif",
                fontSize: 28,
                color: "var(--forest)",
                fontStyle: "italic",
              }}
            >
              MarketFlow
            </div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "1.6px",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginTop: 3,
              }}
            >
              South Bend Farmers Market
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, 0.8fr)",
            gap: 24,
            alignItems: "stretch",
            marginBottom: 28,
          }}
        >
          <section className="hero-panel" style={{ marginBottom: 0, minHeight: 440 }}>
            <div style={{ alignSelf: "center" }}>
              <div className="hero-eyebrow">Shop smarter before market day</div>
              <h2 style={{ maxWidth: 640 }}>
                Find your favorite vendors, preorder with confidence, and pick up without the guesswork.
              </h2>
              <div className="hero-copy" style={{ marginBottom: 22 }}>
                MarketFlow helps customers plan their market trip like a real weekly ritual, with a cleaner way
                to browse, order ahead, and track pickup details all in one place.
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {user ? (
                  <>
                    <Link className="btn btn-primary" to="/">
                      Open market map
                    </Link>
                    <button className="btn btn-secondary" onClick={handleLogout}>
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link className="btn btn-primary" to="/signup">
                      Start browsing
                    </Link>
                    <Link className="btn btn-secondary" to="/login">
                      I already have an account
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="hero-stat">
              <div className="hero-stat-label">Built for market regulars</div>
              <div className="hero-stat-value">Fresh, simple, local</div>
              <div className="hero-stat-copy">
                Skip the scramble. Keep track of vendors, order numbers, and pickup windows in one realistic flow.
              </div>
            </div>
          </section>

          <section
            style={{
              borderRadius: 28,
              padding: "28px 26px",
              background: "rgba(255,255,255,0.78)",
              border: "1px solid rgba(221, 207, 187, 0.95)",
              boxShadow: "var(--shadow-md)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div className="hero-eyebrow">What you can do</div>
              <div
                style={{
                  fontFamily: "Playfair Display, serif",
                  fontSize: 28,
                  color: "var(--forest)",
                  lineHeight: 1.1,
                  marginBottom: 18,
                }}
              >
                A smoother market morning.
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {featureCards.map((card) => (
                <div
                  key={card.title}
                  style={{
                    padding: "16px 16px 15px",
                    borderRadius: 20,
                    background: "rgba(248,244,236,0.88)",
                    border: "1px solid rgba(221, 207, 187, 0.86)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 12,
                        background: "rgba(237,245,239,0.95)",
                      }}
                    >
                      {card.icon}
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "var(--forest)",
                      }}
                    >
                      {card.title}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--text-secondary)" }}>
                    {card.copy}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section
          style={{
            borderRadius: 28,
            padding: "26px 28px",
            background: "rgba(255,255,255,0.72)",
            border: "1px solid rgba(221, 207, 187, 0.95)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 18,
            }}
          >
            <div>
              <div className="hero-eyebrow">Customers</div>
              <div style={promoTitleStyle}>Browse and order ahead</div>
              <div style={promoCopyStyle}>
                Search for vendors, view menus, and hold onto your pickup order number without digging through texts or notes.
              </div>
            </div>
            <div>
              <div className="hero-eyebrow">Vendors</div>
              <div style={promoTitleStyle}>Keep inventory realistic</div>
              <div style={promoCopyStyle}>
                Update stock counts, manage orders, and keep your menu aligned with what you actually have on hand.
              </div>
            </div>
            <div>
              <div className="hero-eyebrow">Market teams</div>
              <div style={promoTitleStyle}>Coordinate with less friction</div>
              <div style={promoCopyStyle}>
                Support smoother pickup experiences and better visibility into vendors, assignments, and reviews.
              </div>
            </div>
          </div>
        </section>

        <div
          style={{
            marginTop: 22,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 13.5 }}>
            <IconStore size={14} color="var(--text-muted)" />
            Built for a real market flow, not just a demo checkout.
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {user ? (
              <>
                <Link className="btn btn-primary" to="/">
                  Go to app
                </Link>
                <button className="btn btn-secondary" onClick={handleLogout}>
                  Log out
                </button>
              </>
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
        </div>
      </div>
    </div>
  );
}

const promoTitleStyle: React.CSSProperties = {
  fontFamily: "Playfair Display, serif",
  fontSize: 24,
  color: "var(--forest)",
  marginBottom: 8,
};

const promoCopyStyle: React.CSSProperties = {
  fontSize: 14.5,
  color: "var(--text-secondary)",
  lineHeight: 1.65,
};
