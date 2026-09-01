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

const categoryImages = {
Onglerie:
"https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=85",
Pédicure:
"https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?auto=format&fit=crop&w=900&q=85",
Cils:
"https://images.unsplash.com/photo-1589710751893-f9a6770ad71b?auto=format&fit=crop&w=900&q=85",
Sourcils:
"https://images.unsplash.com/photo-1583001931096-959e9a1a6223?auto=format&fit=crop&w=900&q=85",
Coiffure:
"https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=85",
"Soins du visage":
"https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=85",
"Soins du corps":
"https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=900&q=85",
Makeup:
"https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=85",
};

const defaultImage =
"https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=85";

const fallbackServices = [
{
id: "fallback-1",
category: "Onglerie",
name: "Manucure",
description: "Soin et mise en beauté des ongles.",
min_price: 5000,
max_price: 5000,
duration_minutes: 60,
appointment_required: true,
image_url: categoryImages.Onglerie,
},
{
id: "fallback-2",
category: "Pédicure",
name: "Pédicure complète",
description: "Soin complet et mise en beauté des pieds.",
min_price: 10000,
max_price: 10000,
duration_minutes: 60,
appointment_required: true,
image_url: categoryImages.Pédicure,
},
{
id: "fallback-3",
category: "Cils",
name: "Extension de cils",
description: "Pose professionnelle pour sublimer le regard.",
min_price: 15000,
max_price: 15000,
duration_minutes: 120,
appointment_required: true,
image_url: categoryImages.Cils,
},
];

function formatPrice(service) {
const min = Number(service.min_price || 0);
const max = Number(service.max_price || 0);

if (min === max) {
return `${min.toLocaleString("fr-FR")} FCFA`;
}

return `${min.toLocaleString("fr-FR")} – ${max.toLocaleString(
"fr-FR"
)} FCFA`;
}

