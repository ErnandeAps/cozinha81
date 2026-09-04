import { Route } from '@angular/router';
import { InicioComponent } from './inicio/inicio.component';
import { EstoqueComponent } from './estoque/estoque.component';
import { LoginComponent } from './login/login.component';
import { CusteioConfigComponent } from './custeio/custeio-config.component';
import { FichasComponent } from './fichas/fichas.component';
import { ProducaoComponent } from './producao/producao.component';
import { CmvComponent } from './cmv/cmv.component';
import { IntegracoesComponent } from './integracoes/integracoes.component';
import { AceitarConviteComponent } from './aceitar-convite/aceitar-convite.component';
import { authGuard } from './core/auth.guard';
import { DashboardOperacionalComponent } from './dashboard-operacional/dashboard-operacional.component';
import { DashboardGerencialComponent } from './dashboard-gerencial/dashboard-gerencial.component';
import { PedidosComponent } from './pedidos/pedidos.component';
import { EntregadoresComponent } from './entregadores/entregadores.component';
import { SelecionarRestauranteComponent } from './selecionar-restaurante/selecionar-restaurante.component';
import { UsuariosComponent } from './usuarios/usuarios.component';

export const appRoutes: Route[] = [
  { path: 'login', component: LoginComponent },
  { path: 'selecionar-restaurante', component: SelecionarRestauranteComponent, canActivate: [authGuard] },
  { path: 'aceitar-convite', component: AceitarConviteComponent },
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  { path: 'inicio', component: InicioComponent, canActivate: [authGuard] },
  { path: 'estoque', component: EstoqueComponent, canActivate: [authGuard] },
  { path: 'fichas', component: FichasComponent, canActivate: [authGuard] },
  { path: 'producao', component: ProducaoComponent, canActivate: [authGuard] },
  { path: 'pedidos', component: PedidosComponent, canActivate: [authGuard] },
  { path: 'entregadores', component: EntregadoresComponent, canActivate: [authGuard] },
  { path: 'custeio', component: CusteioConfigComponent, canActivate: [authGuard] },
  { path: 'dashboard-operacional', component: DashboardOperacionalComponent, canActivate: [authGuard] },
  { path: 'dashboard-gerencial', component: DashboardGerencialComponent, canActivate: [authGuard] },
  { path: 'cmv', component: CmvComponent, canActivate: [authGuard] },
  { path: 'integracoes', component: IntegracoesComponent, canActivate: [authGuard] },
  { path: 'usuarios', component: UsuariosComponent, canActivate: [authGuard] },
];
