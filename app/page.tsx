import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Database,
  Footprints,
  MapPin,
  Route,
} from "lucide-react";
import Header from "@/components/Header";
import ProductPreview from "@/components/ProductPreview";
export default function Home() {
  return (
    <>
      <Header />
      <main id="main">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="live-dot" /> BUILT FOR BENTONVILLE. DESIGNED FOR
              WALKING.
            </div>
            <h1>
              Routes that account for <span>pedestrian infrastructure,</span>{" "}
              not just speed.
            </h1>
            <p>
              PathSafe NWA compares walking routes using mapped sidewalks and
              pedestrian infrastructure so Bentonville residents can better
              understand the tradeoffs between speed and route coverage.
            </p>
            <div className="hero-actions">
              <Link className="button" href="/app">
                Try PathSafe <ArrowUpRight size={19} />
              </Link>
              <Link className="text-link" href="/methodology">
                See the methodology <ArrowRight size={17} />
              </Link>
            </div>
            <div className="hero-trust">
              <Database size={16} />
              <span>
                Powered by public City of Bentonville infrastructure data.
              </span>
            </div>
            <p className="trust-context">
              Independent project. City data does not imply endorsement.
            </p>
          </div>
          <ProductPreview />
        </section>
        <section className="how-section section" id="how-it-works">
          <div className="section-intro">
            <span className="eyebrow">01 / THE PROCESS</span>
            <h2>
              A little more context.
              <br />A more informed walk.
            </h2>
            <p>
              See what lies between your starting point and your destination.
            </p>
          </div>
          <div className="steps">
            {[
              {
                icon: MapPin,
                title: "Choose your endpoints",
                text: "Choose a starting point and destination.",
              },
              {
                icon: Route,
                title: "Look beyond the fastest route",
                text: "PathSafe compares candidate walking routes with mapped pedestrian infrastructure.",
              },
              {
                icon: Footprints,
                title: "Make the comparison",
                text: "Compare travel time, distance, and sidewalk/trail coverage.",
              },
            ].map((s, i) => (
              <div className="step" key={s.title}>
                <span className="step-number">0{i + 1}</span>
                <s.icon size={23} />
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="why-section section" id="about">
          <div>
            <span className="eyebrow">02 / WHY IT MATTERS</span>
            <h2>
              The shortest walk doesn’t
              <br />
              tell the whole story.
            </h2>
          </div>
          <div>
            <p>
              Navigation software often focuses on efficiency. For a person
              walking, two similarly sized routes may offer very different
              pedestrian infrastructure.
            </p>
            <p className="why-emphasis">
              PathSafe makes that difference visible.
            </p>
            <p>
              For students, pedestrians, people without access to a car, and
              residents exploring Bentonville on foot.
            </p>
          </div>
        </section>
        <section className="data-section section" id="data">
          <div className="section-intro">
            <span className="eyebrow">03 / THE FOUNDATION</span>
            <h2>
              Built around public
              <br />
              infrastructure data
            </h2>
            <p>
              The app compares provider walking routes against official City of
              Bentonville GIS sidewalk/trail data. The landing-page preview
              remains clearly labeled mock data.
            </p>
            <Link className="text-link" href="/app">
              Explore the route comparison <ArrowRight size={17} />
            </Link>
          </div>
          <div className="data-ledger">
            {["Sidewalks", "Trails", "Route geometry"].map((label, i) => (
              <div key={label}>
                <Database size={19} />
                <span>{label}</span>
                <small>
                  {i === 2
                    ? "Valhalla pedestrian routes"
                    : i === 1
                      ? "City GIS · Parks trails layer 158"
                      : "City GIS · Sidewalks layer 174"}
                </small>
              </div>
            ))}
            <p>
              Coverage depends on available public GIS data and should not be
              interpreted as a guarantee of route conditions.
            </p>
          </div>
        </section>
      </main>
      <footer>
        <span className="brand">
          PathSafe <span className="brand-region">NWA</span>
        </span>
        <Link className="text-link" href="/methodology">
          Data & methodology <ArrowRight size={14} />
        </Link>
        <span>Bentonville, Arkansas · Congressional App Challenge</span>
      </footer>
    </>
  );
}
