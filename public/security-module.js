// Chesskidoo Security Module - Brute Force Protection
const SECURITY_CONFIG = {
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 30,
  WINDOW_MINUTES: 15,
  IP_TRACKING_ENABLED: true,
  SUSPICIOUS_PATTERNS: [
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, // Common password patterns
    /^(admin|root|super|master|system).*/i,
    /^(user|test|guest|demo).*/i,
  ],
  SAFE_IPS: ['127.0.0.1', 'localhost', '::1']
};

let failedLoginAttempts = {};
let lockedAccounts = {};
let suspiciousActivities = [];

// Initialize security monitoring
function initSecurity() {
  console.log('🛡️ Chesskidoo Security Module Active');
  loadSecurityState();
}

// Track failed login attempt
function trackFailedLogin(username, ip = 'Unknown') {
  const now = Date.now();
  const key = username.toLowerCase();
  
  if (!failedLoginAttempts[key]) {
    failedLoginAttempts[key] = { attempts: [], ip: ip };
  }
  
  failedLoginAttempts[key].attempts.push(now);
  failedLoginAttempts[key].ip = ip;
  
  // Clean old attempts outside window
  const windowStart = now - (SECURITY_CONFIG.WINDOW_MINUTES * 60 * 1000);
  failedLoginAttempts[key].attempts = failedLoginAttempts[key].attempts.filter(t => t > windowStart);
  
  // Check if should lock
  const attemptCount = failedLoginAttempts[key].attempts.length;
  
  if (attemptCount >= SECURITY_CONFIG.MAX_FAILED_ATTEMPTS) {
    lockAccount(username, ip);
    return { locked: true, reason: 'Too many failed attempts' };
  }
  
  return { 
    locked: false, 
    attemptsRemaining: SECURITY_CONFIG.MAX_FAILED_ATTEMPTS - attemptCount 
  };
}

// Lock account after max failures
function lockAccount(username, ip) {
  const key = username.toLowerCase();
  const lockExpiry = Date.now() + (SECURITY_CONFIG.LOCKOUT_DURATION_MINUTES * 60 * 1000);
  
  lockedAccounts[key] = {
    lockedAt: Date.now(),
    expiresAt: lockExpiry,
    ip: ip,
    reason: 'Brute force protection'
  };
  
  logSuspiciousActivity(username, 'ACCOUNT_LOCKED', ip, `Locked after ${SECURITY_CONFIG.MAX_FAILED_ATTEMPTS} failed attempts`);
  
  // Auto-unlock after duration
  setTimeout(() => {
    unlockAccount(username);
  }, SECURITY_CONFIG.LOCKOUT_DURATION_MINUTES * 60 * 1000);
}

// Unlock account
function unlockAccount(username) {
  const key = username.toLowerCase();
  if (lockedAccounts[key]) {
    delete lockedAccounts[key];
    console.log(`🔓 Account unlocked: ${username}`);
  }
}

// Check if account is locked
function isAccountLocked(username) {
  const key = username.toLowerCase();
  const lock = lockedAccounts[key];
  
  if (!lock) return false;
  
  if (Date.now() > lock.expiresAt) {
    unlockAccount(username);
    return false;
  }
  
  return true;
}

// Get lock remaining time
function getLockRemainingTime(username) {
  const key = username.toLowerCase();
  const lock = lockedAccounts[key];
  if (!lock) return 0;
  
  const remaining = lock.expiresAt - Date.now();
  return Math.max(0, Math.ceil(remaining / 60000)); // minutes
}

// Log suspicious activity
function logSuspiciousActivity(username, activityType, ip, details) {
  const activity = {
    id: 'sa_' + Date.now(),
    username: username.toLowerCase(),
    type: activityType,
    ip: ip,
    details: details,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  };
  
  suspiciousActivities.push(activity);
  
  // Keep only last 100 activities
  if (suspiciousActivities.length > 100) {
    suspiciousActivities = suspiciousActivities.slice(-100);
  }
  
  console.log(`⚠️ Suspicious Activity: ${activityType} - ${username} - ${ip}`);
}

// Detect suspicious patterns
function detectSuspiciousActivity(username, password, ip) {
  const warnings = [];
  
  // Check password patterns
  for (const pattern of SECURITY_CONFIG.SUSPICIOUS_PATTERNS) {
    if (pattern.test(password)) {
      warnings.push('Suspicious password pattern detected');
      logSuspiciousActivity(username, 'SUSPICIOUS_PASSWORD', ip, 'Password matches common attack pattern');
    }
  }
  
  // Check for SQL injection patterns
  const sqlPatterns = [/('|"|%27|%22|%3B|%3D)/i, /(union|select|insert|update|delete|drop)/i];
  for (const pattern of sqlPatterns) {
    if (pattern.test(username) || pattern.test(password)) {
      warnings.push('Potential injection attack');
      logSuspiciousActivity(username, 'INJECTION_ATTEMPT', ip, 'SQL injection pattern detected');
    }
  }
  
  return warnings;
}

// Get security status for admin dashboard
function getSecurityStatus() {
  const totalAttempts = Object.values(failedLoginAttempts).reduce((sum, a) => sum + a.attempts.length, 0);
  const currentlyLocked = Object.keys(lockedAccounts).length;
  const recentSuspicious = suspiciousActivities.filter(a => {
    const age = Date.now() - new Date(a.timestamp).getTime();
    return age < 3600000; // Last hour
  }).length;
  
  return {
    totalFailedAttempts: totalAttempts,
    currentlyLocked: currentlyLocked,
    suspiciousActivities: recentSuspicious,
    lockedAccounts: lockedAccounts
  };
}

// Get all suspicious activities
function getSuspiciousActivities() {
  return suspiciousActivities;
}

// Save state to localStorage
function saveSecurityState() {
  try {
    localStorage.setItem('chesskidoo_security', JSON.stringify({
      failedAttempts: failedLoginAttempts,
      locked: lockedAccounts,
      suspicious: suspiciousActivities
    }));
  } catch (e) {
    console.error('Failed to save security state:', e);
  }
}

// Load state from localStorage
function loadSecurityState() {
  try {
    const saved = localStorage.getItem('chesskidoo_security');
    if (saved) {
      const data = JSON.parse(saved);
      failedLoginAttempts = data.failedAttempts || {};
      lockedAccounts = data.locked || {};
      suspiciousActivities = data.suspicious || [];
      
      // Clean expired locks
      for (const username in lockedAccounts) {
        if (Date.now() > lockedAccounts[username].expiresAt) {
          delete lockedAccounts[username];
        }
      }
    }
  } catch (e) {
    console.error('Failed to load security state:', e);
  }
}

// Clear failed attempts on successful login
function clearFailedAttempts(username) {
  const key = username.toLowerCase();
  if (failedLoginAttempts[key]) {
    delete failedLoginAttempts[key];
  }
  saveSecurityState();
}

// Export functions for use in login
window.SecurityModule = {
  trackFailedLogin,
  isAccountLocked,
  getLockRemainingTime,
  detectSuspiciousActivity,
  getSecurityStatus,
  clearFailedAttempts,
  logSuspiciousActivity,
  initSecurity
};

// Auto-initialize
initSecurity();
