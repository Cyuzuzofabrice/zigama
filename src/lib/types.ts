import type {Freq} from './money'
export type G={id:string;name:string;amount:number;freq:Freq;start_date:string;share_token:string}
export type M={id:string;name:string;phone:string|null}
export type P={id:string;member_id:string;cycle:number;amount:number;method:string;voided_at:string|null;created_at:string}
export type L={id:string;member_id:string;principal:number;rate:number;months:number}
export type R={id:string;loan_id:string;amount:number;voided_at:string|null;created_at:string}
export type Data={members:M[];pays:P[];loans:L[];reps:R[]}
export type Shared={group:Omit<G,'id'|'share_token'>;members:{id:string;name:string}[];payments:{member_id:string;cycle:number;amount:number}[]}
