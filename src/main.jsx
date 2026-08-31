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
Onglerie:
"https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1200&q=85",

Ongles:
"https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1200&q=85",

Pédicure:
"https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?auto=format&fit=crop&w=1200&q=85",

Cils:
"https://images.unsplash.com/photo-1589710751893-f9a6770ad71b?auto=format&fit=crop&w=1200&q=85",

"Pose cils":
"https://images.unsplash.com/photo-1589710751893-f9a6770ad71b?auto=format&fit=crop&w=1200&q=85",

Sourcils:
"https://images.unsplash.com/photo-1583001931096-959e9a1a6223?auto=format&fit=crop&w=1200&q=85",

Coiffure:
"https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=85",

"Coiffure enfant":
"https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=1200&q=85",

Coiffures:
"https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=85",

"Soins capillaires":
"https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1200&q=85",

"Soins du visage":
"https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=85",

Visage:
"https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=85",

Piercing:
"https://images.unsplash.com/photo-1583001931096-959e9a1a6223?auto=format&fit=crop&w=1200&q=85",
};

const defaultImage =
"https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=85";

/*
Prestations de secours.
Elles permettent au site de rester visible même si Supabase
ne renvoie momentanément aucune donnée.
*/
const fallbackServices = [
{
id: "fallback-manucure",
category: "Onglerie",
name: "Manucure",
min_price: 5000,
max_price: 5000,
duration_minutes: 60,
appointment_required: true,
image_url: fallbackImages.Onglerie,
},
{
id: "fallback-pedicure",
category: "Pédicure",
name: "Pédicure",
min_price: 7000,
max_price: 7000,
duration_minutes: 60,
appointment_required: true,
image_url: fallbackImages.Pédicure,
},
{
id: "fallback-cils",
category: "Cils",
name: "Extension de cils",
min_price: 15000,
max_price: 15000,
duration_minutes: 120,
appointment_required: true,
image_url: fallbackImages.Cils,
},
];

function formatPrice(service) {
const min = Number(service.min_price || 0);
const max = Number(service.max_price || 0);

if (min === max) {
return `${min.toLocaleString("fr-FR")} FCFA`;
}

return `${min.toLocaleString(
"fr-FR"
)} – ${max.toLocaleString("fr-FR")} FCFA`;
}

function getLocalDate() {
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, "0");
const day = String(now.getDate()).padStart(2, "0");

return `${year}-${month}-${day}`;
}

