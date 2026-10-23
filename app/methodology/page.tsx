import Link from "next/link";
import Header from "@/components/Header";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
export const metadata = {
  title: "Data & Methodology | PathSafe NWA",
  description:
    "Understand what PathSafe measures, how walking route coverage is compared, and the limits of public infrastructure data.",
};
export default function Methodology() {
  return (
    <>
      <Header compact />
      <main id="main" className="method-page">
        <Link className="text-link" href="/app">
          <ArrowLeft size={16} />
          Back to route comparison
        </Link>
        <span className="eyebrow">DATA & METHODOLOGY / VERSION 1</span>
        <h1>
          A clearer picture
          <br />
          <span>of the walk ahead.</span>
        </h1>
        <p className="method-lead">
          A few extra seconds can mean a different mix of mapped sidewalks and
          trails. Here’s how PathSafe makes that tradeoff visible—and where the
          data stops.
        </p>
        <div className="method-principle">
          PathSafe evaluates mapped infrastructure, not personal safety.
        </div>
        <section id="measures">
          <span className="method-number">01</span>
          <h2>What PathSafe measures</h2>
          <p>
            PathSafe compares walking time, distance, mapped pedestrian
            infrastructure coverage, and meaningful coverage gaps. Walking
            routes come from Valhalla using OpenStreetMap; infrastructure
            geometry comes from City of Bentonville GIS.
          </p>
          <p>
            PathSafe currently supports walking trips within Bentonville,
            Arkansas. Search places or addresses and select both resolved
            locations. Austin-Baggett Park to Lawrence Plaza remains the default
            showcase. All supported trips use the same analysis pipeline; the
            separate mock demo is explicitly labeled.
          </p>
        </section>
        <section id="coverage">
          <span className="method-number">02</span>
          <h2>How route coverage is calculated</h2>
          <p>
            We compare each route line with nearby mapped sidewalks and eligible
            paved/shared-use trails and explicit public hiking trails. The
            coverage percentage tells you how much of the route lies close to
            those eligible facilities. Overlapping facilities count once.
          </p>
          <p>
            Small breaks are grouped so tiny geometry differences do not become
            a long list of gaps. A coverage gap means there wasn’t a nearby
            match in the data; it does not prove a sidewalk is missing.
          </p>
        </section>
        <section id="score">
          <span className="method-number">03</span>
          <h2>How the infrastructure score works</h2>
          <p>
            The Pedestrian Infrastructure Score runs from 0 to 100. It starts
            with mapped coverage, then subtracts points for meaningful gaps and
            substantially longer routes. It summarizes those measurements; the
            actual coverage, time, and distance remain visible so you can judge
            the tradeoff yourself.
          </p>
        </section>
        <section id="recommendations">
          <span className="method-number">04</span>
          <h2>How recommendations are chosen</h2>
          <p>
            The fastest candidate is the starting point. PathSafe recommends an
            alternative only when it offers a meaningful coverage improvement
            without adding too much walking time or distance, and earns a higher
            infrastructure score.
          </p>
          <p>
            If coverage is similar, the faster route is recommended. If the
            provider returns only one distinct route, we show it without
            inventing an alternative.
          </p>
        </section>
        <section id="not-measured">
          <span className="method-number">05</span>
          <h2>What PathSafe does not measure</h2>
          <p>
            Personal safety, crime, live traffic, crash risk, lighting, sidewalk
            condition, ADA compliance, crossing safety, and construction are not
            assessed. A recommendation is an infrastructure comparison, not a
            guarantee of route conditions.
          </p>
        </section>
        <section id="limitations">
          <span className="method-number">06</span>
          <h2>Data limitations</h2>
          <p>
            Public geocoding, GIS and OpenStreetMap can be incomplete or
            outdated. A sidewalk across a road or barrier may be close to the
            route but disconnected from it. City-mapped location points identify
            facilities, not verified pedestrian entrances; routing may start
            nearby on the walking network.
          </p>
          <p>
            We count only eligible, explicitly public sidewalk and
            paved/shared-use or explicit hiking trail records. Natural surfaces
            may qualify; coverage does not establish pavement or accessibility.
            Bicycle-only facilities, shared roadways, crossing-only records,
            unknown access or classification, and reported closed facilities are
            excluded. An absent closure record does not confirm that a facility
            is open.
          </p>
          <div className="method-source">
            <span>Infrastructure data</span>
            <a href="https://gis.bentonvillear.com/arcgis/rest/services/Planning/Community_Development23/MapServer/174">
              City of Bentonville GIS <ArrowUpRight size={14} />
            </a>
            <p>
              <a href="https://gis.bentonvillear.com/arcgis/rest/services/Parks/Parks_Recreation18/MapServer/158">
                City Parks trail inventory
              </a>
              . Independent project. Use of public City data does not imply
              endorsement.
            </p>
          </div>
        </section>
        <details className="technical-details">
          <summary>
            Technical details <span>Tolerance, gaps, formula & thresholds</span>
          </summary>
          <div>
            <h2>Geometry matching</h2>
            <p>
              Version 1 uses a 15m tolerance around eligible facility lines.
              Route-to-facility intersections are calculated in a local meter
              projection and unioned, then weighted by independently measured
              geodesic segment lengths. Coverage = 100 × covered meters / total
              geometry meters. This tolerance allows offset linework; it is not
              a safety distance or proof of connectivity.
            </p>
            <p>
              A meaningful gap contains at least 20m of uncovered route.
              Uncovered intervals separated by at most 5m of covered geometry
              are grouped for gap counting. Those covered islands still count
              toward coverage. Checks at 10/15/20m document sensitivity without
              tuning the tolerance to inflate results.
            </p>
            <h2>Score formula</h2>
            <div className="formula">
              score = round(clamp(coverage − G − D, 0, 100))
            </div>
            <ul>
              <li>G = min(20, 2 × meaningful gap count).</li>
              <li>
                D = min(10, 10 × max(0, geometry length / shortest candidate
                geometry length − 1.10)).
              </li>
            </ul>
            <p>
              A route up to 10% longer receives no distance penalty. A route 30%
              longer loses 2 points. No unmeasured safety factor is included.
            </p>
            <h2>Recommendation thresholds</h2>
            <ul>
              <li>Coverage improvement ≥10 percentage points.</li>
              <li>
                Strictly higher infrastructure score than the fastest candidate.
              </li>
              <li>Added walking time ≤5 minutes.</li>
              <li>
                Provider walking time AND distance ≤125% of the fastest
                candidate.
              </li>
            </ul>
            <p>
              Highest qualifying score wins; lower time breaks ties. Otherwise
              recommend the fastest candidate. The scoring and selection rules
              are unchanged from Phase 2.
            </p>
            <h2>Location search and supported area</h2>
            <p>
              Location search queries official City named places and address
              points through a normalized provider. Select a suggestion; raw
              text is not routed. Suggestions require at least three characters
              and a 450ms pause. Location points and full candidate lines must
              remain inside the official City Limits polygon
              (Planning/Pending_PZitems_Publish23 layer 5), including its holes.
              Routes outside the boundary are rejected. The boundary is a dated
              GIS snapshot, not a legal survey or a guarantee of citywide data
              completeness. Some valid trips may have no usable provider route.
            </p>
            <p>
              Geocoding attribution: City of Bentonville GIS. The public
              Nominatim service is not used for autocomplete. Selected points
              identify facilities or address locations, not verified pedestrian
              entrances.
            </p>
            <h2>Sources, completeness & caching</h2>
            <p>
              City Sidewalks layer 174 and qualified records from Parks trail
              inventory layer 158 are requested as WGS84 GeoJSON. Only nearby
              geometry is retrieved, within a 75m-padded candidate envelope. ID
              inventories and verified batches detect partial retrieval. Class,
              description, surface, public access, bicycle-only restrictions,
              and reported closures determine eligibility. Paved trails require
              a recognized trail/shared-use description and paved surface.
              Explicit public Hiking records with known natural or paved
              surfaces also qualify. Proposed, future, restricted, and unknown
              trail records are excluded. Supplemental linework is deduplicated
              against eligible infrastructure before coverage using a separate
              0.05m coincidence tolerance; crossings under 0.5m are not
              duplicate lines.
            </p>
            <p>
              Valhalla uses pedestrian costing with up to two requested
              alternatives. Candidates within 2% length and 98% bidirectional
              proximity within 5m are deduplicated. Geometry/provider length
              disagreement above 10% and endpoint snapping above 100m are
              rejected.
            </p>
            <p>
              GIS responses are cached for 24 hours; walking routes for 6 hours.
              Retrieval dates and cache status appear with results; they are not
              source update dates. Local caches survive development restarts.
              Vercel cache files are temporary and do not provide a shared,
              persistent production cache.
            </p>
            <p>
              The public routing demo is development-only. A configured
              hosted/private provider is required in production. When live
              analysis fails, it remains unavailable; users must explicitly
              select the mock fallback. The landing preview remains labeled mock
              data.
            </p>
          </div>
        </details>
        <div className="method-closing">
          <p>Compare the tradeoff for yourself.</p>
          <Link className="button" href="/app">
            Try PathSafe <ArrowUpRight size={17} />
          </Link>
        </div>
      </main>
      <footer>
        <Link className="brand" href="/">
          PathSafe <span className="brand-region">NWA</span>
        </Link>
        <p>A more informed way forward.</p>
        <Link className="text-link" href="/app">
          Compare routes <ArrowUpRight size={14} />
        </Link>
      </footer>
    </>
  );
}
