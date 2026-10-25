export type Freq='weekly'|'monthly'
export const rwf=(n:number)=>'RWF '+Math.round(n).toLocaleString('en-US')
export const cycleOf=(freq:Freq,start:string,now=new Date())=>{
  const s=new Date(start+'T00:00:00')
  return freq==='weekly'?Math.max(0,Math.floor((+now-+s)/6048e5)):Math.max(0,(now.getFullYear()-s.getFullYear())*12+now.getMonth()-s.getMonth())}
/** Flat interest, rounded to whole francs: principal + principal x rate% x months */
export const dueOf=(principal:number,rate:number,months:number)=>principal+Math.round(principal*rate/100*months)
export const cashHeld=(saved:number,lent:number,repaid:number)=>saved-lent+repaid
/** '' = no phone, null = invalid, otherwise 2507XXXXXXXX */
export const normPhone=(s:string):string|null=>{
  const d=s.replace(/\D/g,''); if(!d)return ''
  if(/^250\d{9}$/.test(d))return d; if(/^0\d{9}$/.test(d))return '250'+d.slice(1); if(/^\d{9}$/.test(d))return '250'+d; return null}
export const checkAmount=(n:number):string|null=>!Number.isInteger(n)||n<=0?'Enter a whole amount above 0.':n>10_000_000?'That amount is too large.':null
export const checkLoan=(principal:number,rate:number,months:number,cash:number):string|null=>
  checkAmount(principal)||(rate<0||rate>100?'Interest must be between 0 and 100.':!Number.isInteger(months)||months<1||months>60?'Months must be between 1 and 60.':principal>cash?`The group only holds ${rwf(cash)}.`:null)
