import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import "./style.css";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const WAVE_URL = import.meta.env.VITE_WAVE_PAYMENT_URL;

const supabase =
SUPABASE_URL && SUPABASE_KEY
? createClient(SUPABASE_URL, SUPABASE_KEY)
: null;

const demoServices = [
{
id: "demo-1",
category: "Onglerie",
name: "Manucure",
min_price: 5000,
max_price: 5000,
duration_minutes: 60,
daily_limit: 10,
active: true,
},
{
id: "demo-2",
category: "Onglerie",
name: "Pédicure",
min_price: 7000,
max_price: 7000,
duration_minutes: 60,
daily_limit: 10,
active: true,
},
{
id: "demo-3",
category: "Cils",
name: "Extension de cils",
min_price: 15000,
max_price: 15000,
duration_minutes: 120,
daily_limit: 5,
active: true,
},
{
id: "demo-4",
category: "Sourcils",
name: "Microshading",
min_price: 25000,
max_price: 25000,
duration_minutes: 120,
daily_limit: 5,
active: true,
},
];

function App() {
const [services, setServices] = useState([]);
const [category, setCategory] = useState("Toutes");
const [selected, setSelected] = useState(null);

const [date, setDate] = useState("");
const [time, setTime] = useState("");
const [name, setName] = useState("");
const [phone, setPhone] = useState("");
const [comment, setComment] = useState("");

const [times, setTimes] = useState([]);
const [message, setMessage] = useState("");
const [loading, setLoading] = useState(true);

useEffect(() => {
async function loadServices() {
if (!supabase) {
setServices(demoServices);
setLoading(false);
return;
}

const { data, error } = await supabase
.from("services")
.select("*")
.eq("active", true)
.order("category")
.order("name");

if (error) {
console.error(error);
setServices(demoServices);
setMessage(
"Mode aperçu activé. La connexion à la base de données doit encore être configurée."
);
} else {
setServices(data || []);
}

setLoading(false);
}

loadServices();
}, []);

const categories = useMemo(
() => [
"Toutes",
...new Set(
services.map((service) => service.category).filter(Boolean)
),
],
[services]
);

const displayedServices = services.filter(
(service) =>
category === "Toutes" || service.category === category
);

useEffect(() => {
async function loadAvailableTimes() {
if (!date || !selected || !supabase) {
setTimes([
"10:00",
"10:30",
"11:00",
"11:30",
"12:00",
"12:30",
"13:00",
"13:30",
"14:00",
"14:30",
"15:00",
"15:30",
"16:00",
"16:30",
"17:00",
"17:30",
"18:00",
"18:30",
"19:00",
"19:30",
"20:00",
]);
return;
}

const dayOfWeek = new Date(
`${date}T12:00:00`
).getDay();

const { data: businessHours } = await supabase
.from("business_hours")
.select("*")
.eq("day_of_week", dayOfWeek)
.maybeSingle();

if (!businessHours?.is_open) {
setTimes([]);
return;
}

const { data: bookings } = await supabase
.from("bookings")
.select("booking_time")
.eq("booking_date", date);

const { data: blocked } = await supabase
.from("blocked_slots")
.select("blocked_time")
.eq("blocked_date", date);

const taken = new Set(
(bookings || []).map((item) =>
String(item.booking_time).slice(0, 5)
)
);

const blockedTimes = new Set(
(blocked || [])
.filter((item) => item.blocked_time)
.map((item) =>
String(item.blocked_time).slice(0, 5)
)
);

const available = [];

let [hour, minute] = String(
businessHours.opening_time
)
.slice(0, 5)
.split(":")
.map(Number);

const [closingHour, closingMinute] = String(
businessHours.closing_time
)
.slice(0, 5)
.split(":")
.map(Number);

while (
hour * 60 +
minute +
selected.duration_minutes <=
closingHour * 60 + closingMinute
) {
const currentTime =
String(hour).padStart(2, "0") +
":" +
String(minute).padStart(2, "0");

if (
!taken.has(currentTime) &&
!blockedTimes.has(currentTime)
) {
available.push(currentTime);
}

minute += 30;

if (minute >= 60) {
hour += 1;
minute -= 60;
}
}

setTimes(available);
}

loadAvailableTimes();
}, [date, selected]);

async function reserve(event) {
event.preventDefault();
setMessage("");

if (!selected || !date || !time || !name || !phone) {
setMessage(
"Veuillez remplir tous les champs obligatoires."
);
return;
}

if (!supabase || String(selected.id).startsWith("demo-")) {
setMessage(
"La réservation est prête. Il faut maintenant connecter Supabase pour enregistrer réellement le rendez-vous."
);
return;
}

const { count, error: countError } = await supabase
.from("bookings")
.select("*", {
count: "exact",
head: true,
})
.eq("service_id", selected.id)
.eq("booking_date", date);

if (countError) {
setMessage(countError.message);
return;
}

if ((count || 0) >= selected.daily_limit) {
setMessage(
"La limite quotidienne de cette prestation est atteinte."
);
return;
}

const { error } = await supabase
.from("bookings")
.insert({
service_id: selected.id,
booking_date: date,
booking_time: `${time}:00`,
customer_name: name,
customer_phone: phone,
customer_comment: comment,
reservation_fee: 5000,
payment_status: "pending",
booking_status: "pending",
});

if (error) {
setMessage(error.message);
return;
}

setMessage(
"Réservation enregistrée. Redirection vers le paiement de l’acompte de 5 000 FCFA..."
);

if (WAVE_URL && !WAVE_URL.includes("COLLER_")) {
setTimeout(() => {
window.location.href = WAVE_URL;
}, 1000);
}
}

return (
<div className="page">
<header>
<div className="brand">
GLOW <span>&</span> SHINE
</div>

<p>
Institut de beauté · Réservation en ligne
</p>
</header>

<main>
<section className="hero">
<h1>
Réservez votre moment beauté
</h1>

<p>
Choisissez une prestation, une date et un créneau.
</p>
</section>

<div className="cats">
{categories.map((item) => (
<button
key={item}
className={
category === item ? "active" : ""
}
onClick={() => {
setCategory(item);
setSelected(null);
setTime("");
}}
>
{item}
</button>
))}
</div>

{loading ? (
<p style={{ textAlign: "center" }}>
Chargement des prestations…
</p>
) : (
<div className="grid">
{displayedServices.map((service) => (
<article
key={service.id}
className={
selected?.id === service.id
? "card selected"
: "card"
}
onClick={() => {
setSelected(service);
setTime("");
setMessage("");
}}
>
<small>{service.category}</small>

<h3>{service.name}</h3>

<p>
{service.min_price ===
service.max_price
? `${service.min_price} FCFA`
: `${service.min_price}–${service.max_price} FCFA`}
</p>

<span>
{service.duration_minutes} min
</span>
</article>
))}
</div>
)}

{selected && (
<section className="booking">
<h2>
Réserver : {selected.name}
</h2>

<form onSubmit={reserve}>
<label>
Date
<input
type="date"
min={
new Date()
.toISOString()
.slice(0, 10)
}
value={date}
onChange={(event) =>
setDate(event.target.value)
}
required
/>
</label>

<label>
Créneau
<select
value={time}
onChange={(event) =>
setTime(event.target.value)
}
required
>
<option value="">
Choisir un créneau
</option>

{times.map((item) => (
<option key={item} value={item}>
{item}
</option>
))}
</select>
</label>

<label>
Nom complet
<input
type="text"
value={name}
onChange={(event) =>
setName(event.target.value)
}
placeholder="Votre nom"
required
/>
</label>

<label>
Téléphone
<input
type="tel"
value={phone}
onChange={(event) =>
setPhone(event.target.value)
}
placeholder="77 XXX XX XX"
required
/>
</label>

<label>
Commentaire
<textarea
value={comment}
onChange={(event) =>
setComment(event.target.value)
}
placeholder="Informations complémentaires"
/>
</label>

<div className="fee">
Acompte de réservation :
<b> 5 000 FCFA</b>
</div>

<button
type="submit"
className="submit"
>
Confirmer et payer l’acompte
</button>
</form>

{message && (
<div className="message">
{message}
</div>
)}
</section>
)}
</main>

<footer>
Glow & Shine · Ouvert de 10h à 21h
</footer>
</div>
);
}

createRoot(
document.getElementById("root")
).render(<App />);
