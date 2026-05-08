import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  navLinks = [
    { label: 'Explore Tasks', active: true },
    { label: 'My Workflows',  active: false },
    { label: 'History',       active: false },
    { label: 'Pricing',       active: false },
  ];
}
