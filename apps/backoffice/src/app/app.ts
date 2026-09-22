import { Component, inject } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { ButtonComponent } from '@cozinha81/design-system';
import { AuthService } from './core/auth.service';

interface GrupoMenu {
  id: string;
  label: string;
  itens: Array<{ label: string; route: string }>; 
  aberto: boolean;
}

@Component({
  imports: [RouterModule, ButtonComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected title = 'Backoffice - Cozinha81';

  protected readonly grupos: GrupoMenu[] = [
    {
      id: 'visao-geral',
      label: 'Visão Geral',
      aberto: true,
      itens: [{ label: 'Dashboard', route: '/inicio' }],
    },
    {
      id: 'operacao',
      label: 'Operação',
      aberto: true,
      itens: [
        { label: 'Cozinhas', route: '/cozinhas' },
        { label: 'Agenda', route: '/agenda' },
        { label: 'Presenças', route: '/presencas' },
      ],
    },
    {
      id: 'central-glp',
      label: 'Central de GLP',
      aberto: true,
      itens: [
        { label: 'Dashboard', route: '/central-glp' },
        { label: 'Cadastro da Central', route: '/central-glp/cadastro' },
        { label: 'Abastecimentos', route: '/central-glp/abastecimentos' },
        { label: 'Leituras', route: '/central-glp/leituras' },
        { label: 'Fechamento', route: '/central-glp/fechamento' },
        { label: 'Relatórios', route: '/central-glp/relatorios' },
      ],
    },
    {
      id: 'comercial',
      label: 'Comercial',
      aberto: true,
      itens: [
        { label: 'Inquilinos', route: '/inquilinos' },
        { label: 'Gestor de contratos', route: '/gestor-contratos' },
      ],
    },
    {
      id: 'financeiro',
      label: 'Financeiro',
      aberto: true,
      itens: [
        { label: 'Fluxo de caixa', route: '/fluxo-caixa' },
        { label: 'Faturamento', route: '/billing' },
      ],
    },
    {
      id: 'infraestrutura',
      label: 'Infraestrutura',
      aberto: true,
      itens: [
        { label: 'Chamados', route: '/chamados' },
        { label: 'Manutenção', route: '/manutencao' },
      ],
    },
    {
      id: 'administracao',
      label: 'Administração',
      aberto: true,
      itens: [
        { label: 'Usuários', route: '/usuarios' },
        { label: 'Centro de custo', route: '/centro-custo' },
        { label: 'Comunicação', route: '/comunicacao' },
      ],
    },
  ];

  protected alternarGrupo(grupoId: string): void {
    const grupo = this.grupos.find((item) => item.id === grupoId);
    if (!grupo) return;
    grupo.aberto = !grupo.aberto;
  }

  protected sair(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
