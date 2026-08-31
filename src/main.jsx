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

const fallbackImages = {
"Coiffure enfant":
"https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=900&q=80",

Coiffures:
"https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=80",

Ongles:
"https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=80",

Pédicure:
"https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?auto=format&fit=crop&w=900&q=80",

Piercing:
"https://images.unsplash.com/photo-1583001931096-959e9a1a6223?auto=format&fit=crop&w=900&q=80",

"Pose cils":
"https://images.unsplash.com/photo-1589710751893-f9a6770ad71b?auto=format&fit=crop&w=900&q=80",

"Soins capillaires":
"https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=900&q=80",

"Soins du visage":
"https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=80",

Sourcils:
"https://images.unsplash.com/photo-1583001931096-959e9a1a6223?auto=format&fit=crop&w=900&q=80",
};

const defaultImage =
"https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=80";

function formatPrice(service) {
if (service.min_price === service.max_price) {
return `${Number(service.min_price).toLocaleString("fr-FR")} FCFA`;
}

return `${Number(service.min_price).toLocaleString(
"fr-FR"
)} – ${Number(service.max_price).toLocaleString(
"fr-FR"
)} FCFA`;
}

function Logo() {
return (
<div className="brand">
<div className="brand-symbol">G</div>

<div>
<div className="brand-title">
GLOW <span>&amp;</span> SHINE
</div>

<div className="brand-subtitle">
INSTITUT DE BEAUTÉ
</div>
</div>
</div>
);
}

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
const [bookingLoading, setBookingLoading] =
useState(false);

useEffect(() => {
async function loadServices() {
setLoading(true);

if (!supabase) {
setServices([]);
setMessage(
"La connexion à Supabase n'est pas configurée."
);
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
setServices([]);
setMessage(
"Impossible de charger les prestations."
);
} else {
setServices(data || []);
}

setLoading(false);
}

loadServices();
}, []);

const categories = useMemo(() => {
return [
"Toutes",
...Array.from(
new Set(
services
.map((service) => service.category)
.filter(Boolean)
)
),
];
}, [services]);

const displayedServices = useMemo(() => {
if (category === "Toutes") {
return services;
}

return services.filter(
(service) => service.category === category
);
}, [services, category]);

