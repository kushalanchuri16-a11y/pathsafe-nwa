export default function Score({
  value,
  mock = false,
}: {
  value: number;
  mock?: boolean;
}) {
  return (
    <div className="score">
      <div>
        <span>Pedestrian Infrastructure Score</span>
        <strong>
          {value}
          <small>/100</small>
        </strong>
      </div>
      <div
        className="score-track"
        role="meter"
        aria-label={`Pedestrian Infrastructure Score${mock ? " (mock)" : ""}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <span style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
