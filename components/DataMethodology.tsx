import Link from "next/link";
import { ArrowUpRight, Database } from "lucide-react";
export default function DataMethodology({ mock = false }: { mock?: boolean }) {
  return (
    <section className="credibility-panel" aria-label="Data and methodology">
      <div>
        <Database size={15} />
        <h2>Data & methodology</h2>
        <Link href="/methodology" aria-label="Read data and methodology">
          <ArrowUpRight size={16} />
        </Link>
      </div>
      {mock ? (
        <p>
          <strong>MOCK DEMO.</strong> These illustrative routes and metrics do
          not use GIS analysis.
        </p>
      ) : (
        <>
          <dl>
            <div>
              <dt>Data source</dt>
              <dd>City of Bentonville GIS</dd>
            </div>
            <div>
              <dt>Routing</dt>
              <dd>Valhalla pedestrian routing</dd>
            </div>
          </dl>
          <p>
            Route geometry is compared with mapped pedestrian infrastructure
            using a documented geospatial tolerance.
          </p>
        </>
      )}
      <p className="credibility-principle">
        PathSafe evaluates mapped infrastructure, not personal safety.
      </p>
      <Link className="text-link" href="/methodology">
        See the methodology <ArrowUpRight size={13} />
      </Link>
    </section>
  );
}
