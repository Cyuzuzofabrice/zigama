# Zigama — Save Together. Grow Together.

Zigama is a web application designed to help savings groups (ikimina) manage their contributions, members, and financial records in one place.

The goal is to make group savings simpler, more organized, and easier to track.

## Features

- **User authentication** — Sign up, sign in, and reset passwords securely.
- **Savings group setup** — Create a group and define contribution amounts and frequency.
- **Member management** — Keep track of group members and their information.
- **Contribution tracking** — Record and monitor member contributions.
- **Loan management** — Manage group loans and repayments.
- **Financial reports** — Review group financial activity and records.
- **Transaction history** — Keep a history of recorded activities.
- **Group sharing** — Share group information through a public link.
- **Responsive interface** — Access the application on desktop and mobile devices.

## Technology Stack

- **Frontend:** React, TypeScript, Vite
- **Authentication and backend services:** Supabase
- **Styling:** CSS
- **Version control:** Git and GitHub
- **Deployment:** Vercel

## Getting Started

### Prerequisites

Make sure you have installed:

- [Node.js](https://nodejs.org/)
- npm
- A [Supabase](https://supabase.com/) project

### 1. Clone the repository

```bash
git clone https://github.com/Cyuzuzofabrice/zigama.git
cd zigama
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root, using `.env.example` as a reference if it exists.

Add your Supabase project URL and public/publishable key using the exact variable names expected by `src/lib/supabase.ts`.

Never commit secret service-role keys or other private credentials to GitHub.

### 4. Start the development server

```bash
npm run dev
```

Open the local URL printed in your terminal, usually `http://localhost:5173/`.

### 5. Build for production

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## Project Structure

```text
zigama/
├── src/
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── data.ts
│   │   ├── money.ts
│   │   └── types.ts
│   ├── App.tsx
│   ├── Dashboard.tsx
│   ├── SharedView.tsx
│   └── auth.css
├── public/
├── .env.example
├── package.json
└── README.md
```

*Note: The structure above highlights the main files and may not include every file in the repository.*

## Deployment

Zigama can be deployed using Vercel:

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Configure the required environment variables.
4. Deploy the application.
5. Configure the Supabase authentication URLs to include your deployed domain.

## Security

- Authentication is handled through Supabase.
- Keep private credentials out of source control.
- Configure appropriate Supabase Row Level Security (RLS) policies to protect group and financial data.
- Ensure shared links expose only the information intended to be public.

## Project Status

Zigama is under active development. Features and functionality may change as the application evolves.

## Author

**Cyuzuzo Fabrice**

GitHub: [@Cyuzuzofabrice](https://github.com/Cyuzuzofabrice)

---

*Zigama — Save together. Grow together.*