function getToday() {
const date = new Date();

return `${date.getFullYear()}-${String(
date.getMonth() + 1
).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function Logo() {
return (
<div className="logo">
<div className="logo-mark">G&S</div>

<div className="logo-text">
<div className="logo-name">
GLOW <span>&amp;</span> SHINE
</div>

<div className="logo-subtitle">
BEAUTY CENTER
</div>
</div>
</div>
);
}

function App() {
const [services, setServices] = useState([]);
const [category, setCategory] = useState("Toutes");
const [selected, setSelected] = useState(null);

const [date, setDate] = useState(getToday());
const [time, setTime] = useState("");

const [name, setName] = useState("");
const [phone, setPhone] = useState("");
const [comment, setComment] = useState("");

const [availableTimes, setAvailableTimes] = useState([]);

const [loading, setLoading] = useState(true);
const [bookingLoading, setBookingLoading] = useState(false);
const [message, setMessage] = useState("");

useEffect(() => {
async function loadServices() {
setLoading(true);

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

if (error || !data?.length) {
console.error(error);
setServices(fallbackServices);
} else {
setServices(data);
}

setLoading(false);
}

loadServices();
}, []);

const categories = useMemo(() => {
const values = services
.map((service) => service.category)
.filter(Boolean);

return ["Toutes", ...new Set(values)];
}, [services]);

const displayedServices = useMemo(() => {
if (category === "Toutes") return services;

return services.filter(
(service) => service.category === category
);
}, [services, category]);

useEffect(() => {
async function loadTimes() {
setAvailableTimes([]);
setTime("");

if (!selected || !date || !supabase) return;

if (!selected.appointment_required) return;

const selectedDate = new Date(`${date}T12:00:00`);
const dayOfWeek = selectedDate.getDay();

const { data: hours } = await supabase
.from("business_hours")
.select("*")
.eq("day_of_week", dayOfWeek)
.maybeSingle();

if (!hours?.is_open) return;

const { data: bookings } = await supabase
.from("bookings")
.select("booking_time, booking_status")
.eq("booking_date", date)
.neq("booking_status", "cancelled");

const { data: blocked } = await supabase
.from("blocked_slots")
.select("blocked_time")
.eq("blocked_date", date);

const taken = new Set(
(bookings || []).map((booking) =>
String(booking.booking_time).slice(0, 5)
)
);

const blockedTimes = new Set(
(blocked || []).map((slot) =>
String(slot.blocked_time).slice(0, 5)
)
);

const result = [];

let [hour, minute] = String(
hours.opening_time
)
.slice(0, 5)
.split(":")
.map(Number);

const [closeHour, closeMinute] = String(
hours.closing_time
)
.slice(0, 5)
.split(":")
.map(Number);

const opening = hour * 60 + minute;
const closing = closeHour * 60 + closeMinute;

const duration = Number(
selected.duration_minutes || 60
);

while (hour * 60 + minute + duration <= closing) {
const current = hour * 60 + minute;

const value =
`${String(hour).padStart(2, "0")}:` +
`${String(minute).padStart(2, "0")}`;

if (
current >= opening &&
!taken.has(value) &&
!blockedTimes.has(value)
) {
result.push(value);
}

minute += 30;

if (minute >= 60) {
hour++;
minute -= 60;
}
}

setAvailableTimes(result);
}

loadTimes();
}, [selected, date]);

function chooseCategory(value) {
setCategory(value);
setSelected(null);
setMessage("");
}

function chooseService(service) {
setSelected(service);
setMessage("");

setTimeout(() => {
if (service.appointment_required) {
document
.getElementById("booking")
?.scrollIntoView({
behavior: "smooth",
block: "start",
});
}
}, 100);
}

async function reserve(event) {
event.preventDefault();

setMessage("");

if (!selected) {
setMessage("Veuillez choisir une prestation.");
return;
}

if (!name.trim() || !phone.trim()) {
setMessage(
"Veuillez renseigner votre nom et votre numéro de téléphone."
);
return;
}

if (!date || !time) {
setMessage(
"Veuillez choisir une date et un créneau."
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

if (countError) throw countError;

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

if (existingError) throw existingError;

if (existing?.length) {
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

if (error) throw error;

setMessage(
"Votre réservation est enregistrée. Paiement de l'acompte de 5 000 FCFA..."
);

if (
WAVE_URL &&
!WAVE_URL.includes("COLLER_")
) {
setTimeout(() => {
window.location.href = WAVE_URL;
}, 1000);
}
} catch (error) {
console.error(error);

setMessage(
error?.message ||
"Une erreur est survenue pendant la réservation."
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
L’élégance, la beauté, la confiance en vous.
</p>
</header>

<main>
<section className="hero">
<div className="hero-inner">
<span className="eyebrow">
BIENVENUE CHEZ
</span>

<h1>
Glow <span>&amp;</span> Shine
</h1>

<p>
Révélez votre beauté avec nos soins
professionnels et notre expertise.
</p>

<a
href="#prestations"
className="hero-button"
>
Découvrir nos prestations
</a>
</div>
</section>

<section className="category-section">
<div className="container">
<span className="eyebrow">
NOS UNIVERS
</span>

<h2>Découvrez nos catégories</h2>

<div className="category-list">
{categories.map((item) => (
<button
key={item}
type="button"
className={`category-button ${
category === item
? "active"
: ""
}`}
onClick={() =>
chooseCategory(item)
}
>
{item !== "Toutes" && (
<img
src={
categoryImages[item] ||
defaultImage
}
alt=""
/>
)}

<span>{item}</span>
</button>
))}
</div>
</div>
</section>

<section
id="prestations"
className="services-section"
>
<div className="container">
<div className="section-top">
<div>
<span className="eyebrow">
NOS PRESTATIONS
</span>

<h2>
{category === "Toutes"
? "Nos prestations"
: category}
</h2>
</div>
</div>

{loading ? (
<div className="state-box">
Chargement des prestations…
</div>
) : (
<div className="services-grid">
{displayedServices.map(
(service) => (
<article
key={service.id}
className={`service-card ${
selected?.id ===
service.id
? "selected"
: ""
}`}
>
<div className="service-image">
<img
src={
service.image_url ||
categoryImages[
service.category
] ||
defaultImage
}
alt={service.name}
loading="lazy"
onError={(event) => {
event.currentTarget.src =
defaultImage;
}}
/>

<span className="service-badge">
{service.appointment_required
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

<span>
{service.duration_minutes
? `${service.duration_minutes} min`
: ""}
</span>
</div>

{service.appointment_required ? (
<button
type="button"
className="service-action"
onClick={() =>
chooseService(
service
)
}
>
Réserver
</button>
) : (
<div className="no-appointment">
Disponible sans
rendez-vous
</div>
)}
</div>
</article>
)
)}
</div>
)}
</div>
</section>

<section
id="booking"
className="booking-section"
>
<div className="booking-card">
<span className="eyebrow">
RÉSERVATION
</span>

<h2>
{selected
? selected.name
: "Réservez votre rendez-vous"}
</h2>

{!selected ? (
<p className="booking-intro">
Sélectionnez une prestation
ci-dessus pour continuer.
</p>
) : (
<form onSubmit={reserve}>
<div className="booking-price">
<span>Acompte obligatoire</span>
<strong>5 000 FCFA</strong>
</div>

<div className="form-grid">
<label>
Nom complet *
<input
value={name}
onChange={(e) =>
setName(e.target.value)
}
placeholder="Votre nom"
required
/>
</label>

<label>
Téléphone *
<input
value={phone}
onChange={(e) =>
setPhone(e.target.value)
}
placeholder="77 XXX XX XX"
required
/>
</label>

<label>
Date *
<input
type="date"
min={getToday()}
value={date}
onChange={(e) =>
setDate(e.target.value)
}
required
/>
</label>

<label>
Heure *
<select
value={time}
onChange={(e) =>
setTime(e.target.value)
}
required
>
<option value="">
Choisir une heure
</option>

{availableTimes.map(
(slot) => (
<option
key={slot}
value={slot}
>
{slot}
</option>
)
)}
</select>
</label>

<label className="full">
Message
<textarea
value={comment}
onChange={(e) =>
setComment(e.target.value)
}
placeholder="Une précision concernant votre rendez-vous ?"
/>
</label>
</div>

<div className="booking-notice">
Votre rendez-vous sera confirmé
après paiement de l’acompte de{" "}
<strong>5 000 FCFA</strong>.
</div>

<button
className="submit-button"
type="submit"
disabled={bookingLoading}
>
{bookingLoading
? "Traitement..."
: "Continuer vers le paiement"}
</button>

{message && (
<div className="booking-message">
{message}
</div>
)}
</form>
)}
</div>
</section>
</main>

<footer className="site-footer">
<Logo />

<p>
© {new Date().getFullYear()} Glow &
Shine — Tous droits réservés.
</p>
</footer>
</div>
);
}

createRoot(document.getElementById("root")).render(
<React.StrictMode>
<App />
</React.StrictMode>
);
