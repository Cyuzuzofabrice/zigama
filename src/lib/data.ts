import {supabase} from './supabase'
import type {G,Data,Shared} from './types'
const fail=(e:{message:string}|null)=>{if(e)throw new Error(e.message)}
export async function getGroup():Promise<G|null>{const r=await supabase.from('groups').select('*').order('created_at').limit(1);fail(r.error);return (r.data?.[0] as G)??null}
export async function createGroup(name:string,amount:number,freq:string){const r=await supabase.from('groups').insert({name,amount,freq}).select('*').single();fail(r.error);return r.data as G}
export async function loadAll(gid:string):Promise<Data>{
  const q=(t:string)=>supabase.from(t).select('*').eq('group_id',gid).order('created_at')
  const [m,p,l,r]=await Promise.all([q('members'),q('payments'),q('loans'),q('repayments')])
  for(const x of [m,p,l,r])fail(x.error)
  return {members:m.data as Data['members'],pays:p.data as Data['pays'],loans:l.data as Data['loans'],reps:r.data as Data['reps']}}
export async function insert(table:'members'|'payments'|'loans'|'repayments',row:object){const r=await supabase.from(table).insert(row);fail(r.error)}
export async function setVoid(table:'payments'|'repayments',id:string,voided:boolean){const r=await supabase.from(table).update({voided_at:voided?new Date().toISOString():null}).eq('id',id);fail(r.error)}
export async function deleteGroup(id:string){const r=await supabase.from('groups').delete().eq('id',id);fail(r.error)}
export async function getShared(token:string):Promise<Shared|null>{const r=await supabase.rpc('get_shared',{token});fail(r.error);return (r.data as Shared)??null}
