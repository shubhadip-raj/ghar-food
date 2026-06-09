# 🏠 Ghar.food – MVP Setup Guide

> Home-cooked meals from local chefs, discovered on a map.

---

## What You Get

| View | URL | Description |
|------|-----|-------------|
| Visitor / Map | `/` | See all live chefs on a map, browse menus, place orders |
| Chef Register | `/register` | 3-step sign-up with photo uploads |
| Chef Login | `/chef/login` | Chef authentication |
| Chef Dashboard | `/chef/dashboard` | Post menus, view orders, manage profile |
| Admin Panel | `/admin` | Approve chefs, see all orders, change settings |

---

## 🚀 Deploy in 5 Steps (no coding!)

### Step 1 — Create a Supabase project (free)

1. Go to **https://supabase.com** → Sign up → **New Project**
2. Choose a region closest to India (e.g. Singapore)
3. Note your **Project URL** and **API Keys** (Settings → API)

### Step 2 — Set up the database

1. In Supabase → **SQL Editor** → **New Query**
2. Copy the entire contents of **`supabase/schema.sql`** and paste it
3. Click **Run** — you'll see tables created

### Step 3 — Create Storage Buckets

In Supabase → **Storage** → create these **4 public buckets**:

| Bucket name | Purpose |
|-------------|---------|
| `chef-photos` | Chef profile photos |
| `kitchen-photos` | Kitchen photos |
| `payment-qr` | UPI QR codes |
| `menu-photos` | Daily dish photos |

For **each** bucket:
- Click the bucket → **Policies** → **New Policy**
- Choose "Give anon users access to read files" → Save

### Step 4 — Deploy to Vercel

1. Push this entire folder to a **GitHub repository**
   - Go to https://github.com → New repository → upload files
2. Go to **https://vercel.com** → New Project → Import your GitHub repo
3. During setup, add these **Environment Variables**:

```
NEXT_PUBLIC_SUPABASE_URL        = https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY   = eyJ...   (anon/public key)
SUPABASE_SERVICE_ROLE_KEY       = eyJ...   (service_role key – keep secret!)
RESEND_API_KEY                  = re_xxx   (get free at resend.com)
EMAIL_FROM                      = noreply@ghar.food
ADMIN_EMAIL                     = adam@ghar.food
ADMIN_PASSWORD                  = Billion$dream!
JWT_SECRET                      = (any random 32+ character string)
NEXT_PUBLIC_APP_URL             = https://your-app.vercel.app
```

4. Click **Deploy** — Vercel will auto-build and publish!

### Step 5 — Set up Email (Resend — free)

1. Go to **https://resend.com** → Sign up (free = 3,000 emails/month)
2. **Domains** → Add your domain (or use their free `@resend.dev` domain for testing)
3. **API Keys** → Create key → copy it into Vercel env var `RESEND_API_KEY`

---

## 🔑 Admin Login

- URL: `https://your-app.vercel.app/admin`
- Email: `adam@ghar.food`
- Password: `Billion$dream!`

**Change your password** after first login: Admin Panel → Settings → New Admin Password

---

## 📋 How it works day-to-day

### For Chefs
1. Register at `/register` (3-step form)
2. Wait for admin approval email
3. Log in at `/chef/login`
4. Post **lunch** menu between **8:00–10:00 AM IST**
5. Post **dinner** menu between **12:00–3:00 PM IST**
6. Watch orders come in on the dashboard

### For Visitors
1. Open the site — see the map with 🏠 pins
2. Click a pin → see chef profile + today's menu
3. Click "Order Now" → enter name, email, phone
4. Pay via UPI to the chef directly (QR code shown)
5. Get email confirmation

### For Admin
1. Go to `/admin` → log in
2. Review pending chef registrations (with photos)
3. Approve ✅ or Reject ✗ — chef gets an email automatically
4. See all orders across all chefs
5. Manage settings (email, max orders, password)

---

## 📁 Project Structure

```
ghar-food/
├── app/
│   ├── page.jsx                 # Home/Map (visitor view)
│   ├── register/page.jsx        # Chef registration
│   ├── chef/
│   │   ├── login/page.jsx       # Chef login
│   │   └── dashboard/page.jsx   # Chef dashboard
│   ├── admin/page.jsx           # Admin panel
│   └── api/                     # Backend API routes
│       ├── auth/                # Login/logout
│       ├── chefs/               # Chef CRUD
│       ├── menus/               # Menu CRUD
│       ├── orders/              # Order creation
│       ├── upload/              # File uploads
│       └── admin/               # Admin endpoints
├── components/
│   ├── MapView.jsx              # Map wrapper
│   ├── LeafletMap.jsx           # Interactive Leaflet map
│   └── OrderModal.jsx           # Order popup
├── lib/
│   ├── supabase.js              # DB client
│   ├── auth.js                  # JWT session
│   └── email.js                 # Resend email
├── supabase/
│   └── schema.sql               # Database setup script
├── .env.example                 # Environment variable template
└── README.md                    # This file
```

---

## ❓ FAQ

**Q: Can I use a custom domain?**  
A: Yes! In Vercel → Domains → add your domain. Free on Vercel's hobby plan.

**Q: What if a chef posts outside the time window?**  
A: The API blocks it with a clear error. The button is disabled on the UI too.

**Q: How do I increase the max orders per meal beyond 10?**  
A: Admin Panel → Settings → Max Orders per Meal.

**Q: Can I test emails locally?**  
A: Yes — create a `.env.local` file (copy from `.env.example`) and add your Resend test key.

**Q: The map shows all chefs in Mumbai — how do I change the default?**  
A: Addresses are geocoded automatically when a chef registers. The map auto-centres on where your chefs are.

---

Built with ❤️ using Next.js 14 · Supabase · Leaflet · Resend · Tailwind CSS · Vercel