function Logo() {
return (
<div className="logo">
<div className="logo-mark">G</div>

<div className="logo-text">
<div className="logo-name">
GLOW <span>&amp;</span> SHINE
</div>

<div className="logo-subtitle">
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
const [bookingLoading, setBookingLoading] = useState(false);

useEffect(() => {
async function loadServices() {
setLoading(true);
setMessage("");

if (!supabase) {
setServices(fallbackServices);
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
console.error("Supabase services:", error);
setServices(fallbackServices);
} else if (data && data.length > 0) {
setServices(data);
} else {
setServices(fallbackServices);
}

setLoading(false);
}

loadServices();
}, []);

const categories = useMemo(() => {
const values = services
.map((service) => service.category)
.filter(Boolean);

return ["Toutes", ...Array.from(new Set(values))];
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

const selectedDate = new Date(`${date}T12:00:00`);
const dayOfWeek = selectedDate.getDay();

const { data: businessHours } = await supabase
.from("business_hours")
.select("*")
.eq("day_of_week", dayOfWeek)
.maybeSingle();

if (!businessHours?.is_open) {
return;
}

const { data: bookings } = await supabase
.from("bookings")
.select(
"booking_time, booking_status, service_id"
)
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

const opening = String(
businessHours.opening_time
).slice(0, 5);

const closing = String(
businessHours.closing_time
).slice(0, 5);

let [hour, minute] = opening
.split(":")
.map(Number);

const [closingHour, closingMinute] = closing
.split(":")
.map(Number);

const openingMinutes = hour * 60 + minute;
const closingMinutes =
closingHour * 60 + closingMinute;

const duration = Number(
selected.duration_minutes || 0
);

while (true) {
const currentMinutes = hour * 60 + minute;

if (
currentMinutes + duration >
closingMinutes
) {
break;
}

const currentTime =
`${String(hour).padStart(2, "0")}:` +
`${String(minute).padStart(2, "0")}`;

if (
currentMinutes >= openingMinutes &&
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
setTimes([]);
setMessage("");

window.setTimeout(() => {
if (service.appointment_required) {
document
.getElementById("booking")
?.scrollIntoView({
behavior: "smooth",
block: "start",
});
}
}, 50);
}

function changeCategory(newCategory) {
setCategory(newCategory);
setSelected(null);
setDate("");
setTime("");
setTimes([]);
setMessage("");
}

async function reserve(event) {
event.preventDefault();

setMessage("");

if (!selected?.appointment_required) {
return;
}

if (!date || !time || !name.trim() || !phone.trim()) {
setMessage(
"Veuillez remplir tous les champs obligatoires."
);
return;
}

if (!supabase) {
setMessage(
"Le système de réservation est momentanément indisponible."
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

const { data: existing, error: existingError } =
await supabase
.from("bookings")
.select("id")
.eq("booking_date", date)
.eq("booking_time", `${time}:00`)
.neq("booking_status", "cancelled")
.limit(1);

if (existingError) {
throw existingError;
}

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
customer_name: name.trim(),
customer_phone: phone.trim(),
customer_comment: comment.trim(),
reservation_fee: 5000,
payment_status: "pending",
booking_status: "pending",
});

if (error) {
throw error;
}

setMessage(
"Réservation enregistrée. Redirection vers le paiement de l'acompte de 5 000 FCFA..."
);

if (
WAVE_URL &&
!WAVE_URL.includes("COLLER_")
) {
window.setTimeout(() => {
window.location.href = WAVE_URL;
}, 1200);
}
} catch (error) {
console.error("Réservation:", error);

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
<div className="hero-inner">
<span className="eyebrow">
GLOW &amp; SHINE
</span>

<h1>
Réservez votre
<br />
moment beauté
</h1>

<p>
Découvrez nos prestations et choisissez
votre soin en quelques clics.
</p>
</div>
</section>

<section className="category-section">
<div className="container">
<span className="eyebrow">
NOS UNIVERS
</span>

<h2>Nos catégories</h2>

<div className="category-list">
{categories.map((item) => {
const image =
fallbackImages[item] ||
defaultImage;

return (
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
src={image}
alt=""
/>
)}

<span>{item}</span>
</button>
);
})}
</div>
</div>
</section>

<section className="services-section">
<div className="container">
<div className="section-top">
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
<div className="state-box">
Chargement des prestations…
</div>
) : displayedServices.length === 0 ? (
<div className="state-box">
Aucune prestation disponible.
</div>
) : (
<div className="services-grid">
{displayedServices.map((service) => {
const appointmentRequired =
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
onError={(event) => {
event.currentTarget.src =
defaultImage;
}}
/>

<span
className={`service-badge ${
appointmentRequired
? "appointment"
: "walkin"
}`}
>
{appointmentRequired
? "Sur rendez-vous"
: "Sans rendez-vous"}
</span>
</div>

<div className="service-content">
<span className="service-category">
{service.category}
</span>

<h3>{service.name}</h3>

{service.description && (
<p className="service-description">
{service.description}
</p>
)}

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

{appointmentRequired ? (
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
</div>
</section>

{selected &&
selected.appointment_required && (
<section
id="booking"
className="booking-section"
>
<div className="booking-card">
<div className="booking-header">
<div>
<span className="eyebrow">
RÉSERVATION
</span>

<h2>{selected.name}</h2>

<p>
Choisissez votre date et votre
créneau.
</p>
</div>

<div className="booking-price">
<span>Acompte</span>
<strong>5 000 FCFA</strong>
</div>
</div>

<form onSubmit={reserve}>
<div className="form-grid">
<label>
<span>Date *</span>

<input
type="date"
min={getLocalDate()}
value={date}
onChange={(event) => {
setDate(event.target.value);
setTime("");
setMessage("");
}}
required
/>
</label>

<label>
<span>Créneau *</span>

<select
value={time}
onChange={(event) =>
setTime(event.target.value)
}
disabled={!date}
required
>
<option value="">
{date
? times.length
? "Choisir un créneau"
: "Aucun créneau disponible"
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
<span>Nom complet *</span>

<input
type="text"
value={name}
onChange={(event) =>
setName(event.target.value)
}
placeholder="Votre nom complet"
required
/>
</label>

<label>
<span>Téléphone *</span>

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
<span>Commentaire</span>

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
<strong>Important :</strong> un
acompte de{" "}
<strong>5 000 FCFA</strong> est
obligatoire pour confirmer votre
réservation.
</div>

<button
type="submit"
className="submit-button"
disabled={bookingLoading}
>
{bookingLoading
? "Enregistrement…"
: "Confirmer et payer 5 000 FCFA"}
</button>
</form>

{message && (
<div className="booking-message">
{message}
</div>
)}
</div>
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
