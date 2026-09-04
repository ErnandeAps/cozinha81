import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should render 4 kanban columns', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const columns = fixture.nativeElement.querySelectorAll('.kanban-column');
    expect(columns.length).toBe(4);
  });

  it('should contain rotation warning', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const warning = fixture.nativeElement.querySelector('.rotation-warning');
    expect(warning).toBeTruthy();
  });
});
