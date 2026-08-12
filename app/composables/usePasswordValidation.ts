import { z } from 'zod';
import {
  emailSchema,
  passwordComplexitySchema,
  registrationPasswordFormSchema,
  usernameSchema,
} from '#shared/schemas/authSchema';

export { passwordComplexitySchema, registrationPasswordFormSchema as registrationSchema };

export interface PasswordStrength {
  score: number; // 0-100
  level: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
  feedback: string;
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
  color: string;
}

export type RegistrationFormData = z.infer<typeof registrationPasswordFormSchema>;

export function usePasswordValidation() {
  /**
   * Calculate password strength based on various criteria
   */
  function calculatePasswordStrength(password: string): PasswordStrength {
    if (!password) {
      return {
        score: 0,
        level: 'weak',
        feedback: 'Enter a password',
        checks: {
          length: false,
          uppercase: false,
          lowercase: false,
          number: false,
          special: false,
        },
        color: 'hsl(var(--destructive))',
      };
    }

    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[^a-z0-9]/i.test(password),
    };

    // Calculate score (20 points per check)
    let score = 0;
    if (checks.length) score += 20;
    if (checks.uppercase) score += 20;
    if (checks.lowercase) score += 20;
    if (checks.number) score += 20;
    if (checks.special) score += 20;

    // Bonus points for extra length
    if (password.length >= 12) score += 5;
    if (password.length >= 16) score += 5;

    // Cap at 100
    score = Math.min(score, 100);

    // Determine level and feedback
    let level: PasswordStrength['level'];
    let feedback: string;
    let color: string;

    if (score < 40) {
      level = 'weak';
      feedback = 'Weak password - add more variety';
      color = 'hsl(var(--destructive))';
    } else if (score < 60) {
      level = 'fair';
      feedback = 'Fair password - could be stronger';
      color = 'hsl(25, 95%, 53%)';
    } else if (score < 80) {
      level = 'good';
      feedback = 'Good password';
      color = 'hsl(45, 93%, 47%)';
    } else if (score < 100) {
      level = 'strong';
      feedback = 'Strong password';
      color = 'hsl(142, 76%, 36%)';
    } else {
      level = 'very-strong';
      feedback = 'Very strong password!';
      color = 'hsl(142, 76%, 36%)';
    }

    return {
      score,
      level,
      feedback,
      checks,
      color,
    };
  }

  /**
   * Validate a single field using Zod schema
   */
  function validateField<T extends keyof RegistrationFormData>(
    field: T,
    value: string,
    formData?: Partial<RegistrationFormData>,
  ): string | null {
    try {
      if (field === 'password') {
        passwordComplexitySchema.parse(value);
        return null;
      }

      if (field === 'confirmPassword' && formData?.password) {
        if (value !== formData.password) {
          return 'Passwords do not match';
        }
        return null;
      }

      // For other fields, validate individually
      if (field === 'username') {
        usernameSchema.parse(value);
      }

      return null;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.issues[0]?.message || 'Invalid input';
      }
      return 'Validation error';
    }
  }

  /**
   * Validate entire form
   */
  function validateForm(data: RegistrationFormData): {
    success: boolean;
    errors: Partial<Record<keyof RegistrationFormData, string>>;
  } {
    try {
      registrationPasswordFormSchema.parse(data);
      return { success: true, errors: {} };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Partial<Record<keyof RegistrationFormData, string>> = {};
        error.issues.forEach((issue) => {
          const field = issue.path[0];
          if (
            (field === 'username' ||
              field === 'password' ||
              field === 'confirmPassword') &&
            !errors[field]
          ) {
            errors[field] = issue.message;
          }
        });
        return { success: false, errors };
      }
      return { success: false, errors: { username: 'Validation error' } };
    }
  }

  return {
    calculatePasswordStrength,
    validateField,
    validateForm,
    registrationSchema: registrationPasswordFormSchema,
    passwordComplexitySchema,
  };
}
