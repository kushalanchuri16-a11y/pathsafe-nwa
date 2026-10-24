// Decorative route geometry, intentionally distinct from the navigation map.
export default function HeroRoutes() {
  return (
    <svg
      className="hero-routes"
      viewBox="0 0 1440 820"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern
          id="hero-streets"
          width="164"
          height="132"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-12)"
        >
          <path
            d="M0 28H164M42 0V132M0 104H118V132"
            stroke="currentColor"
            strokeWidth="1"
          />
        </pattern>
        <linearGradient id="route-fade" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#fff" stopOpacity=".2" />
          <stop offset=".7" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity=".1" />
        </linearGradient>
        <mask id="hero-map-mask">
          <path fill="url(#route-fade)" d="M0 0H1440V820H0z" />
        </mask>
      </defs>
      <g mask="url(#hero-map-mask)">
        <path
          fill="url(#hero-streets)"
          d="M0 0H1440V820H0z"
          className="hero-street-grid"
        />
        <path
          className="hero-route-underlay"
          d="M-30 640H130Q154 640 154 616V570Q154 546 178 546H570Q594 546 594 522V264Q594 240 618 240H1280Q1304 240 1304 216V-30"
        />
        <path
          className="hero-route-trace"
          pathLength="1"
          d="M-30 640H130Q154 640 154 616V570Q154 546 178 546H570Q594 546 594 522V264Q594 240 618 240H1280Q1304 240 1304 216V-30"
        />
        <path
          className="hero-route-flow"
          d="M340 850V740Q340 720 360 720H1090Q1110 720 1110 700V390Q1110 370 1130 370H1480"
        />
        <g className="hero-waypoint" style={{ transformOrigin: "594px 400px" }}>
          <circle cx="594" cy="400" r="13" />
          <circle cx="594" cy="400" r="4" />
        </g>
        <g
          className="hero-waypoint waypoint-second"
          style={{ transformOrigin: "1110px 600px" }}
        >
          <circle cx="1110" cy="600" r="13" />
          <circle cx="1110" cy="600" r="4" />
        </g>
      </g>
    </svg>
  );
}
