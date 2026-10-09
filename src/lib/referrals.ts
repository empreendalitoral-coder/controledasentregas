import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
export type ReferralWallet = { code: string; available: number; pending: number; reserved: number; redeemed: number };
export const referralQuery = queryOptions({ queryKey: ['referrals'], queryFn: async () => {
  const {data:auth,error:authError}=await supabase.auth.getUser();
  if(authError || !auth.user) throw new Error('Entre na sua conta');
  const [wallet, commissions, redemptions] = await Promise.all([
    supabase.rpc('get_referral_wallet'),
    supabase.from('referral_commissions').select('id,amount,available_at,cancelled,created_at').eq('user_id',auth.user.id).order('created_at',{ascending:false}).limit(100),
    supabase.from('referral_redemptions').select('*').eq('user_id',auth.user.id).order('created_at',{ascending:false}).limit(100),
  ]);
  if(wallet.error) throw wallet.error;
  if(commissions.error) throw commissions.error;
  if(redemptions.error) throw redemptions.error;
  return { wallet: wallet.data as unknown as ReferralWallet, commissions: commissions.data, redemptions: redemptions.data };
}});
export function referralCommission(value: number) { return Math.round((value * 0.05 + Number.EPSILON) * 100) / 100; }
export function discountAmount(balance: number, price: number) { return balance >= 10 ? Math.min(balance,price) : 0; }
export function referralCode(value: unknown): string | undefined { return typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value) ? value.toLowerCase() : undefined; }
