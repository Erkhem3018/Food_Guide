import { RECIPES } from "../src/data/recipes.ts";
import { MN } from "../src/i18n/mn.ts";

export type Lang = "en" | "mn";
export type PlanMeal = { day: string; slot: string; recipeId: number };

const RECIPES_BY_ID = new Map(RECIPES.map((r) => [r.id, r]));
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const SLOTS = ["Breakfast", "Lunch", "Dinner", "Snack"];

const tr = (text: string, lang: Lang) => (lang === "mn" ? MN[text] ?? text : text);
const trTime = (time: string, lang: Lang) =>
  lang === "en" ? time : time.replace(/(\d+)\s*hrs?\b/g, "$1 цаг").replace(/(\d+)\s*min\b/g, "$1 мин");

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Only plain names (letters, spaces, hyphens, apostrophes) are echoed into an email,
// so nobody can use their display name to mail links or ads to someone else.
export function safeDisplayName(name: string): string | null {
  const n = name.trim();
  return /^[\p{L}\p{M}' -]{1,40}$/u.test(n) ? n : null;
}

const COPY = {
  en: {
    welcomeSubject: "Welcome to Mise 👋",
    welcomeTitle: (n: string) => `Welcome to Mise, ${n}!`,
    welcomeBody: "Your account is ready. Tell us what's in your kitchen and we'll build a weekly meal plan and grocery list around it.",
    welcomeFooter: "You're receiving this because you just created a Mise account.",
    planSubject: "Your weekly meal plan is ready 🗓️",
    planTitle: (n: string) => `Hi ${n}, here's your week!`,
    planMeta: (store: string, budget: string) => `Shopping at <strong>${store}</strong> · Weekly budget <strong>₮${budget}</strong>`,
    cols: ["Day", "Meal", "Recipe", "Time"],
    planFooter: "Open Mise to see the full recipes and your itemized grocery list.",
    there: "there",
  },
  mn: {
    welcomeSubject: "Mise-д тавтай морил 👋",
    welcomeTitle: (n: string) => `${n}, Mise-д тавтай морил!`,
    welcomeBody: "Таны бүртгэл бэлэн боллоо. Гал тогоондоо юу байгааг бидэнд хэлээрэй — түүнд тулгуурлан долоо хоногийн хоолны төлөвлөгөө, худалдан авалтын жагсаалт гаргаж өгнө.",
    welcomeFooter: "Та саяхан Mise-д бүртгүүлсэн тул энэ имэйлийг хүлээн авлаа.",
    planSubject: "Таны долоо хоногийн хоолны төлөвлөгөө бэлэн боллоо 🗓️",
    planTitle: (n: string) => `Сайн байна уу, ${n}! Таны долоо хоногийн хоол`,
    planMeta: (store: string, budget: string) => `Дэлгүүр: <strong>${store}</strong> · Долоо хоногийн төсөв <strong>₮${budget}</strong>`,
    cols: ["Өдөр", "Хоол", "Жор", "Хугацаа"],
    planFooter: "Бүтэн жор болон дэлгэрэнгүй худалдан авалтын жагсаалтыг Mise дээрээс харна уу.",
    there: "найз минь",
  },
} as const;

export function renderWelcomeEmail(name: string, lang: Lang) {
  const c = COPY[lang];
  const who = escapeHtml(safeDisplayName(name) ?? c.there);
  return {
    subject: c.welcomeSubject,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #1A1714;">
        <h1 style="color: #F25C2B;">${c.welcomeTitle(who)}</h1>
        <p>${c.welcomeBody}</p>
        <p style="color: #8C7B70; font-size: 13px;">${c.welcomeFooter}</p>
      </div>`,
  };
}

// Every row is built here from a recipe id, never from text the client sent.
export function renderWeeklyPlanEmail(name: string, store: string, budget: number, meals: PlanMeal[], lang: Lang) {
  const c = COPY[lang];
  const who = escapeHtml(safeDisplayName(name) ?? c.there);
  const rows = meals
    .map((m) => {
      const r = RECIPES_BY_ID.get(m.recipeId)!;
      const td = (content: string, style = "") => `<td style="padding: 8px 12px; border-bottom: 1px solid #E8E0D8;${style}">${escapeHtml(content)}</td>`;
      return `<tr>${td(tr(m.day, lang), " font-weight: bold;")}${td(tr(m.slot, lang), " text-transform: uppercase; font-size: 11px; color: #8C7B70;")}${td(tr(r.name, lang))}${td(trTime(r.time, lang), " color: #8C7B70;")}</tr>`;
    })
    .join("");
  const th = (label: string) => `<th style="padding: 8px 12px; border-bottom: 2px solid #1A1714;">${label}</th>`;
  return {
    subject: c.planSubject,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; color: #1A1714;">
        <h1 style="color: #F25C2B;">${c.planTitle(who)}</h1>
        <p>${c.planMeta(escapeHtml(store), budget.toLocaleString("en-US"))}</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <thead><tr style="text-align: left;">${c.cols.map(th).join("")}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="color: #8C7B70; font-size: 13px; margin-top: 16px;">${c.planFooter}</p>
      </div>`,
  };
}

export function isValidPlan(meals: unknown): meals is PlanMeal[] {
  return (
    Array.isArray(meals) &&
    meals.length > 0 &&
    meals.length <= 28 &&
    meals.every(
      (m) => m && DAYS.includes(m.day) && SLOTS.includes(m.slot) && Number.isInteger(m.recipeId) && RECIPES_BY_ID.has(m.recipeId)
    )
  );
}

// Resend's shared onboarding@resend.dev sender only delivers to the Resend account
// owner's own address. To email real users, verify a domain in Resend and set
// EMAIL_FROM, e.g. "Mise <hello@yourdomain.com>".
export async function sendEmail(to: string, content: { subject: string; html: string }): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM || "Mise <onboarding@resend.dev>", to: [to], subject: content.subject, html: content.html }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) console.error("Resend rejected email", res.status, await res.text());
  return res.ok;
}
