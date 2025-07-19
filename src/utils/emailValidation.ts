export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
  suggestions?: string[];
}

// Common email domains and their frequent typos
const DOMAIN_CORRECTIONS: Record<string, string> = {
  // Gmail variations
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmil.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.om': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmails.com': 'gmail.com',
  
  // Yahoo variations
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'yahoo.cm': 'yahoo.com',
  'yahoo.om': 'yahoo.com',
  'ymail.co': 'ymail.com',
  
  // Outlook/Hotmail variations
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'hotmail.cm': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'outlook.cm': 'outlook.com',
  
  // Other common domains
  'aol.co': 'aol.com',
  'aol.cm': 'aol.com',
  'icloud.co': 'icloud.com',
  'icloud.cm': 'icloud.com',
  'protonmail.co': 'protonmail.com',
  'protonmail.cm': 'protonmail.com',
};

// Trusted email domains (whitelist)
const TRUSTED_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
  'icloud.com', 'protonmail.com', 'ymail.com', 'live.com', 'msn.com',
  'comcast.net', 'verizon.net', 'att.net', 'sbcglobal.net', 'cox.net',
  'charter.net', 'earthlink.net', 'juno.com', 'mail.com', 'zoho.com',
  'fastmail.com', 'tutanota.com', 'mailbox.org', 'runbox.com',
  // Educational domains
  'edu', 'ac.uk', 'edu.au', 'edu.ca',
  // Government domains
  'gov', 'mil', 'gov.uk', 'gov.au', 'gov.ca',
  // Common business domains
  'company.com', 'corporation.com', 'business.com'
]);

// Suspicious TLDs that are often used for spam/fake emails
const SUSPICIOUS_TLDS = new Set([
  'tk', 'ml', 'ga', 'cf', 'gq', 'pw', 'top', 'click', 'download',
  'stream', 'science', 'racing', 'review', 'faith', 'accountant',
  'loan', 'win', 'cricket', 'date', 'party', 'trade', 'webcam'
]);

// Common disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com', 'tempmail.org', 'guerrillamail.com', 'mailinator.com',
  'throwaway.email', 'temp-mail.org', 'getnada.com', 'maildrop.cc',
  'sharklasers.com', 'grr.la', 'guerrillamailblock.com', 'pokemail.net',
  'spam4.me', 'bccto.me', 'chacuo.net', 'dispostable.com', 'fakeinbox.com'
]);

/**
 * Validates basic email format using RFC 5322 compliant regex
 */
export function validateEmailFormat(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
}

/**
 * Checks for common domain typos and suggests corrections
 */
export function checkDomainTypos(email: string): { hasTypo: boolean; suggestion?: string } {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return { hasTypo: false };

  const correction = DOMAIN_CORRECTIONS[domain];
  if (correction) {
    const username = email.split('@')[0];
    return {
      hasTypo: true,
      suggestion: `${username}@${correction}`
    };
  }

  return { hasTypo: false };
}

/**
 * Checks if the domain uses a suspicious TLD
 */
export function checkSuspiciousTLD(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;

  const tld = domain.split('.').pop();
  return tld ? SUSPICIOUS_TLDS.has(tld) : false;
}

/**
 * Checks if the email uses a disposable/temporary email service
 */
export function checkDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;

  return DISPOSABLE_DOMAINS.has(domain);
}

/**
 * Checks if the domain is from a trusted provider
 */
export function checkTrustedDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;

  // Check exact match first
  if (TRUSTED_DOMAINS.has(domain)) return true;

  // Check if it's an educational or government domain
  const parts = domain.split('.');
  const tld = parts[parts.length - 1];
  const secondLevelDomain = parts.length > 1 ? parts[parts.length - 2] : '';

  // Educational domains
  if (tld === 'edu' || domain.endsWith('.edu') || 
      domain.endsWith('.ac.uk') || domain.endsWith('.edu.au') || 
      domain.endsWith('.edu.ca')) {
    return true;
  }

  // Government domains
  if (tld === 'gov' || domain.endsWith('.gov') || 
      domain.endsWith('.gov.uk') || domain.endsWith('.gov.au') || 
      domain.endsWith('.gov.ca') || tld === 'mil') {
    return true;
  }

  // Common business TLDs
  const businessTlds = ['com', 'org', 'net', 'co', 'io', 'biz'];
  if (businessTlds.includes(tld) && parts.length >= 2) {
    // Allow business domains but flag very short or suspicious ones
    return domain.length > 6 && !domain.includes('test') && !domain.includes('example');
  }

  return false;
}

