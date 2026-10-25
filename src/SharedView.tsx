import {useEffect,useState} from 'react'
import {getShared} from './lib/data'
import {cycleOf,rwf} from './lib/money'
import type {Shared} from './lib/types'
export default function SharedView({token}:{token:string}){
  const [s,setS]=useState<Shared|null|undefined>(undefined),[err,setErr]=useState('')
  useEffect(()=>{getShared(token).then(setS).catch(e=>setErr(e.message))},[token])
  if(err)return <div className="app"><div className="err">{err}</div></div>
  if(s===undefined)return <div className="app"><p className="empty">Loading…</p></div>
  if(!s)return <div className="app"><p className="empty">This link is not valid. Ask your treasurer for a new one.</p></div>
  const cy=cycleOf(s.group.freq,s.group.start_date), amt=s.group.amount
  const paid=(id:string)=>s.payments.filter(p=>p.member_id===id&&p.cycle===cy).reduce((a,p)=>a+p.amount,0)
  const got=s.members.reduce((a,m)=>a+Math.min(paid(m.id),amt),0), target=amt*s.members.length, pct=target?Math.round(got/target*100):0
  return <div className="app"><header><b className="logo">Zigama</b><span>{s.group.name}</span></header>
    <section className="hero"><div className="ring big" style={{['--p' as string]:pct}}><div><strong>{pct}%</strong><small>collected</small></div></div><div><h1>Round {cy+1}</h1><p>{rwf(got)} of {rwf(target)}</p><p className="soft">Read-only view</p></div></section>
    <div className="card">{s.members.map(m=>{const p=paid(m.id);return <div className="line" key={m.id}><span>{m.name}</span><b className={p>=amt?'ok':'warn'}>{p>=amt?'Paid':rwf(amt-p)+' left'}</b></div>})}</div></div>
}
