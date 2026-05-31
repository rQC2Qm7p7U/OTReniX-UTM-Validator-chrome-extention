import { calculateHealthScore } from './src/popup/store.js';
import assert from 'assert';

console.log('=== Running Health Score Algorithm Tests ===\n');

// Mock data helper
const createMockData = ({
  forms = [],
  redirects = [],
  storages = { local: {}, session: {} },
  cookies = [],
  url = 'https://example.com'
}) => ({
  forms,
  redirects,
  storages,
  cookies,
  url
});

// Test Case 1: Perfect Configuration
try {
  const data = createMockData({
    url: 'https://example.com?utm_source=google&utm_medium=cpc&li_fat_id=123',
    forms: [
      {
        id: 'lead-form',
        inputs: [
          { name: 'utm_source', type: 'hidden', value: 'google' },
          { name: 'utm_medium', type: 'hidden', value: 'cpc' },
          { name: 'li_fat_id', type: 'hidden', value: '123' },
          { name: 'email', type: 'email', value: 'test@test.com' }
        ]
      }
    ],
    cookies: [
      { name: '_ga', value: 'GA1.2.123' },
      { name: '_ym_uid', value: 'YM123' },
      { name: 'CookieConsent', value: 'true' }
    ]
  });

  const result = calculateHealthScore(data.forms, data.redirects, data.storages, data.cookies, data.url);
  assert.strictEqual(result.score, 100);
  assert.strictEqual(result.penalties.length, 0);
  console.log('✅ Test 1: Perfect configuration returns 100 points.');
} catch (e) {
  console.error('❌ Test 1 failed:', e.message);
}

// Test Case 2: Missing UTM hidden fields in form (-40)
try {
  const data = createMockData({
    url: 'https://example.com?utm_source=google&utm_medium=cpc',
    forms: [
      {
        id: 'lead-form',
        inputs: [
          { name: 'email', type: 'email', value: 'test@test.com' }
        ]
      }
    ],
    cookies: [
      { name: '_ga', value: 'GA1.2.123' },
      { name: '_ym_uid', value: 'YM123' },
      { name: 'CookieConsent', value: 'true' }
    ]
  });

  const result = calculateHealthScore(data.forms, data.redirects, data.storages, data.cookies, data.url);
  assert.strictEqual(result.score, 60); // 100 - 40
  assert.strictEqual(result.penalties[0].type, 'critical');
  console.log('✅ Test 2: Missing hidden fields when UTM in URL returns 60 points (-40).');
} catch (e) {
  console.error('❌ Test 2 failed:', e.message);
}

// Test Case 3: Redirect stripped UTM tail (-40)
try {
  const data = createMockData({
    url: 'https://example.com', // Final URL has no UTM
    forms: [
      {
        id: 'lead-form',
        inputs: [
          { name: 'email', type: 'email', value: '' }
        ]
      }
    ],
    redirects: [
      {
        from: 'https://example.com?utm_source=linkedin&utm_medium=social',
        to: 'https://example.com',
        timestamp: Date.now()
      }
    ],
    cookies: [
      { name: '_ga', value: 'GA1.2.123' },
      { name: '_ym_uid', value: 'YM123' },
      { name: 'CookieConsent', value: 'true' }
    ]
  });

  const result = calculateHealthScore(data.forms, data.redirects, data.storages, data.cookies, data.url);
  
  // Here, we have redirect penalty (-40) and no utm in url but form has no tracking slots penalty (-15)
  // Let's verify score: 100 - 40 (redirect) - 15 (no slots for capturing) = 45
  assert.strictEqual(result.score, 45);
  assert.ok(result.penalties.some(p => p.type === 'critical' && p.label.includes('Redirect')));
  console.log('✅ Test 3: UTM stripped by redirect correctly penalizes (-40).');
} catch (e) {
  console.error('❌ Test 3 failed:', e.message);
}

