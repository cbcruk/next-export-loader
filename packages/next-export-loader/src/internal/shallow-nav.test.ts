import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isShallowNavigation,
  markShallowNavigation,
  releaseShallowNavigation,
  resetShallowNavigation,
} from './shallow-nav';

test('shallow-nav: nothing is armed by default', () => {
  resetShallowNavigation();
  assert.equal(isShallowNavigation('/list?sort=name'), false);
});

test('shallow-nav: an armed target matches its exact path', () => {
  resetShallowNavigation();
  markShallowNavigation('/list?sort=price');
  assert.equal(isShallowNavigation('/list?sort=price'), true);
  assert.equal(isShallowNavigation('/list?sort=name'), false);
});

test('shallow-nav: trailing slash is normalized (trailingSlash: true exports)', () => {
  resetShallowNavigation();
  markShallowNavigation('/list?sort=price'); // as passed to shallowPush
  assert.equal(isShallowNavigation('/list/?sort=price'), true); // as router.asPath
});

test('shallow-nav: root path is not over-trimmed', () => {
  resetShallowNavigation();
  markShallowNavigation('/');
  assert.equal(isShallowNavigation('/'), true);
});

test('shallow-nav: read does not consume — StrictMode re-invoke stays shallow', () => {
  resetShallowNavigation();
  markShallowNavigation('/list?sort=price');
  assert.equal(isShallowNavigation('/list?sort=price'), true);
  assert.equal(isShallowNavigation('/list?sort=price'), true); // still armed
});

test('shallow-nav: moving to a different path releases the stale intent', () => {
  resetShallowNavigation();
  markShallowNavigation('/list?sort=price');
  releaseShallowNavigation('/list?sort=price'); // same path: kept
  assert.equal(isShallowNavigation('/list?sort=price'), true);
  releaseShallowNavigation('/other'); // different path: released
  assert.equal(isShallowNavigation('/list?sort=price'), false);
});

test('shallow-nav: re-arming overwrites the previous target', () => {
  resetShallowNavigation();
  markShallowNavigation('/list?sort=price');
  markShallowNavigation('/list?sort=name');
  assert.equal(isShallowNavigation('/list?sort=price'), false);
  assert.equal(isShallowNavigation('/list?sort=name'), true);
});
