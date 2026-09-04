/* Cozinha81 — Marketing site sections.
   Composes DS primitives from the bundle namespace + a few inline icons. */
const { Button, Badge, Tag, KitchenCard, StatusPill } = window.Cozinha81DesignSystem_72690b;
const { useState } = React;

/* ---------- inline icons (Lucide-style, 2px stroke) ---------- */
const Ico = (p) => <svg width={p.s||20} height={p.s||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{p.children}</svg>;
const IcoArrow = (p) => <Ico {...p}><path d="M5 12h14M13 6l6 6-6 6"/></Ico>;
const IcoPin = (p) => <Ico {...p}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></Ico>;
const IcoClock = (p) => <Ico {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Ico>;
const IcoShield = (p) => <Ico {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></Ico>;
const IcoBolt = (p) => <Ico {...p}><path d="M13 2L4.5 13H11l-1 9 8.5-11H12l1-9Z"/></Ico>;
const IcoMenu = (p) => <Ico {...p}><path d="M3 6h18M3 12h18M3 18h18"/></Ico>;

/* ---------- Inline brand logo (avoids relative asset fetch) ---------- */
const LogoLight = ({ w = 200, className }) => (
  <svg className={className} width={w} height={w * 80 / 300} viewBox="0 0 300 80" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cozinha81">
    <path fillRule="evenodd" fill="#F5F4F1" d="M 31 25 A 11 11 0 1 1 9 25 A 11 11 0 1 1 31 25 Z M 25 25 A  5  5 0 1 1 15 25 A  5  5 0 1 1 25 25 Z M 31 55 A 11 11 0 1 1 9 55 A 11 11 0 1 1 31 55 Z M 25 55 A  5  5 0 1 1 15 55 A  5  5 0 1 1 25 55 Z M 59 55 A 11 11 0 1 1 37 55 A 11 11 0 1 1 59 55 Z M 53 55 A  5  5 0 1 1 43 55 A  5  5 0 1 1 53 55 Z"/>
    <circle cx="20" cy="25" r="2.5" fill="#F5F4F1"/>
    <circle cx="20" cy="55" r="2.5" fill="#F5F4F1"/>
    <circle cx="48" cy="55" r="2.5" fill="#F5F4F1"/>
    <path fillRule="evenodd" fill="#DA6E22" d="M 59 25 A 11 11 0 1 1 37 25 A 11 11 0 1 1 59 25 Z M 53 25 A  5  5 0 1 1 43 25 A  5  5 0 1 1 53 25 Z"/>
    <circle cx="48" cy="25" r="2.5" fill="#DA6E22"/>
    <line x1="73" y1="14" x2="73" y2="66" stroke="#3D3B39" strokeWidth="1"/>
    <text x="85" y="43" fontFamily="'Archivo','Arial Black',sans-serif" fontSize="22" fontWeight="900" letterSpacing="0.5"><tspan fill="#F5F4F1">COZINHA</tspan><tspan fill="#DA6E22">81</tspan></text>
    <text x="85" y="60" fontFamily="'Archivo',Arial,sans-serif" fontSize="8" fontWeight="400" fill="#74706A" letterSpacing="3.5">COZINHAS PROFISSIONAIS</text>
  </svg>
);

/* ---------- Cooktop motif graphic (CSS burner rings) ---------- */
function Cooktop({ lit = 1 }) {
  const burners = [0, 1, 2, 3];
  return (
    <div className="mk-cooktop">
      {burners.map(i => (
        <div key={i} className={'mk-burner' + (i === lit ? ' is-lit' : '')}>
          <span/><span/><span/>
        </div>
      ))}
    </div>
  );
}

/* ---------- Nav ---------- */
function Nav() {
  return (
    <header className="mk-nav">
      <div className="mk-wrap mk-nav__inner">
        <LogoLight className="mk-nav__logo" w={200}/>
        <nav className="mk-nav__links">
          <a href="#como">Como funciona</a>
          <a href="#unidades">Unidades</a>
          <a href="#planos">Planos</a>
          <a href="#">Para investidores</a>
        </nav>
        <div className="mk-nav__cta">
          <Button variant="ghost" size="sm" style={{color:'var(--steel-200)'}}>Entrar</Button>
          <Button variant="primary" size="sm" iconRight={<IcoArrow s={16}/>}>Reservar cozinha</Button>
        </div>
        <button className="mk-nav__burger" aria-label="Menu"><IcoMenu/></button>
      </div>
    </header>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  return (
    <section className="mk-hero">
      <div className="mk-wrap mk-hero__inner">
        <div className="mk-hero__copy">
          <div className="mk-eyebrow">// Cozinhas profissionais para aluguel</div>
          <h1 className="mk-hero__title">Sua cozinha<br/>já está <em>acesa</em>.</h1>
          <p className="mk-hero__lead">
            Estações profissionais licenciadas, equipadas e higienizadas.
            Alugue por hora, turno ou mês — sem obra, sem CAPEX, sem dor de cabeça.
          </p>
          <div className="mk-hero__actions">
            <Button variant="primary" size="lg" iconRight={<IcoArrow/>}>Encontrar uma unidade</Button>
            <Button variant="secondary" size="lg" style={{background:'transparent',color:'#fff',borderColor:'var(--steel-700)'}}>Ver como funciona</Button>
          </div>
          <div className="mk-hero__trust">
            <div><b>14</b><span>unidades em SP</span></div>
            <div className="mk-div"/>
            <div><b>320+</b><span>marcas operando</span></div>
            <div className="mk-div"/>
            <div><b>24/7</b><span>acesso liberado</span></div>
          </div>
        </div>
        <div className="mk-hero__visual">
          <Cooktop lit={1}/>
          <div className="mk-hero__chip mk-hero__chip--1"><StatusPill status="ready"/></div>
          <div className="mk-hero__chip mk-hero__chip--2"><Badge variant="solid">UNIT-VL-07</Badge></div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Value props ---------- */
function Values() {
  const items = [
    { icon: <IcoBolt/>, t: 'Ligue e opere', d: 'Estações prontas para uso imediato. Você chega, cozinha e despacha o pedido.' },
    { icon: <IcoShield/>, t: 'Tudo licenciado', d: 'Alvará, vigilância sanitária e laudos em dia. A regularização é nossa.' },
    { icon: <IcoClock/>, t: 'Flexível de verdade', d: 'Por hora, turno ou mês. Aumente ou reduza sua operação quando quiser.' },
    { icon: <IcoPin/>, t: 'Perto da demanda', d: 'Unidades posicionadas nos polos de delivery com maior densidade de pedidos.' },
  ];
  return (
    <section className="mk-values">
      <div className="mk-wrap mk-values__grid">
        {items.map((it, i) => (
          <div className="mk-value" key={i}>
            <div className="mk-value__icon">{it.icon}</div>
            <h3>{it.t}</h3>
            <p>{it.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- How it works ---------- */
function How() {
  const steps = [
    { n: '01', t: 'Escolha a unidade', d: 'Compare localização, equipamentos e disponibilidade em tempo real.' },
    { n: '02', t: 'Reserve o turno', d: 'Selecione hora ou turno. Confirmação na hora, sem fila de espera.' },
    { n: '03', t: 'Cozinhe e despache', d: 'Acesso liberado por app. Coifa, gás e câmara fria prontos.' },
  ];
  return (
    <section className="mk-how" id="como">
      <div className="mk-wrap">
        <div className="mk-sec-head">
          <div className="mk-eyebrow mk-eyebrow--dark">// Como funciona</div>
          <h2 className="mk-h2">Três passos entre você e o próximo pedido</h2>
        </div>
        <div className="mk-how__grid">
          {steps.map((s, i) => (
            <div className="mk-step" key={i}>
              <div className="mk-step__n">{s.n}</div>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Kitchen grid ---------- */
const UNITS = [
  { name: 'Estação 04', location: 'Vila Leopoldina', status: 'ready', price: 'R$ 48', tags: ['Coifa', 'Forno combinado'] },
  { name: 'Estação 11', location: 'Pinheiros', status: 'warn', price: 'R$ 52', tags: ['Câmara fria', 'Fritadeira'] },
  { name: 'Estação 02', location: 'Santo Amaro', status: 'ready', price: 'R$ 39', tags: ['Chapa', '24h'] },
  { name: 'Estação 08', location: 'Tatuapé', status: 'stop', price: 'R$ 45', tags: ['Coifa', 'Confeitaria'] },
];
function Units() {
  const [fav, setFav] = useState(0);
  const filters = ['Todas', 'Disponíveis agora', 'Confeitaria', '24 horas', 'Câmara fria'];
  const [active, setActive] = useState(0);
  return (
    <section className="mk-units" id="unidades">
      <div className="mk-wrap">
        <div className="mk-sec-head mk-sec-head--row">
          <div>
            <div className="mk-eyebrow mk-eyebrow--dark">// Unidades</div>
            <h2 className="mk-h2">Cozinhas disponíveis perto de você</h2>
          </div>
          <Button variant="ink" iconRight={<IcoArrow s={16}/>}>Ver todas as 14</Button>
        </div>
        <div className="mk-filters">
          {filters.map((f, i) => (
            <Tag key={i} selectable active={i === active} onClick={() => setActive(i)}>{f}</Tag>
          ))}
        </div>
        <div className="mk-units__grid">
          {UNITS.map((u, i) => (
            <KitchenCard key={i} {...u} favorite={fav === i} onFavorite={() => setFav(i)} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Pricing ---------- */
function Pricing() {
  const plans = [
    { name: 'Avulso', price: 'R$ 48', unit: '/hora', desc: 'Para testar receitas e picos de demanda.', feats: ['Sem fidelidade', 'Reserva por hora', 'Acesso 24/7'], cta: 'secondary' },
    { name: 'Turno', price: 'R$ 690', unit: '/mês', desc: 'Um turno fixo por dia na sua unidade.', feats: ['Estação garantida', 'Armazenamento incluso', 'Suporte operacional'], cta: 'primary', featured: true },
    { name: 'Dedicada', price: 'Sob consulta', unit: '', desc: 'Estação exclusiva para alto volume.', feats: ['Uso exclusivo', 'Marca na fachada', 'Gestor de conta'], cta: 'secondary' },
  ];
  return (
    <section className="mk-pricing" id="planos">
      <div className="mk-wrap">
        <div className="mk-sec-head mk-sec-head--center">
          <div className="mk-eyebrow mk-eyebrow--dark">// Planos</div>
          <h2 className="mk-h2">Pague pelo que usar</h2>
        </div>
        <div className="mk-pricing__grid">
          {plans.map((p, i) => (
            <div className={'mk-plan' + (p.featured ? ' is-feat' : '')} key={i}>
              {p.featured && <div className="mk-plan__flag">Mais popular</div>}
              <div className="mk-plan__name">{p.name}</div>
              <div className="mk-plan__price"><b>{p.price}</b><span>{p.unit}</span></div>
              <p className="mk-plan__desc">{p.desc}</p>
              <ul className="mk-plan__feats">
                {p.feats.map((f, j) => <li key={j}><span className="mk-tick"/>{f}</li>)}
              </ul>
              <Button variant={p.cta} block>{p.featured ? 'Começar agora' : 'Escolher'}</Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- CTA ---------- */
function CTA() {
  return (
    <section className="mk-cta">
      <div className="mk-wrap mk-cta__inner">
        <Cooktop lit={3}/>
        <h2 className="mk-cta__title">Acenda sua operação<br/>ainda esta semana.</h2>
        <p className="mk-cta__lead">Fale com a gente e receba uma proposta para a unidade mais próxima do seu público.</p>
        <div className="mk-cta__actions">
          <Button variant="primary" size="lg" iconRight={<IcoArrow/>}>Reservar cozinha</Button>
          <Button variant="secondary" size="lg" style={{background:'transparent',color:'#fff',borderColor:'var(--steel-700)'}}>Falar com vendas</Button>
        </div>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */
function Footer() {
  const cols = [
    { h: 'Produto', l: ['Unidades', 'Planos', 'Equipamentos', 'App do operador'] },
    { h: 'Empresa', l: ['Sobre', 'Investidores', 'Carreiras', 'Imprensa'] },
    { h: 'Suporte', l: ['Central de ajuda', 'Contato', 'Status', 'Termos'] },
  ];
  return (
    <footer className="mk-foot">
      <div className="mk-wrap mk-foot__inner">
        <div className="mk-foot__brand">
          <LogoLight w={200}/>
          <p>Cozinhas inteligentes para aluguel.<br/>São Paulo · Brasil</p>
        </div>
        {cols.map((c, i) => (
          <div className="mk-foot__col" key={i}>
            <h4>{c.h}</h4>
            {c.l.map((x, j) => <a key={j} href="#">{x}</a>)}
          </div>
        ))}
      </div>
      <div className="mk-wrap mk-foot__bar">
        <span>© 2026 Cozinha81 Cozinhas Profissionais Ltda.</span>
        <span>CNPJ 00.000.000/0001-00</span>
      </div>
    </footer>
  );
}

function Page() {
  return (
    <div className="mk">
      <Nav/><Hero/><Values/><How/><Units/><Pricing/><CTA/><Footer/>
    </div>
  );
}
Object.assign(window, { MarketingPage: Page });
