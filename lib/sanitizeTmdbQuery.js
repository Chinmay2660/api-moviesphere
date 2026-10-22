const ALLOWED_QUERY_KEYS = new Set([
  'page',
  'language',
  'region',
  'sort_by',
  'with_genres',
  'with_original_language',
  'with_origin_country',
  'query',
  'include_adult',
  'year',
  'primary_release_year',
  'primary_release_date.gte',
  'primary_release_date.lte',
  'first_air_date.gte',
  'first_air_date.lte',
  'with_watch_providers',
  'watch_region',
  'vote_count.gte',
  'vote_average.gte',
  'vote_average.lte',
]);

const MAX_QUERY_VALUE_LEN = 200;
const TMDB_MAX_PAGE = 500;

function sanitizeTmdbQuery(rawQuery) {
  const out = {};
  if (!rawQuery || typeof rawQuery !== 'object') return out;

  for (const [key, value] of Object.entries(rawQuery)) {
    if (!ALLOWED_QUERY_KEYS.has(key)) continue;
    if (value == null) continue;

    if (key === 'page') {
      const page = Number.parseInt(String(value), 10);
      if (!Number.isFinite(page)) continue;
      out.page = String(Math.min(TMDB_MAX_PAGE, Math.max(1, page)));
      continue;
    }

    const str = String(value).slice(0, MAX_QUERY_VALUE_LEN);
    if (str.length === 0) continue;
    out[key] = str;
  }

  return out;
}

if (require.main === module) {
  const assert = require('assert');
  assert.deepStrictEqual(sanitizeTmdbQuery({ page: '9999', evil: 'x' }), { page: '500' });
  assert.deepStrictEqual(sanitizeTmdbQuery({ query: 'a'.repeat(300) }).query.length, 200);
  assert.deepStrictEqual(sanitizeTmdbQuery({ sort_by: 'popularity.desc' }), {
    sort_by: 'popularity.desc',
  });
  console.log('sanitizeTmdbQuery self-check ok');
}

module.exports = { sanitizeTmdbQuery, TMDB_MAX_PAGE };
