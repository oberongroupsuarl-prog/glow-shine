import React,{useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createClient} from '@supabase/supabase-js';
import './style.css';

const supabase=createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);
const waveUrl=import.meta.env.VITE_WAVE_PAYMENT_URL;

function App(){
 const [services,setServices]=useState([]),[cat,setCat]=useState('Toutes'),[selected,setSelected]=useState(null);
 const [date,setDate]=useState(''),[time,setTime]=useState(''),[name,setName]=useState(''),[phone,setPhone]=useState(''),[comment,setComment]=useState('');
 const [times,setTimes]=useState([]),[message,setMessage]=useState(''),[loading,setLoading]=useState(true);

 useEffect(()=>{supabase.from('services').select('*').eq('active',true).order('category').order('name').then(({data,error})=>{if(error)setMessage(error.message);setServices(data||[]);setLoading(false)})},[]);
 const categories=useMemo(()=>['Toutes',...new Set(services.map(s=>s.category).filter(Boolean))],[services]);
 const shown=services.filter(s=>cat==='Toutes'||s.category===cat);

 useEffect(()=>{ if(!date||!selected){setTimes([]);return;}
   const load=async()=>{
    const {data:hours}=await supabase.from('business_hours').select('*').eq('day_of_week',new Date(date+'T12:00:00').getDay()).maybeSingle();
    if(!hours?.is_open){setTimes([]);return;}
    const {data:bookings}=await supabase.from('bookings').select('booking_time').eq('booking_date',date);
    const {data:blocked}=await supabase.from('blocked_slots').select('blocked_time').eq('blocked_date',date);
    const taken=new Set((bookings||[]).map(x=>String(x.booking_time).slice(0,5)));
    const blockedSet=new Set((blocked||[]).filter(x=>x.blocked_time).map(x=>String(x.blocked_time).slice(0,5)));
    const out=[]; let [h,m]=String(hours.opening_time).slice(0,5).split(':').map(Number);
    const [eh,em]=String(hours.closing_time).slice(0,5).split(':').map(Number);
    while(h*60+m + selected.duration_minutes <= eh*60+em){
      const t=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
      if(!taken.has(t)&&!blockedSet.has(t)) out.push(t);
      m+=30;h+=Math.floor(m/60);m%=60;
    } setTimes(out);
   }; load();
 },[date,selected]);

 async function reserve(e){
   e.preventDefault();setMessage('');
   if(!selected||!date||!time||!name||!phone){setMessage('Veuillez remplir tous les champs obligatoires.');return;}
   const {count}=await supabase.from('bookings').select('*',{count:'exact',head:true}).eq('service_id',selected.id).eq('booking_date',date);
   if((count||0)>=selected.daily_limit){setMessage('La limite quotidienne de cette prestation est atteinte.');return;}
   const {error}=await supabase.from('bookings').insert({service_id:selected.id,booking_date:date,booking_time:time+':00',customer_name:name,customer_phone:phone,customer_comment:comment,reservation_fee:5000,payment_status:'pending',booking_status:'pending'});
   if(error){setMessage(error.message);return;}
   setMessage('Réservation enregistrée. Vous allez être redirigée vers le paiement de l’acompte de 5 000 FCFA.');
   if(waveUrl && !waveUrl.includes('COLLER_')) setTimeout(()=>location.href=waveUrl,700);
 }

 return <div className="page">
  <header><div className="brand">GLOW <span>&</span> SHINE</div><p>Institut de beauté · Réservation en ligne</p></header>
  <main>
   <section className="hero"><h1>Réservez votre moment beauté</h1><p>Choisissez une prestation, une date et un créneau.</p></section>
   <div className="cats">{categories.map(c=><button className={cat===c?'active':''} onClick={()=>setCat(c)} key={c}>{c}</button>)}</div>
   {loading?<p>Chargement des prestations…</p>:<div className="grid">{shown.map(s=><article className={selected?.id===s.id?'card selected':'card'} key={s.id} onClick={()=>{setSelected(s);setTime('')}}><small>{s.category}</small><h3>{s.name}</h3><p>{s.min_price===s.max_price?`${s.min_price} FCFA`:`${s.min_price}–${s.max_price} FCFA`}</p><span>{s.duration_minutes} min</span></article>)}</div>}
   {selected&&<section className="booking"><h2>Réserver : {selected.name}</h2><form onSubmit={reserve}>
    <label>Date<input type="date" min={new Date().toISOString().slice(0,10)} value={date} onChange={e=>setDate(e.target.value)} required/></label>
    <label>Créneau<select value={time} onChange={e=>setTime(e.target.value)} required><option value="">Choisir</option>{times.map(t=><option key={t}>{t}</option>)}</select></label>
    <label>Nom complet<input value={name} onChange={e=>setName(e.target.value)} required/></label>
    <label>Téléphone<input value={phone} onChange={e=>setPhone(e.target.value)} required/></label>
    <label>Commentaire<textarea value={comment} onChange={e=>setComment(e.target.value)}/></label>
    <div className="fee">Acompte de réservation : <b>5 000 FCFA</b></div>
    <button className="submit">Confirmer et payer l’acompte</button>
   </form>{message&&<div className="message">{message}</div>}</section>}
  </main>
  <footer>Glow & Shine · 10h–21h</footer>
 </div>
}
createRoot(document.getElementById('root')).render(<App/>);
