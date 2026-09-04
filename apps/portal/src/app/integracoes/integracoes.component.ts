import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { API_BASE } from '../core/api.config';

interface Integration {
  provider: string;
  storeId?: string;
  status: string;
  criadoEm: string;
}

@Component({
  selector: 'app-integracoes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './integracoes.component.html',
  styleUrls: ['./integracoes.component.css']
})
export class IntegracoesComponent implements OnInit {
  integrations: Integration[] = [];
  
  ifoodForm = { storeId: '', credentialsRaw: '' };
  noveNoveForm = { storeId: '', credentialsRaw: '' };
  
  errorMsg = '';
  successMsg = '';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadIntegrations();
  }

  loadIntegrations() {
    this.http.get<Integration[]>(`${API_BASE}/integracoes`).subscribe({
      next: (data) => this.integrations = data,
      error: () => this.errorMsg = 'Erro ao carregar integrações. Talvez você não tenha permissão.'
    });
  }

  getIntegration(provider: string): Integration | undefined {
    return this.integrations.find(i => i.provider === provider);
  }

  connect(provider: 'ifood' | '99food') {
    this.errorMsg = '';
    this.successMsg = '';
    const formData = provider === 'ifood' ? this.ifoodForm : this.noveNoveForm;

    if (!formData.storeId || !formData.credentialsRaw) {
      this.errorMsg = 'Preencha todos os campos para conectar.';
      return;
    }

    this.http.post(`${API_BASE}/integracoes`, {
      provider,
      ...formData
    }).subscribe({
      next: () => {
        this.successMsg = 'Integração conectada com sucesso!';
        this.loadIntegrations();
      },
      error: (err) => {
        this.errorMsg = err.error?.message || 'Erro ao conectar integração.';
      }
    });
  }

  disconnect(provider: string) {
    this.http.delete(`${API_BASE}/integracoes/${provider}`).subscribe({
      next: () => {
        this.successMsg = 'Integração desconectada.';
        this.loadIntegrations();
      },
      error: () => this.errorMsg = 'Erro ao desconectar.'
    });
  }
}
