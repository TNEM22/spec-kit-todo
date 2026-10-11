import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { provideApiConfiguration } from './core/api/generated/api-configuration';
import { App } from './app';

describe('App', () => {
  it('creates the shell with its stores', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideApiConfiguration('http://127.0.0.1:8000')],
    }).compileComponents();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('main.shell')).not.toBeNull();
  });
});
