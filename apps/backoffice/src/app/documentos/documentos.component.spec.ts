import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentosComponent } from './documentos.component';

describe('DocumentosComponent', () => {
  let fixture: ComponentFixture<DocumentosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentosComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentosComponent);
    fixture.detectChanges();
  });

  it('deve mostrar o repositório de documentos no layout do prototipo', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Repositório de Documentos');
    expect(compiled.textContent).toContain('Inquilino');
    expect(compiled.textContent).toContain('Tipo de Documento');
    expect(compiled.textContent).toContain('Data de Validade');
    expect(compiled.textContent).toContain('Anexar Documento');
  });
});
