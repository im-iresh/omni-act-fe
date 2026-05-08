import { Component, inject } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { HomeComponent } from './features/home/home.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HomeComponent],
  template: `<app-home />`
})
export class AppComponent {
  constructor() {
    inject(MatIconRegistry).setDefaultFontSetClass('material-symbols-outlined');
  }
}
