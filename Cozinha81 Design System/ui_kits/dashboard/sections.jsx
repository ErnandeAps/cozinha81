/* Cozinha81 — Operator dashboard (app for brands renting kitchens).
   Composes DS primitives + a few inline icons. Exposes window.DashboardApp. */
const { Button, Badge, Tag, StatusPill, Avatar, IconButton, Input } = window.Cozinha81DesignSystem_72690b;
const { useState } = React;

const Ico = (p) => <svg width={p.s||20} height={p.s||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{p.children}</svg>;
const IcoGrid = (p)=><Ico {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></Ico>;
const IcoCal = (p)=><Ico {...p}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></Ico>;
const IcoPin = (p)=><Ico {...p}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></Ico>;
const IcoCard = (p)=><Ico {...p}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></Ico>;
const IcoCog = (p)=><Ico {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 6 19.4a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H2a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 6a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9.5A1.7 1.7 0 0 0 11 2.1V2a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1A2 2 0 1 1 20.8 6l-.1.1a1.7 1.7 0 0 0-.3 1.9v.2a1.7 1.7 0 0 0 1.5 1H22a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></Ico>;
const IcoBell = (p)=><Ico {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/></Ico>;
const IcoSearch = (p)=><Ico {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></Ico>;
const IcoPlus = (p)=><Ico {...p}><path d="M12 5v14M5 12h14"/></Ico>;
const IcoArrow = (p)=><Ico {...p}><path d="M5 12h14M13 6l6 6-6 6"/></Ico>;
const IcoClock = (p)=><Ico {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Ico>;
const IcoTrend = (p)=><Ico {...p}><path d="M3 17l6-6 4 4 7-7M14 7h7v7"/></Ico>;

/* ---------- Inline brand badge (avoids relative asset fetch) ---------- */
const LogoBadge = () => (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cozinha81">
    <rect width="100" height="100" rx="20" fill="#1A1A1A"/>
    <circle cx="36" cy="30" r="11" fill="#4A4A4A"/><circle cx="36" cy="30" r="5" fill="#1A1A1A"/><circle cx="36" cy="30" r="2" fill="#4A4A4A"/>
    <circle cx="36" cy="58" r="11" fill="#4A4A4A"/><circle cx="36" cy="58" r="5" fill="#1A1A1A"/><circle cx="36" cy="58" r="2" fill="#4A4A4A"/>
    <circle cx="64" cy="58" r="11" fill="#4A4A4A"/><circle cx="64" cy="58" r="5" fill="#1A1A1A"/><circle cx="64" cy="58" r="2" fill="#4A4A4A"/>
    <circle cx="64" cy="30" r="11" fill="#C4520A"/><circle cx="64" cy="30" r="5" fill="#1A1A1A"/><circle cx="64" cy="30" r="2" fill="#C4520A"/>
    <line x1="18" y1="76" x2="82" y2="76" stroke="#2E2E2E" strokeWidth="1"/>
    <text x="50" y="90" textAnchor="middle" fontFamily="'Arial Black','Arial',sans-serif" fontSize="9" fontWeight="900" fill="#F5F5F5" letterSpacing="3">COZINHA<tspan fill="#C4520A">81</tspan></text>
  </svg>
);

/* ---------- Sidebar ---------- */
function Sidebar({ view, setView }) {
  const items = [
    { id: 'painel', label: 'Painel', icon: <IcoGrid/> },
    { id: 'reservas', label: 'Reservas', icon: <IcoCal/> },
    { id: 'unidades', label: 'Unidades', icon: <IcoPin/> },
    { id: 'faturamento', label: 'Faturamento', icon: <IcoCard/> },
  ];
  return (
    <aside className="db-side">
      <div className="db-side__logo">
        <LogoBadge/>
        <div>
          <b>Burger do Zé</b>
          <span>Plano Turno</span>
        </div>
      </div>
      <nav className="db-side__nav">
        {items.map(it => (
          <button key={it.id} className={'db-navitem' + (view === it.id ? ' is-active' : '')} onClick={() => setView(it.id)}>
            {it.icon}<span>{it.label}</span>
          </button>
        ))}
      </nav>
      <div className="db-side__foot">
        <button className="db-navitem"><IcoCog/><span>Configurações</span></button>
        <div className="db-side__promo">
          <div className="db-burner-mini"><i/><i/><i/><i/></div>
          <p>3 turnos livres na Vila Leopoldina hoje.</p>
          <Button variant="primary" size="sm" block>Reservar</Button>
        </div>
      </div>
    </aside>
  );
}

/* ---------- Topbar ---------- */
function Topbar({ title }) {
  return (
    <header className="db-top">
      <div>
        <div className="db-eyebrow">// {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        <h1 className="db-top__title">{title}</h1>
      </div>
      <div className="db-top__right">
        <div className="db-search"><IcoSearch s={16}/><input placeholder="Buscar unidade, reserva…"/></div>
        <IconButton aria-label="Notificações"><IcoBell/></IconButton>
        <Avatar name="Zé Ramos" accent/>
      </div>
    </header>
  );
}

/* ---------- Stat cards ---------- */
function Stats() {
  const stats = [
    { k: 'Próxima reserva', v: 'Hoje, 18:00', sub: 'Estação 04 · Vila Leopoldina', icon: <IcoClock/>, accent: true },
    { k: 'Horas no mês', v: '92h', sub: '+14h vs. mês anterior', icon: <IcoTrend/> },
    { k: 'Gasto no mês', v: 'R$ 4.416', sub: 'Plano Turno + avulsos', icon: <IcoCard/> },
  ];
  return (
    <div className="db-stats">
      {stats.map((s, i) => (
        <div className={'db-stat' + (s.accent ? ' is-accent' : '')} key={i}>
          <div className="db-stat__icon">{s.icon}</div>
          <div className="db-stat__k">{s.k}</div>
          <div className="db-stat__v">{s.v}</div>
          <div className="db-stat__sub">{s.sub}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Live station board ---------- */
const STATIONS = [
  { id: '01', unit: 'Vila Leopoldina', status: 'stop', who: 'Você · até 22:00' },
  { id: '02', unit: 'Vila Leopoldina', status: 'ready', who: 'Livre' },
  { id: '03', unit: 'Vila Leopoldina', status: 'warn', who: 'Higienização' },
  { id: '04', unit: 'Vila Leopoldina', status: 'ready', who: 'Sua reserva 18:00' },
  { id: '11', unit: 'Pinheiros', status: 'ready', who: 'Livre' },
  { id: '12', unit: 'Pinheiros', status: 'stop', who: 'Ocupada · 19:30' },
];
function StationBoard() {
  return (
    <div className="db-card db-board">
      <div className="db-card__head">
        <h3>Estações ao vivo</h3>
        <Button variant="ghost" size="sm" iconRight={<IcoArrow s={15}/>}>Ver mapa</Button>
      </div>
      <div className="db-board__grid">
        {STATIONS.map((s, i) => (
          <div className={'db-station db-station--' + s.status} key={i}>
            <div className="db-station__ring"><span/><span/></div>
            <div className="db-station__id">Estação {s.id}</div>
            <div className="db-station__unit">{s.unit}</div>
            <div className="db-station__who">{s.who}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Upcoming reservations ---------- */
const RES = [
  { day: 'HOJE', date: '09', time: '18:00 – 22:00', unit: 'Estação 04 · Vila Leopoldina', status: 'ready', price: 'R$ 192' },
  { day: 'QUI', date: '11', time: '06:00 – 14:00', unit: 'Estação 02 · Vila Leopoldina', status: 'ready', price: 'R$ 384' },
  { day: 'SEX', date: '12', time: '18:00 – 23:00', unit: 'Estação 11 · Pinheiros', status: 'warn', price: 'R$ 260' },
];
function Upcoming({ full }) {
  return (
    <div className="db-card">
      <div className="db-card__head">
        <h3>{full ? 'Suas reservas' : 'Próximas reservas'}</h3>
        {!full && <Button variant="ghost" size="sm" iconRight={<IcoArrow s={15}/>}>Todas</Button>}
        {full && <Button variant="primary" size="sm" iconLeft={<IcoPlus s={16}/>}>Nova reserva</Button>}
      </div>
      <div className="db-reslist">
        {RES.map((r, i) => (
          <div className="db-res" key={i}>
            <div className="db-res__date"><span>{r.day}</span><b>{r.date}</b></div>
            <div className="db-res__main">
              <div className="db-res__unit">{r.unit}</div>
              <div className="db-res__time"><IcoClock s={14}/> {r.time}</div>
            </div>
            <div className="db-res__tags"><StatusPill status={r.status}/></div>
            <div className="db-res__price">{r.price}</div>
            <IconButton aria-label="Detalhes"><IcoArrow s={16}/></IconButton>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Views ---------- */
function PainelView() {
  return (
    <React.Fragment>
      <Stats/>
      <div className="db-grid2">
        <StationBoard/>
        <Upcoming/>
      </div>
    </React.Fragment>
  );
}

function App() {
  const [view, setView] = useState('painel');
  const titles = { painel: 'Painel', reservas: 'Reservas', unidades: 'Unidades', faturamento: 'Faturamento' };
  return (
    <div className="db">
      <Sidebar view={view} setView={setView}/>
      <main className="db-main">
        <Topbar title={titles[view]}/>
        <div className="db-content">
          {view === 'painel' && <PainelView/>}
          {view === 'reservas' && <Upcoming full/>}
          {view !== 'painel' && view !== 'reservas' && (
            <div className="db-empty"><div className="db-burner-mini"><i/><i/><i/><i/></div><p>Em breve nesta demonstração.</p></div>
          )}
        </div>
      </main>
    </div>
  );
}
Object.assign(window, { DashboardApp: App });
