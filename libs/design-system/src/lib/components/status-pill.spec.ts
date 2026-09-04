import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InputComponent, StatusPillComponent } from './index';

describe('InputComponent', () => {
  it('should emit input changes and update bound value', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [InputComponent],
    }).createComponent(InputComponent);

    const component = fixture.componentInstance;
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    let emittedValue = '';
    component.input.subscribe((event) => {
      emittedValue = (event.target as HTMLInputElement).value;
    });

    input.value = 'ops@cozinha81';
    input.dispatchEvent(new Event('input'));

    fixture.detectChanges();

    expect(component.value).toBe('ops@cozinha81');
    expect(emittedValue).toBe('ops@cozinha81');
  });
});

describe('StatusPillComponent', () => {
  let component: StatusPillComponent;
  let fixture: ComponentFixture<StatusPillComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusPillComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StatusPillComponent);
    component = fixture.componentInstance;
    component.status = 'ready';
    component.label = 'ONLINE';
    fixture.detectChanges();
  });

  it('should create and render dot + label', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.c81-status__dot')).toBeTruthy();
    expect(compiled.textContent).toContain('ONLINE');
  });
});
