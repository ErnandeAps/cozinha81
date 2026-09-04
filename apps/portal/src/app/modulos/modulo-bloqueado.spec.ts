import { TestBed } from '@angular/core/testing';
import { ModuloBloqueadoComponent } from './modulo-bloqueado';

describe('ModuloBloqueadoComponent (Story 1.6 AC-4)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ModuloBloqueadoComponent] }).compileComponents();
  });

  it('mostra cadeado, nome do Módulo e CTA "Falar com a Cozinha81"', () => {
    const fixture = TestBed.createComponent(ModuloBloqueadoComponent);
    fixture.componentInstance.nome = 'Pedidos e KDS';
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-test="modulo-bloqueado"]')).toBeTruthy();
    expect(el.querySelector('svg')).toBeTruthy(); // cadeado
    expect(el.textContent).toContain('Pedidos e KDS');
    expect(el.querySelector('[data-test="cta"]')?.textContent).toContain('Falar com a Cozinha81');
  });

  it('emite (contato) ao acionar o CTA de upsell', () => {
    const fixture = TestBed.createComponent(ModuloBloqueadoComponent);
    let emitido = false;
    fixture.componentInstance.contato.subscribe(() => (emitido = true));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[data-test="cta"]').click();
    expect(emitido).toBe(true);
  });

  it('não renderiza conteúdo do módulo (só o estado bloqueado)', () => {
    const fixture = TestBed.createComponent(ModuloBloqueadoComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('router-outlet')).toBeNull();
    expect(el.querySelector('a[href]')).toBeNull();
  });
});
