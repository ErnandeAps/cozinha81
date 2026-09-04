import { Route } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { InicioComponent } from './inicio/inicio.component';
import { CozinhasComponent } from './cozinhas/cozinhas.component';
import { CozinhaDetalheComponent } from './cozinhas/cozinha-detalhe.component';
import { AgendaComponent } from './agenda/agenda.component';
import { PresencaComponent } from './presenca/presenca.component';
import { MateriaisComponent } from './materiais/materiais.component';
import { BillingComponent } from './billing/billing.component';
import { ChamadosComponent } from './chamados/chamados.component';
import { ManutencaoComponent } from './manutencao/manutencao.component';
import { RecursosComponent } from './recursos/recursos.component';
import { DocumentosComponent } from './documentos/documentos.component';
import { ComunicacaoComponent } from './comunicacao/comunicacao.component';
import { AcessosComponent } from './acessos/acessos.component';
import { UsuariosComponent } from './usuarios/usuarios.component';
import { InquilinosComponent } from './inquilinos/inquilinos.component';
import { CentroCustoComponent } from './centro-custo/centro-custo.component';
import { CentralGlpComponent } from './central-glp/central-glp.component';
import { authGuard } from './core/auth.guard';

export const appRoutes: Route[] = [
  { path: 'login', component: LoginComponent },
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  { path: 'inicio', component: InicioComponent, canActivate: [authGuard] },
  { path: 'cozinhas', component: CozinhasComponent, canActivate: [authGuard] },
  { path: 'cozinhas/:id', component: CozinhaDetalheComponent, canActivate: [authGuard] },
  { path: 'agenda', component: AgendaComponent, canActivate: [authGuard] },
  { path: 'presencas', component: PresencaComponent, canActivate: [authGuard] },
  { path: 'materiais', component: MateriaisComponent, canActivate: [authGuard] },
  { path: 'central-glp', component: CentralGlpComponent, canActivate: [authGuard], data: { section: 'dashboard' } },
  { path: 'central-glp/cadastro', component: CentralGlpComponent, canActivate: [authGuard], data: { section: 'cadastro' } },
  { path: 'central-glp/abastecimentos', component: CentralGlpComponent, canActivate: [authGuard], data: { section: 'abastecimentos' } },
  { path: 'central-glp/leituras', component: CentralGlpComponent, canActivate: [authGuard], data: { section: 'leituras' } },
  { path: 'central-glp/fechamento', component: CentralGlpComponent, canActivate: [authGuard], data: { section: 'fechamento' } },
  { path: 'central-glp/relatorios', component: CentralGlpComponent, canActivate: [authGuard], data: { section: 'relatorios' } },
  { path: 'billing', component: BillingComponent, canActivate: [authGuard] },
  { path: 'usuarios', component: UsuariosComponent, canActivate: [authGuard] },
  { path: 'inquilinos', component: InquilinosComponent, canActivate: [authGuard] },
  { path: 'chamados', component: ChamadosComponent, canActivate: [authGuard] },
  { path: 'manutencao', component: ManutencaoComponent, canActivate: [authGuard] },
  { path: 'recursos', component: RecursosComponent, canActivate: [authGuard] },
  { path: 'documentos', component: DocumentosComponent, canActivate: [authGuard] },
  { path: 'comunicacao', component: ComunicacaoComponent, canActivate: [authGuard] },
  { path: 'acessos', component: AcessosComponent, canActivate: [authGuard] },
  { path: 'centro-custo', component: CentroCustoComponent, canActivate: [authGuard] },
];
