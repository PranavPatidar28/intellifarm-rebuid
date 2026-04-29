type OnboardingStep = 'language' | 'login' | 'profile' | 'plot' | 'season' | 'done';

export function resolveRouteForStep(step: OnboardingStep) {
  switch (step) {
    case 'language':
      return '/language' as const;
    case 'login':
      return '/login' as const;
    case 'profile':
      return '/profile' as const;
    case 'plot':
      return '/plot' as const;
    case 'season':
      return '/season' as const;
    case 'done':
    default:
      return '/home' as const;
  }
}
