# Authentication Setup

## Overview

Authentication menggunakan Supabase dengan Next.js App Router dan API Routes.

## Setup

### 1. Environment Variables

Pastikan `.env.local` sudah dikonfigurasi dengan credentials Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 2. Supabase Configuration

Pastikan di Supabase Dashboard:

- Authentication sudah enabled
- Email provider sudah dikonfigurasi
- Email confirmation optional (bisa diset sesuai kebutuhan)

## Architecture

### API Routes (`/app/api/auth/`)

- **POST `/api/auth/login`** - Login user
- **POST `/api/auth/register`** - Register user baru
- **POST `/api/auth/logout`** - Logout user

### Supabase Clients

- **`/lib/supabase/client.ts`** - Browser client untuk client components
- **`/lib/supabase/server.ts`** - Server client untuk server components dan API routes

### Pages

- **`/login`** - Halaman login
- **`/register`** - Halaman register

## Usage

### Login

```typescript
const response = await fetch("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
```

### Register

```typescript
const response = await fetch("/api/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name, email, password }),
});
```

### Logout

```typescript
const response = await fetch("/api/auth/logout", {
  method: "POST",
});
```

## Form Validation

Menggunakan:

- **react-hook-form** - Form state management
- **zod** - Schema validation
- **@hookform/resolvers** - Integration layer

## Security Features

- Password minimal 6 karakter
- Email validation
- Client-side & server-side validation
- Secure HTTP-only cookies (handled by Supabase)
- CSRF protection (Next.js built-in)

## Next Steps

- [ ] Implement password reset
- [ ] Add email verification
- [ ] Implement OAuth providers (Google, GitHub, etc.)
- [ ] Add protected routes middleware
- [ ] Implement user profile page