// Test Case 4: Hidden fields are present, but their values are empty (-30)
try {
  const data = createMockData({
    url: 'https://example.com?utm_source=google',
    forms: [
      {
        id: 'lead-form',
        inputs: [
          { name: 'utm_source', type: 'hidden', value: '' }, // empty hidden input
          { name: 'email', type: 'email', value: '' }
        ]
      }
    ],
    cookies: [
      { name: '_ga', value: 'GA1.2.123' },
      { name: '_ym_uid', value: 'YM123' },
      { name: 'CookieConsent', value: 'true' }
    ]
  });

  const result = calculateHealthScore(data.forms, data.redirects, data.storages, data.cookies, data.url);
  
  // It has the slots, but they are empty: -30 (empty slots)
  // Let's verify score: 100 - 30 = 70
  assert.strictEqual(result.score, 70);
  assert.strictEqual(result.penalties[0].type, 'high');
  console.log('✅ Test 4: Hidden fields found but empty (-30).');
} catch (e) {
  console.error('❌ Test 4 failed:', e.message);
}

// Test Case 5: Missing web analytics cookies (_ga, _ym_uid) (-10)
try {
  const data = createMockData({
    url: 'https://example.com?utm_source=google',
    forms: [
      {
        id: 'lead-form',
        inputs: [
          { name: 'utm_source', type: 'hidden', value: 'google' }
        ]
      }
    ],
    cookies: [] // No cookies at all
  });

  const result = calculateHealthScore(data.forms, data.redirects, data.storages, data.cookies, data.url);
  assert.strictEqual(result.score, 90); // 100 - 10
  assert.strictEqual(result.penalties[0].type, 'warning');
  console.log('✅ Test 5: Missing web analytics cookies penalizes 10 points.');
} catch (e) {
  console.error('❌ Test 5 failed:', e.message);
}

// Test Case 6: Script detected but not initialized (-10)
try {
  const data = createMockData({
    url: 'https://example.com?utm_source=google',
    forms: [
      {
        id: 'lead-form',
        inputs: [
          { name: 'utm_source', type: 'hidden', value: 'google' }
        ]
      }
    ],
    cookies: [
      { name: '_ga', value: 'GA1.2.123' },
      { name: '_ym_uid', value: 'YM123' },
      { name: 'CookieConsent', value: 'true' }
    ] // Cookies are present (no cookie penalty)
  });

  const detected = { gtm: true };
  const initialized = { gtm: false };

  const result = calculateHealthScore(
    data.forms,
    data.redirects,
    data.storages,
    data.cookies,
    data.url,
    [],
    detected,
    initialized
  );
  
  assert.strictEqual(result.score, 90); // 100 - 10 (GTM loading failure)
  assert.strictEqual(result.penalties[0].type, 'warning');
  assert.ok(result.penalties[0].label.includes('Google Tag Manager not initialized'));
  console.log('✅ Test 6: Script detected but not initialized penalizes -10 points.');
} catch (e) {
  console.error('❌ Test 6 failed:', e.message);
}

// Test Case 7: Case-Insensitive UTM parameter parsing
try {
  const data = createMockData({
    url: 'https://example.com?UTM_Source=Google&utm_medium=CPC', // mixed case URL parameters
    forms: [
      {
        id: 'lead-form',
        inputs: [
          { name: 'utm_source', type: 'hidden', value: 'Google' }, // lowercase fields
          { name: 'utm_medium', type: 'hidden', value: 'CPC' }
        ]
      }
    ],
    cookies: [
      { name: '_ga', value: 'GA1.2.123' },
      { name: '_ym_uid', value: 'YM123' },
      { name: 'CookieConsent', value: 'true' }
    ]
  });

  const result = calculateHealthScore(data.forms, data.redirects, data.storages, data.cookies, data.url);
  assert.strictEqual(result.score, 100);
  assert.strictEqual(result.penalties.length, 0);
  console.log('✅ Test 7: Case-insensitive UTM parameter matching works correctly.');
} catch (e) {
  console.error('❌ Test 7 failed:', e.message);
}

// Test Case 8: Robustness check with undefined/null arguments
try {
  // Pass null or undefined parameters to calculateHealthScore
  const result = calculateHealthScore(null, undefined, null, undefined, 'https://example.com');
  
  // Missing analytics cookies penalty (-10) is still expected because cookies array is resolved to empty fallback
  assert.strictEqual(result.score, 90);
  assert.strictEqual(result.penalties[0].type, 'warning');
  console.log('✅ Test 8: Robustness to missing/null arguments verified successfully.');
} catch (e) {
  console.error('❌ Test 8 failed:', e.message);
}

