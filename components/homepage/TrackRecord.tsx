const STATS = [
  { num: '9', unit: 'years', lbl: 'on the market' },
  { num: '5M+', lbl: 'satisfied clients' },
  { num: '200+', lbl: 'countries served' },
  { num: '0', lbl: 'major incidents' },
];

export function TrackRecord() {
  return (
    <section className="track-record">
      <div className="tr-head">
        <h2>
          Numbers <span className="tr-h2-light">that matter.</span>
        </h2>
      </div>
      <div className="tr-grid">
        {STATS.map((s, i) => (
          <div className="tr-stat" key={i}>
            <div className="tr-num">
              {s.num}
              {s.unit && <span className="tr-unit"> {s.unit}</span>}
            </div>
            <div className="tr-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
