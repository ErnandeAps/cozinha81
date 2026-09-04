import { TestBed } from '@angular/core/testing';
import { OrderCardComponent } from './order-card.component';
import { By } from '@angular/platform-browser';

describe('OrderCardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderCardComponent],
    }).compileComponents();
  });

  it('should render order details', () => {
    const fixture = TestBed.createComponent(OrderCardComponent);
    fixture.componentInstance.order = {
      orderId: '1', origin: 'iFood', number: '123', items: 3, time: new Date().toISOString()
    };
    fixture.detectChanges();
    const cardText = fixture.nativeElement.textContent;
    expect(cardText).toContain('iFood');
    expect(cardText).toContain('#123');
  });
});