// Test Case 9: Missing standard cookies but has Marketo/HubSpot B2B cookies (no penalty)
try {
  const data = createMockData({
    url: 'https://example.com?utm_source=google',
    forms: [
      {
        id: 'lead-form',
        inputs: [
          { name: 'utm_source', type: 'hidden', value: 'google' }
        ]
      }
    ],
    cookies: [
      { name: '_mkto_trk', value: 'id:123' },
      { name: 'CookieConsent', value: 'true' }
    ]
  });

  const result = calculateHealthScore(data.forms, data.redirects, data.storages, data.cookies, data.url);
  assert.strictEqual(result.score, 100);
  assert.strictEqual(result.penalties.length, 0);
  console.log('✅ Test 9: B2B Marketo cookies bypass standard GA/YM missing cookie penalties.');
} catch (e) {
  console.error('❌ Test 9 failed:', e.message);
}

// Test Case 10: Missing standard cookies but has HubSpot B2B cookies (no penalty)
try {
  const data = createMockData({
    url: 'https://example.com?utm_source=google',
    forms: [
      {
        id: 'lead-form',
        inputs: [
          { name: 'utm_source', type: 'hidden', value: 'google' }
        ]
      }
    ],
    cookies: [
      { name: 'hubspotutk', value: 'hubspot123' },
      { name: 'CookieConsent', value: 'true' }
    ]
  });

  const result = calculateHealthScore(data.forms, data.redirects, data.storages, data.cookies, data.url);
  assert.strictEqual(result.score, 100);
  assert.strictEqual(result.penalties.length, 0);
  console.log('✅ Test 10: B2B HubSpot cookies bypass standard GA/YM missing cookie penalties.');
} catch (e) {
  console.error('❌ Test 10 failed:', e.message);
}

// Test Case 11: GA cookie present with no consent cookie triggers penalty (-15)
try {
  const data = createMockData({
    url: 'https://example.com?utm_source=google',
    forms: [
      {
        id: 'lead-form',
        inputs: [
          { name: 'utm_source', type: 'hidden', value: 'google' }
        ]
      }
    ],
    cookies: [
      { name: '_ga', value: 'GA1.2.3' },
      { name: '_ym_uid', value: 'YM123' }
    ]
  });

  const result = calculateHealthScore(data.forms, data.redirects, data.storages, data.cookies, data.url);
  assert.strictEqual(result.score, 85);
  assert.ok(result.penalties.some(p => p.label.includes('GDPR/CCPA Prior Consent')));
  console.log('✅ Test 11: GA cookie present with no consent cookie triggers penalty (-15).');
} catch (e) {
  console.error('❌ Test 11 failed:', e.message);
}

// Test Case 12: GA cookie present alongside CookieConsent is compliant (no penalty)
try {
  const data = createMockData({
    url: 'https://example.com?utm_source=google',
    forms: [
      {
        id: 'lead-form',
        inputs: [
          { name: 'utm_source', type: 'hidden', value: 'google' }
        ]
      }
    ],
    cookies: [
      { name: '_ga', value: 'GA1.2.3' },
      { name: '_ym_uid', value: 'YM123' },
      { name: 'CookieConsent', value: 'true' }
    ]
  });

  const result = calculateHealthScore(data.forms, data.redirects, data.storages, data.cookies, data.url);
  assert.strictEqual(result.score, 100);
  assert.strictEqual(result.penalties.length, 0);
  console.log('✅ Test 12: GA cookie present alongside CookieConsent is compliant (no penalty).');
} catch (e) {
  console.error('❌ Test 12 failed:', e.message);
}

// Test Case 13: No cookies present returns compliant status (no penalty)
try {
  const data = createMockData({
    url: 'https://example.com?utm_source=google',
    forms: [
      {
        id: 'lead-form',
        inputs: [
          { name: 'utm_source', type: 'hidden', value: 'google' }
        ]
      }
    ],
    cookies: []
  });

  const result = calculateHealthScore(data.forms, data.redirects, data.storages, data.cookies, data.url);
  assert.strictEqual(result.score, 90);
  assert.ok(!result.penalties.some(p => p.label.includes('GDPR/CCPA Prior Consent')));
  console.log('✅ Test 13: No cookies present returns compliant consent status (no prior consent penalty).');
} catch (e) {
  console.error('❌ Test 13 failed:', e.message);
}

console.log('\n=== Testing Complete! ===');