/**
 * Detects potentially fake or randomly generated email addresses
 */
export function checkRandomGenerated(email: string): boolean {
  const username = email.split('@')[0]?.toLowerCase();
  if (!username) return false;

  // Check for very long usernames (likely random)
  if (username.length > 20) return true;

  // Check for high ratio of numbers to letters
  const numbers = (username.match(/\d/g) || []).length;
  const letters = (username.match(/[a-z]/g) || []).length;
  if (numbers > 0 && letters > 0 && numbers / letters > 2) return true;

  // Check for consecutive random characters
  const consecutivePattern = /(.)\1{3,}/; // 4 or more consecutive same characters
  if (consecutivePattern.test(username)) return true;

  // Check for patterns that look like random generation
  const randomPatterns = [
    /^[a-z]{1,3}\d{6,}$/, // Short letters followed by many numbers
    /^\d{6,}[a-z]{1,3}$/, // Many numbers followed by short letters
    /^[a-z]\d[a-z]\d[a-z]\d/, // Alternating letter-number pattern
    /^(test|temp|fake|dummy|sample)\d*$/i, // Obviously fake usernames
    /^[qwerty]{4,}$/i, // Keyboard mashing
    /^[asdf]{4,}$/i, // More keyboard mashing
  ];

  return randomPatterns.some(pattern => pattern.test(username));
}

/**
 * Checks for common username patterns that suggest fake emails
 */
export function checkSuspiciousUsername(email: string): boolean {
  const username = email.split('@')[0]?.toLowerCase();
  if (!username) return false;

  const suspiciousPatterns = [
    'noreply', 'no-reply', 'donotreply', 'do-not-reply',
    'admin', 'administrator', 'root', 'system', 'daemon',
    'test', 'testing', 'temp', 'temporary', 'fake', 'dummy',
    'example', 'sample', 'demo', 'null', 'void', 'none'
  ];

  return suspiciousPatterns.some(pattern => username.includes(pattern));
}

/**
 * Main email validation function that orchestrates all checks
 */
export function validateEmail(email: string): EmailValidationResult {
  // Trim and convert to lowercase for consistency
  const trimmedEmail = email.trim().toLowerCase();

  // Basic format validation
  if (!validateEmailFormat(trimmedEmail)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address (e.g., user@example.com)'
    };
  }

  // Check for domain typos
  const typoCheck = checkDomainTypos(trimmedEmail);
  if (typoCheck.hasTypo) {
    return {
      isValid: false,
      error: 'Did you mean this email address?',
      suggestions: [typoCheck.suggestion!]
    };
  }

  // Check for disposable email
  if (checkDisposableEmail(trimmedEmail)) {
    return {
      isValid: false,
      error: 'Temporary or disposable email addresses are not allowed. Please use a permanent email address.'
    };
  }

  // Check for suspicious username patterns
  if (checkSuspiciousUsername(trimmedEmail)) {
    return {
      isValid: false,
      error: 'This email address appears to be a system or test email. Please use your personal email address.'
    };
  }

  // Check for randomly generated emails
  if (checkRandomGenerated(trimmedEmail)) {
    return {
      isValid: false,
      error: 'This email address appears to be randomly generated. Please enter a valid email address.'
    };
  }

  // Check for suspicious TLD
  if (checkSuspiciousTLD(trimmedEmail)) {
    return {
      isValid: false,
      error: 'This email domain appears suspicious. Please use an email from a trusted provider.'
    };
  }

  // Check if domain is trusted (warning, not blocking)
  if (!checkTrustedDomain(trimmedEmail)) {
    // For now, we'll allow it but could add a warning in the future
    // This is more lenient to avoid blocking legitimate business emails
  }

  return {
    isValid: true
  };
}

/**
 * Real-time email validation for form inputs
 */
export function validateEmailRealTime(email: string): EmailValidationResult {
  // Don't validate empty emails (let required field validation handle that)
  if (!email.trim()) {
    return { isValid: true };
  }

  // For real-time validation, we can be less strict to avoid annoying users while typing
  const trimmedEmail = email.trim().toLowerCase();

  // Only check basic format if email looks complete (has @ and domain)
  if (trimmedEmail.includes('@') && trimmedEmail.split('@')[1]?.includes('.')) {
    return validateEmail(trimmedEmail);
  }

  return { isValid: true };
}