useEffect(() => {
async function loadAvailableTimes() {
setTimes([]);

if (
!selected ||
!selected.appointment_required ||
!date
) {
return;
}

if (!supabase) {
return;
}

const dayOfWeek = new Date(
`${date}T12:00:00`
).getDay();

const { data: businessHours, error: hoursError } =
await supabase
.from("business_hours")
.select("*")
.eq("day_of_week", dayOfWeek)
.maybeSingle();

if (hoursError || !businessHours?.is_open) {
return;
}

const { data: bookings } = await supabase
.from("bookings")
.select("booking_time, booking_status")
.eq("booking_date", date);

const { data: blockedSlots } = await supabase
.from("blocked_slots")
.select("blocked_time")
.eq("blocked_date", date);

const taken = new Set(
(bookings || [])
.filter(
(booking) =>
booking.booking_status !== "cancelled"
)
.map((booking) =>
String(booking.booking_time).slice(0, 5)
)
);

const blocked = new Set(
(blockedSlots || []).map((slot) =>
String(slot.blocked_time).slice(0, 5)
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

const openingMinutes = hour * 60 + minute;
const closingMinutes =
closingHour * 60 + closingMinute;

while (
hour * 60 +
minute +
Number(selected.duration_minutes || 0) <=
closingMinutes
) {
const currentMinutes = hour * 60 + minute;

const currentTime =
`${String(hour).padStart(2, "0")}:` +
`${String(minute).padStart(2, "0")}`;

const duration = Number(
selected.duration_minutes || 0
);

const endMinutes =
currentMinutes + duration;

const endHour = Math.floor(endMinutes / 60);
const endMinute = endMinutes % 60;

const validEnd =
endHour * 60 + endMinute <=
closingMinutes;

if (
currentMinutes >= openingMinutes &&
validEnd &&
!taken.has(currentTime) &&
!blocked.has(currentTime)
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

function selectService(service) {
setSelected(service);
setDate("");
setTime("");
setMessage("");

if (!service.appointment_required) {
setTimes([]);
}
}

function changeCategory(newCategory) {
setCategory(newCategory);
setSelected(null);
setDate("");
setTime("");
setMessage("");
setTimes([]);
}

async function reserve(event) {
event.preventDefault();

setMessage("");

if (!selected?.appointment_required) {
return;
}

if (!date || !time || !name || !phone) {
setMessage(
"Veuillez remplir tous les champs obligatoires."
);
return;
}

if (!supabase) {
setMessage(
"La connexion à Supabase n'est pas disponible."
);
return;
}

setBookingLoading(true);

try {
const { count, error: countError } =
await supabase
.from("bookings")
.select("*", {
count: "exact",
head: true,
})
.eq("service_id", selected.id)
.eq("booking_date", date)
.neq("booking_status", "cancelled");

if (countError) {
throw countError;
}

if (
selected.daily_limit &&
Number(count || 0) >=
Number(selected.daily_limit)
) {
setMessage(
"La limite quotidienne de cette prestation est atteinte."
);
return;
}

const { data: existing } = await supabase
.from("bookings")
.select("id")
.eq("booking_date", date)
.eq("booking_time", `${time}:00`)
.neq("booking_status", "cancelled")
.limit(1);

if (existing && existing.length > 0) {
setMessage(
"Ce créneau vient d'être réservé. Veuillez en choisir un autre."
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
throw error;
}

setMessage(
"Votre réservation est enregistrée. Redirection vers le paiement de l'acompte de 5 000 FCFA..."
);

if (
WAVE_URL &&
!WAVE_URL.includes("COLLER_")
) {
setTimeout(() => {
window.location.href = WAVE_URL;
}, 1200);
}
} catch (error) {
console.error(error);

setMessage(
error?.message ||
"Une erreur est survenue lors de la réservation."
);
} finally {
setBookingLoading(false);
}
}

return (
<div className="page">
<header className="site-header">
<Logo />

<p className="header-text">
Institut de beauté · Réservation en ligne
</p>
</header>

<main>
<section className="hero">
<div className="hero-content">
<span className="eyebrow">
GLOW &amp; SHINE
</span>

<h1>
Réservez votre moment beauté
</h1>

<p>
Découvrez nos prestations et choisissez
votre soin en quelques clics.
</p>
</div>
</section>

<section className="category-section">
<div className="section-heading">
<div>
<span className="eyebrow">
NOS UNIVERS
</span>

<h2>Nos catégories</h2>
</div>
</div>

<div className="category-list">
{categories.map((item) => (
<button
key={item}
type="button"
className={`category-button ${
category === item ? "active" : ""
}`}
onClick={() =>
changeCategory(item)
}
>
{item !== "Toutes" && (
<img
src={
fallbackImages[item] ||
defaultImage
}
alt=""
/>
)}

<span>{item}</span>
</button>
))}
</div>
</section>

<section className="services-section">
<div className="section-heading">
<div>
<span className="eyebrow">
PRESTATIONS
</span>

<h2>
{category === "Toutes"
? "Toutes nos prestations"
: category}
</h2>
</div>

{!loading && (
<span className="service-count">
{displayedServices.length} prestation
{displayedServices.length > 1
? "s"
: ""}
</span>
)}
</div>

{loading ? (
<div className="loading">
Chargement des prestations…
</div>
) : displayedServices.length === 0 ? (
<div className="empty">
Aucune prestation disponible.
</div>
) : (
<div className="services-grid">
{displayedServices.map((service) => {
const requiresAppointment =
Boolean(
service.appointment_required
);

const image =
service.image_url ||
fallbackImages[
service.category
] ||
defaultImage;

return (
<article
key={service.id}
className={`service-card ${
selected?.id === service.id
? "selected"
: ""
}`}
onClick={() =>
selectService(service)
}
>
<div className="service-image">
<img
src={image}
alt={service.name}
loading="lazy"
/>

<span
className={`service-badge ${
requiresAppointment
? "appointment"
: "walkin"
}`}
>
{requiresAppointment
? "Sur rendez-vous"
: "Sans rendez-vous"}
</span>
</div>

<div className="service-content">
<span className="service-category">
{service.category}
</span>

<h3>{service.name}</h3>

<div className="service-info">
<strong>
{formatPrice(service)}
</strong>

{service.duration_minutes && (
<span>
{service.duration_minutes} min
</span>
)}
</div>

{requiresAppointment ? (
<button
type="button"
className="service-action"
onClick={(event) => {
event.stopPropagation();
selectService(service);
}}
>
Réserver
</button>
) : (
<div className="no-appointment">
Disponible sans rendez-vous
</div>
)}
</div>
</article>
);
})}
</div>
)}
</section>

{selected &&
selected.appointment_required && (
<section className="booking">
<div className="booking-header">
<div>
<span className="eyebrow">
RÉSERVATION
</span>

<h2>
{selected.name}
</h2>
</div>

<div className="booking-price">
Acompte
<strong>5 000 FCFA</strong>
</div>
</div>

<form onSubmit={reserve}>
<div className="form-grid">
<label>
Date
<input
type="date"
min={new Date()
.toISOString()
.slice(0, 10)}
value={date}
onChange={(event) => {
setDate(event.target.value);
setTime("");
}}
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
disabled={!date}
>
<option value="">
{date
? "Choisir un créneau"
: "Choisir d'abord une date"}
</option>

{times.map((item) => (
<option
key={item}
value={item}
>
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

<label className="full">
Commentaire
<textarea
value={comment}
onChange={(event) =>
setComment(
event.target.value
)
}
placeholder="Informations complémentaires"
/>
</label>
</div>

<div className="booking-notice">
Un acompte obligatoire de{" "}
<strong>5 000 FCFA</strong> sera demandé
pour confirmer votre réservation.
</div>

<button
type="submit"
className="submit-button"
disabled={bookingLoading}
>
{bookingLoading
? "Enregistrement…"
: "Confirmer et payer l'acompte"}
</button>
</form>

{message && (
<div className="booking-message">
{message}
</div>
)}
</section>
)}

{selected &&
!selected.appointment_required && (
<section className="walkin-panel">
<span className="eyebrow">
SANS RENDEZ-VOUS
</span>

<h2>{selected.name}</h2>

<p>
Cette prestation est disponible sans
rendez-vous. Vous pouvez venir directement
à l'institut pendant les heures
d'ouverture.
</p>

<strong>
Ouvert de 10h à 21h
</strong>
</section>
)}
</main>

<footer className="site-footer">
<Logo />

<p>
Glow &amp; Shine · Ouvert de 10h à 21h
</p>
</footer>
</div>
);
}

createRoot(
document.getElementById("root")
).render(<App />);
