import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { AuthService } from './core/auth.service';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';

describe('App', () => {
  let mockAuthService: any;

  beforeEach(async () => {
    mockAuthService = {
      isAuthenticated: signal(true),
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();
  });

  it('should render sidebar if authenticated', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('aside')?.textContent).toContain(
      'COZINHA81 BACKOFFICE'
    );
  });
});
