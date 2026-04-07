import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 10 },  // Ramp up
    { duration: '5m', target: 50 }, // Peak
    { duration: '2m', target: 100 }, // Stress
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% under 500ms
    http_req_failed: ['rate<0.01'],   // <1% errors
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://api.pantry-pal.com';

export default function () {
  // Health check
  const health = http.get(`${BASE_URL}/health`);
  check(health, {
    'health status is 200': (r) => r.status === 200,
  });

  // API endpoints
  const items = http.get(`${BASE_URL}/api/items`, {
    headers: {
      Authorization: `Bearer ${__ENV.TEST_TOKEN}`,
    },
  });
  
  check(items, {
    'items status is 200': (r) => r.status === 200,
    'items is array': (r) => Array.isArray(r.json()),
  });

  sleep(1);
}
