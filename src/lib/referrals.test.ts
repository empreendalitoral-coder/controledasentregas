import {describe,it,expect} from 'vitest';
import {discountAmount,referralCode,referralCommission,referralLandingLink,referralSearch} from './referrals';
describe('referral rules',()=>{
 it('rounds commission to cents',()=>{expect(referralCommission(9.9)).toBe(.5);expect(referralCommission(69.9)).toBe(3.5);});
 it('requires ten reais and preserves the remainder',()=>{expect(discountAmount(9.99,9.9)).toBe(0);expect(discountAmount(10,9.9)).toBe(9.9);expect(10-discountAmount(10,9.9)).toBeCloseTo(.1);expect(discountAmount(10,69.9)).toBe(10);});
 it('validates attribution codes',()=>{expect(referralCode('https://evil.test')).toBeUndefined();expect(referralCode(null)).toBeUndefined();expect(referralCode('ABCDEF12-1111-1111-1111-111111111111')).toBe('abcdef12-1111-1111-1111-111111111111');});
 it('sends invitations to Conheça with the same attribution code',()=>{
  const code='abcdef12-1111-1111-1111-111111111111';
  const link=new URL(referralLandingLink(code));
  expect(link.origin+link.pathname).toBe('https://meuentregapro.app/conheca');
  expect(referralSearch(Object.fromEntries(link.searchParams))).toEqual({ref:code});
 });
 it('omits invalid attribution rather than forwarding it to signup',()=>{
  expect(referralLandingLink('invalid')).toBe('https://meuentregapro.app/conheca');
  expect(referralSearch({ref:'invalid'})).toEqual({});
 });
});
