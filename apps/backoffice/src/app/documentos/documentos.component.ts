import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonComponent, CardComponent } from '@cozinha81/design-system';

@Component({
  selector: 'app-documentos',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent, ButtonComponent],
  template: `
    <header style="padding: var(--space-6);">
      <span class="c81-eyebrow">DOCUMENTOS</span>
      <h1 style="margin: 0; font-size: 2rem;">Repositório de Documentos</h1>
    </header>

    <div style="padding: 0 var(--space-6) var(--space-6); display: grid; gap: var(--space-6);">
      <c81-card [pad]="true">
        <div style="display: grid; grid-template-columns: 1.7fr 1.3fr; gap: var(--space-6); align-items: start;">
          <div style="display: flex; flex-direction: column; gap: var(--space-4);">
            @for (doc of documentos; track doc.id) {
              <div style="display: grid; grid-template-columns: 1.6fr 0.9fr 0.8fr; gap: var(--space-4); align-items: center; padding: var(--space-3) 0; border-bottom: var(--hairline);">
                <div style="font-weight: 600; font-size: 1.05rem; color: var(--text-primary);">
                  {{ doc.nome }}
                  <div style="font-size: 0.9rem; color: var(--text-secondary); margin-top: var(--space-1);">Arquivo: {{ doc.arquivo }}</div>
                </div>
                <div style="display: flex; align-items: center; justify-content: center; gap: var(--space-2); color: var(--text-primary);">
                  <span style="font-size: 0.9rem;">Validade:</span>
                  <span style="font-weight: 500;">{{ doc.validade }}</span>
                </div>
                <div style="display: flex; justify-content: flex-end;">
                  <button type="button" style="padding: var(--space-2) var(--space-3); border: none; border-radius: 6px; background: var(--status-stop); color: white; font-weight: 700; cursor: pointer;">
                    Excluir
                  </button>
                </div>
              </div>
            }
          </div>

          <div style="display: flex; flex-direction: column; gap: var(--space-4);">
            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 600;">
              Inquilino
              <select class="c81-input" [(ngModel)]="inquilinoSelecionado" name="inquilinoSelecionado">
                <option value="">-- Selecione --</option>
                @for (inquilino of inquilinos; track inquilino) {
                  <option [value]="inquilino">{{ inquilino }}</option>
                }
              </select>
            </label>

            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 600;">
              Tipo de Documento
              <select class="c81-input" [(ngModel)]="tipoDocumento" name="tipoDocumento">
                <option value="">-- Selecione --</option>
                @for (tipo of tiposDocumento; track tipo) {
                  <option [value]="tipo">{{ tipo }}</option>
                }
              </select>
            </label>

            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 600;">
              Data de Validade
              <div style="position: relative;">
                <input class="c81-input" type="date" [(ngModel)]="dataValidade" name="dataValidade" style="padding-right: 2.5rem;" />
                <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--text-secondary); font-size: 1.1rem;">📅</span>
              </div>
            </label>

            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 600;">
              Arquivo (PDF, Imagem)
              <input class="c81-input" type="file" [(ngModel)]="arquivoSelecionado" name="arquivoSelecionado" style="padding: var(--space-2);" />
            </label>

            <div style="display: flex; justify-content: center; margin-top: var(--space-2);">
              <c81-button variant="primary" type="button">Anexar Documento</c81-button>
            </div>
          </div>
        </div>
      </c81-card>
    </div>
  `,
})
export class DocumentosComponent {
  protected readonly inquilinos = ['Cafe colonia', 'Café 2', 'Cozinha Central'];
  protected readonly tiposDocumento = ['Ex. Alvará, Auto de Vistoria', 'Contrato de locação', 'Alvará'];
  protected readonly documentos = [
    { id: 'd1', nome: 'Vigilância Sanitária', arquivo: '1789079220097-Modelo_Lombre.docx', validade: '09/12/2026' },
    { id: 'd2', nome: 'Alvará', arquivo: '17890798867870-ORÁAMENTO.docx', validade: '09/11/2026' },
    { id: 'd3', nome: 'Contrato de locação', arquivo: '178907848816-ocramento.txt', validade: '09/10/2026' },
  ];

  protected inquilinoSelecionado = 'Cafe colonia';
  protected tipoDocumento = 'Ex. Alvará, Auto de Vistoria';
  protected dataValidade = '';
  protected arquivoSelecionado = '';
}
