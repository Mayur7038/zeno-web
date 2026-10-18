import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './signup.component.html',
})
export class SignupComponent {
  step = 1;
  companyName = '';
  fullName = '';
  email = '';
  mobile = '';
  gstin = '';
  password = '';
  otp = '';

  loading = false;
  errorMessage = '';
  devOtpNotice = '';

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  onRequestOtp() {
    this.errorMessage = '';

    const mobile = this.mobile?.trim();
    if (!mobile) {
      this.errorMessage = 'Mobile number is required.';
      return;
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      this.errorMessage = 'Please enter a valid 10-digit mobile number.';
      return;
    }

    this.loading = true;

    this.auth
      .signup({
        companyName: this.companyName?.trim(),
        fullName: this.fullName?.trim(),
        email: this.email?.trim(),
        mobile,
        gstin: this.gstin?.trim() || undefined,
        password: this.password,
        stateCode: '27',
        stateName: 'Maharashtra',
      })
      .subscribe({
        next: (res) => {
          this.loading = false;
          this.step = 2;
          if (res.devOtp) {
            this.devOtpNotice = res.devOtp;
            this.otp = res.devOtp;
          }
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = this.extractError(err, 'Failed to initiate signup');
        },
      });
  }

  onVerifyOtp() {
    this.loading = true;
    this.errorMessage = '';

    this.auth.verifyOtp(this.email, this.otp).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = this.extractError(err, 'Verification failed');
      },
    });
  }

  private extractError(err: any, fallback: string): string {
    if (err.status === 0) {
      return 'Unable to connect to the backend service (http://localhost:4000). Please verify the server is running.';
    }
    const rawMsg = err.error?.message;
    if (Array.isArray(rawMsg)) {
      return rawMsg.join(', ');
    }
    return rawMsg || err.statusText || fallback;
  }
}