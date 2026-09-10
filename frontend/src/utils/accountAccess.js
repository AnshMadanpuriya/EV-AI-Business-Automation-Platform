export const isStaff = user => ['admin', 'agent', 'viewer'].includes(user?.role);

export function accountDestination(user, next) {
  if (/^\/subscribe\/(starter|growth|enterprise)_(monthly|annual)$/.test(next || '')) return next;
  return '/dashboard';
}
