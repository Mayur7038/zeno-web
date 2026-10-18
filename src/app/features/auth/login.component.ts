import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;
  errorMessage = '';

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  onLogin() {
    this.loading = true;
    this.errorMessage = '';

    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 0) {
          this.errorMessage = 'Unable to connect to backend server (http://localhost:4000). Please check server status.';
        } else {
          const rawMsg = err.error?.message;
          if (Array.isArray(rawMsg)) {
            this.errorMessage = rawMsg.join(', ');
          } else {
            this.errorMessage = rawMsg || 'Login failed. Please check your credentials.';
          }
        }
      },
    });
  }
}
