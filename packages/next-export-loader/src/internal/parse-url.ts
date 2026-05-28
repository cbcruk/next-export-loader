import type { ParsedUrlQuery } from 'querystring';

export function parseUrl(url: string): ParsedUrlQuery {
  const searchIndex = url.indexOf('?');
  if (searchIndex === -1) return {};

  const hashIndex = url.indexOf('#', searchIndex);
  const search =
    hashIndex === -1
      ? url.slice(searchIndex + 1)
      : url.slice(searchIndex + 1, hashIndex);
  const params = new URLSearchParams(search);
  const query: ParsedUrlQuery = {};

  params.forEach((value, key) => {
    const existing = query[key];
    if (existing === undefined) {
      query[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      query[key] = [existing, value];
    }
  });

  return query;
}
