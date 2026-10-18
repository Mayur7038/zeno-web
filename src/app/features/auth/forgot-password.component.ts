import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './forgot-password.component.html',
})
export class ForgotPasswordComponent implements OnDestroy {
  step: 1 | 2 = 1;
  email = '';
  otp = '';
  newPassword = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;

  loading = false;
  errorMessage = '';
  successMessage = '';
  devOtp = '';
  resetSuccess = false;

  cooldownTimer = 0;
  private intervalId: any = null;

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  onRequestOtp() {
    if (!this.email.trim()) return;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.auth.forgotPassword(this.email.trim()).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.step = 2;
        this.successMessage = res.message || 'Verification code sent to your email.';
        if (res.devOtp) {
          this.devOtp = res.devOtp;
        }
        this.startCooldown(res.cooldownSeconds || 60);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Failed to dispatch verification code. Please try again.';
      },
    });
  }

  onResendOtp() {
    if (this.cooldownTimer > 0 || !this.email) return;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.auth.forgotPassword(this.email.trim()).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.successMessage = 'A new verification code has been dispatched.';
        if (res.devOtp) {
          this.devOtp = res.devOtp;
        }
        this.startCooldown(res.cooldownSeconds || 60);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Failed to resend code. Please wait before retrying.';
      },
    });
  }

  onResetPassword() {
    if (!this.otp.trim()) {
      this.errorMessage = 'Please enter the 6-digit verification code.';
      return;
    }
    if (this.newPassword.length < 8) {
      this.errorMessage = 'Password must be at least 8 characters long.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.auth
      .resetPassword({
        email: this.email.trim(),
        otp: this.otp.trim(),
        newPassword: this.newPassword,
      })
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          this.resetSuccess = true;
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err.error?.message || 'Password reset failed. Invalid or expired code.';
        },
      });
  }

  fillDevOtp() {
    if (this.devOtp) {
      this.otp = this.devOtp;
    }
  }

  changeEmail() {
    this.step = 1;
    this.otp = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.errorMessage = '';
    this.successMessage = '';
    this.devOtp = '';
    this.stopCooldown();
  }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }

  private startCooldown(seconds: number) {
    this.stopCooldown();
    this.cooldownTimer = seconds;
    this.intervalId = setInterval(() => {
      this.cooldownTimer--;
      if (this.cooldownTimer <= 0) {
        this.stopCooldown();
      }
    }, 1000);
  }

  private stopCooldown() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  ngOnDestroy() {
    this.stopCooldown();
  }
}
